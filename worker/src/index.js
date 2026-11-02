const MODEL = '@cf/meta/llama-3.2-3b-instruct';
const DEFAULT_BATCH_SIZE = 20;
const MAX_GENERATION_ATTEMPTS = 3;
const MAX_REQUEST_BYTES = 2048;
const PRESET_CATEGORIES = new Set([
    'health',
    'career',
    'software development',
    'wisdom',
    'motivation'
]);

function json(data, status = 200, extraHeaders = {}) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'no-store',
            ...extraHeaders
        }
    });
}

function corsHeaders(request, env) {
    const origin = request.headers.get('Origin');
    const allowed = env.ALLOWED_EXTENSION_ORIGIN;
    const allowOrigin = origin && origin === allowed ? origin : allowed;

    return {
        'Access-Control-Allow-Origin': allowOrigin,
        'Access-Control-Allow-Headers': 'Content-Type, X-V2-Install-ID',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Max-Age': '86400',
        'Vary': 'Origin'
    };
}

function originAllowed(request, env) {
    const origin = request.headers.get('Origin');
    return !origin || origin === env.ALLOWED_EXTENSION_ORIGIN;
}

export function normalizeCategory(value) {
    return String(value || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9 -]/g, '')
        .replace(/\s+/g, ' ')
        .slice(0, 40) || 'personal growth';
}

function extractAIText(result) {
    if (typeof result === 'string') return result;

    const candidates = [
        result?.response,
        result?.result?.response,
        result?.output_text,
        result?.generated_text,
        result?.text,
        result?.choices?.[0]?.message?.content
    ];
    const text = candidates.find((value) => typeof value === 'string');
    if (text) return text;

    if (Array.isArray(result?.content)) {
        const contentText = result.content
            .map((item) => typeof item === 'string' ? item : item?.text)
            .filter((item) => typeof item === 'string')
            .join('\n');
        if (contentText) return contentText;
    }

    const keys = result && typeof result === 'object'
        ? Object.keys(result).slice(0, 10).join(', ') || 'none'
        : 'not an object';
    throw new Error(`AI returned no text response (top-level keys: ${keys})`);
}

export function parsePromptBatch(result, expectedSize = DEFAULT_BATCH_SIZE) {
    const raw = extractAIText(result);

    const firstBracket = raw.indexOf('[');
    const lastBracket = raw.lastIndexOf(']');
    if (firstBracket === -1 || lastBracket <= firstBracket) {
        throw new Error('AI response did not contain a JSON array');
    }

    const parsed = JSON.parse(raw.slice(firstBracket, lastBracket + 1));
    if (!Array.isArray(parsed)) throw new Error('AI response was not an array');

    const prompts = [...new Set(parsed
        .filter((item) => typeof item === 'string')
        .map((item) => item.replace(/^\s*["“”]|["“”]\s*$/g, '').trim())
        .filter((item) => {
            const wordCount = item.match(/[\p{L}\p{N}'’-]+/gu)?.length || 0;
            const sentenceEndings = item.match(/[.!?]/g)?.length || 0;
            const unsafe = /https?:\/\/|www\.|<[^>]+>|\b(cure|diagnose|medication|prescription|guaranteed|always|never|worthless|lazy|failure)\b/i.test(item);
            return item.length >= 10
                && item.length <= 180
                && wordCount >= 8
                && wordCount <= 22
                && sentenceEndings <= 1
                && !unsafe;
        }))]
        .slice(0, expectedSize);

    if (prompts.length < expectedSize) {
        throw new Error(`AI returned ${prompts.length} usable prompts; ${expectedSize} required`);
    }
    return prompts;
}

async function generateBatch(env, category, batchSize) {
    const candidateCount = Math.min(40, batchSize + 10);
    const prompt = [
        `Generate exactly ${candidateCount} original, concise self-improvement prompts about ${category}.`,
        'Each prompt must be one sentence of 8 to 22 words.',
        'Do not use quotation marks, author names, attribution, or existing famous quotations.',
        'Keep the tone encouraging, specific, and suitable for a notification.',
        'Return only a valid JSON array of strings with no markdown or commentary.'
    ].join(' ');

    const result = await env.AI.run(MODEL, {
        messages: [
            { role: 'system', content: 'You write original, practical self-improvement prompts.' },
            { role: 'user', content: prompt }
        ],
        max_tokens: 900,
        temperature: 0.9,
        stream: false
    });

    return {
        prompts: parsePromptBatch(result, batchSize),
        usage: result?.usage || result?.result?.usage || null
    };
}

async function generateAndStoreBatch(env, category) {
    const cacheKey = `prompt-batch:v1:${category}`;
    const batchSize = Math.max(5, Math.min(30, Number(env.BATCH_SIZE) || DEFAULT_BATCH_SIZE));
    let generated;
    let lastError;

    for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS; attempt += 1) {
        try {
            generated = await generateBatch(env, category, batchSize);
            break;
        } catch (error) {
            lastError = error;
            console.warn(JSON.stringify({
                event: 'ai_batch_attempt_failed',
                category,
                attempt,
                message: error instanceof Error ? error.message : String(error)
            }));
        }
    }

    if (!generated) throw lastError || new Error('AI batch generation failed');

    const { prompts, usage } = generated;
    const batchId = crypto.randomUUID();

    await env.QUOTE_CACHE.put(
        cacheKey,
        JSON.stringify({ batchId, prompts, createdAt: new Date().toISOString() })
    );

    console.log(JSON.stringify({ event: 'ai_batch_generated', category, batchId, count: prompts.length, usage }));
    return { category, batchId, count: prompts.length, usage };
}

async function withinRateLimits(request, env) {
    const installId = request.headers.get('X-V2-Install-ID') || 'missing-install-id';
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown-ip';
    const [installResult, ipResult] = await Promise.all([
        env.INSTALL_RATE_LIMITER.limit({ key: installId }),
        env.IP_RATE_LIMITER.limit({ key: ip })
    ]);
    return installResult.success && ipResult.success;
}

async function handleQuote(request, env) {
    const length = Number(request.headers.get('Content-Length'));
    if (Number.isFinite(length) && length > MAX_REQUEST_BYTES) {
        return json({ error: 'Request body is too large' }, 413, corsHeaders(request, env));
    }

    if (!(await withinRateLimits(request, env))) {
        return json({ error: 'Rate limit exceeded' }, 429, {
            ...corsHeaders(request, env),
            'Retry-After': '60'
        });
    }

    let body;
    try {
        body = await request.json();
    } catch {
        return json({ error: 'Request body must be valid JSON' }, 400, corsHeaders(request, env));
    }

    const category = normalizeCategory(body?.category);
    if (!PRESET_CATEGORIES.has(category)) {
        return json({ error: 'Unsupported category' }, 400, corsHeaders(request, env));
    }

    const cached = await env.QUOTE_CACHE.get(`prompt-batch:v1:${category}`, 'json');
    if (!Array.isArray(cached?.prompts) || !cached.prompts.length) {
        return json({ error: 'No cached prompts are available for this category' }, 503, corsHeaders(request, env));
    }

    const batchId = cached.batchId || cached.createdAt || 'legacy';
    const prompts = cached.prompts.map((quote, index) => ({
        id: `${batchId}:${index}`,
        quote
    }));
    const seenIds = new Set(Array.isArray(body?.seenIds) ? body.seenIds.slice(-20) : []);
    let available = prompts.filter(({ id }) => !seenIds.has(id));
    const cycleReset = available.length === 0;
    if (cycleReset) available = prompts;
    const selected = available[Math.floor(Math.random() * available.length)];

    console.log(JSON.stringify({ event: 'cache_hit', category, cycleReset }));
    return json({
        id: selected.id,
        quote: selected.quote,
        category,
        batchId,
        cycleReset,
        source: 'ai-cache'
    }, 200, {
        ...corsHeaders(request, env),
        'X-V2-Cache': 'hit'
    });
}

async function handleGenerate(request, env) {
    const authorization = request.headers.get('Authorization');
    if (!env.ADMIN_TOKEN || authorization !== `Bearer ${env.ADMIN_TOKEN}`) {
        return json({ error: 'Unauthorized' }, 401);
    }

    let body = {};
    try {
        body = await request.json();
    } catch {
        // An empty body refreshes every preset category.
    }

    const requested = body?.category ? [normalizeCategory(body.category)] : [...PRESET_CATEGORIES];
    if (requested.some((category) => !PRESET_CATEGORIES.has(category))) {
        return json({ error: 'Unsupported category' }, 400);
    }

    const generated = [];
    const failures = [];
    for (const category of requested) {
        try {
            generated.push(await generateAndStoreBatch(env, category));
        } catch (error) {
            failures.push({
                category,
                error: error instanceof Error ? error.message : String(error)
            });
        }
    }

    if (failures.length) {
        return json({
            error: 'Some prompt batches could not be generated',
            generated,
            failures
        }, generated.length ? 207 : 503);
    }

    return json({ generated, failures });
}

export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        if (request.method === 'OPTIONS') {
            return new Response(null, { status: 204, headers: corsHeaders(request, env) });
        }

        if (!originAllowed(request, env)) {
            return json({ error: 'Origin not allowed' }, 403, corsHeaders(request, env));
        }

        if (request.method === 'GET' && url.pathname === '/health') {
            return json({ ok: true }, 200, corsHeaders(request, env));
        }

        if (request.method === 'POST' && url.pathname === '/admin/generate') {
            try {
                return await handleGenerate(request, env);
            } catch (error) {
                console.error('Batch generation failed', error);
                return json({ error: 'Unable to generate prompt batches' }, 503);
            }
        }

        if (request.method === 'POST' && url.pathname === '/quote') {
            try {
                return await handleQuote(request, env);
            } catch (error) {
                console.error('Quote request failed', error);
                return json({ error: 'Unable to create a prompt right now' }, 503, corsHeaders(request, env));
            }
        }

        return json({ error: 'Not found' }, 404, corsHeaders(request, env));
    }
};
