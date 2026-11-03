import assert from 'node:assert/strict';
import test from 'node:test';
import worker, { normalizeCategory } from '../src/index.js';
import { parseEvaluation, parsePromptBatch, validatePrompt } from '../src/quality.js';

const samplePrompts = [
    'Take one concrete step toward the task you have been avoiding today.',
    'Protect ten focused minutes for the work that matters most right now.',
    'Write down the smallest action that would make tomorrow easier.',
    'Pause and choose the response that supports your longer-term goal.',
    'Finish one meaningful task before adding another commitment.'
];

function passingEvaluation(count) {
    return {
        response: {
            evaluations: Array.from({ length: count }, (_, index) => ({
                index,
                pass: true,
                scores: {
                    relevance: 5,
                    actionability: 4,
                    clarity: 5,
                    tone: 5,
                    safety: 5,
                    originality: 4
                },
                reasons: []
            }))
        },
        usage: { neurons: 2 }
    };
}

function passingFlatEvaluation(count) {
    return {
        response: Array.from({ length: count }, (_, index) => ({
            index,
            pass: true,
            relevance: 5,
            actionability: 4,
            clarity: 5,
            tone: 5,
            safety: 5,
            originality: 4,
            reasons: []
        }))
    };
}

function mockOpenAI(t, makeEvaluation = () => passingEvaluation(5)) {
    return t.mock.method(globalThis, 'fetch', async (_url, options) => {
        const body = JSON.parse(options.body);
        assert.equal(body.model, 'gpt-5.4');
        assert.equal(body.store, false);
        const value = makeEvaluation();
        return new Response(JSON.stringify({
            status: 'completed',
            output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(value.response) }] }],
            usage: { input_tokens: 100, output_tokens: 50 }
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    });
}

test('normalizes categories used as cache keys', () => {
    assert.equal(normalizeCategory('  Software   Development!  '), 'code');
    assert.equal(normalizeCategory('Code'), 'code');
    assert.equal(normalizeCategory(''), 'personal growth');
    assert.equal(normalizeCategory('x'.repeat(60)).length, 40);
});

test('extracts and de-duplicates a JSON prompt batch', () => {
    const result = {
        response: `Here is the batch:\n${JSON.stringify([...samplePrompts, samplePrompts[4]])}`
    };

    const prompts = parsePromptBatch(result, 5);
    assert.equal(prompts.length, 5);
});

test('rejects malformed AI output', () => {
    assert.throws(() => parsePromptBatch({ response: 'not json' }, 5), /prompt array/);
});

test('accepts a nested Workers AI response', () => {
    const prompts = parsePromptBatch({
        result: { response: JSON.stringify(samplePrompts) }
    }, 5);
    assert.deepEqual(prompts, samplePrompts);
});

test('deterministic policy rejects unsafe claims and attributed quotations', () => {
    assert.equal(validatePrompt('This routine will always cure your anxiety and guarantee perfect health.').valid, false);
    assert.equal(validatePrompt('Success is final, courage is everything. — Famous Person').valid, false);
    assert.equal(validatePrompt(samplePrompts[0]).valid, true);
});

test('accepts the evaluator flat-array response shape', () => {
    assert.equal(parseEvaluation(passingFlatEvaluation(samplePrompts.length), samplePrompts).pass, true);
});

test('accepts completion and chat choices containing evaluator JSON', () => {
    const evaluations = passingFlatEvaluation(samplePrompts.length).response;
    const content = JSON.stringify({ evaluations });
    for (const choice of [
        { text: content },
        { message: { content } },
        { message: { content: [{ type: 'text', text: content }] } },
        { message: { parsed: { evaluations } } }
    ]) {
        assert.equal(parseEvaluation({ id: 'test', object: 'completion', choices: [choice] }, samplePrompts).pass, true);
    }
});

test('allows both configured extension origins and rejects other origins', async () => {
    const env = {
        ALLOWED_EXTENSION_ORIGIN: 'chrome-extension://store-id',
        DEV_EXTENSION_ORIGIN: 'chrome-extension://dev-id',
        INSTALL_RATE_LIMITER: { async limit() { return { success: true }; } },
        IP_RATE_LIMITER: { async limit() { return { success: true }; } },
        QUOTE_CACHE: { async get() { return { prompts: samplePrompts }; } }
    };
    for (const origin of ['chrome-extension://store-id', 'chrome-extension://dev-id']) {
        const response = await worker.fetch(new Request('https://example.test/quote', {
            method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' },
            body: JSON.stringify({ category: 'health' })
        }), env);
        assert.equal(response.status, 200);
        assert.equal(response.headers.get('Access-Control-Allow-Origin'), origin);
    }
    const rejected = await worker.fetch(new Request('https://example.test/quote', {
        method: 'POST', headers: { Origin: 'chrome-extension://other-id' }
    }), env);
    assert.equal(rejected.status, 403);
});

test('protects generation and serves every cached prompt before repeating', async (t) => {
    const evaluator = mockOpenAI(t);
    const values = new Map();
    const stagingValues = new Map();
    let aiCalls = 0;
    const env = {
        ALLOWED_EXTENSION_ORIGIN: 'chrome-extension://test-id',
        ADMIN_TOKEN: 'test-secret',
        OPENAI_API_KEY: 'test-api-key',
        BATCH_SIZE: '5',
        AI: {
            async run(_model, options) {
                aiCalls += 1;
                if (options.messages[0].content.includes('independent quality evaluator')) {
                    return passingEvaluation(samplePrompts.length);
                }
                return { response: JSON.stringify(samplePrompts) };
            }
        },
        QUOTE_CACHE: {
            async get(key) {
                return values.has(key) ? JSON.parse(values.get(key)) : null;
            },
            async put(key, value) {
                values.set(key, value);
            }
        },
        QUOTE_STAGING: {
            async get(key, type) {
                if (!stagingValues.has(key)) return null;
                return type === 'json' ? JSON.parse(stagingValues.get(key)) : stagingValues.get(key);
            },
            async put(key, value) {
                stagingValues.set(key, value);
            }
        },
        INSTALL_RATE_LIMITER: { async limit() { return { success: true }; } },
        IP_RATE_LIMITER: { async limit() { return { success: true }; } }
    };
    const makeRequest = (seenIds = []) => new Request('https://example.test/quote', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Origin': 'chrome-extension://test-id',
            'X-V2-Install-ID': 'test-install'
        },
        body: JSON.stringify({ category: 'health', seenIds })
    });

    const unauthorized = await worker.fetch(new Request('https://example.test/admin/generate', {
        method: 'POST',
        body: JSON.stringify({ category: 'health' })
    }), env);
    assert.equal(unauthorized.status, 401);

    const generated = await worker.fetch(new Request('https://example.test/admin/generate', {
        method: 'POST',
        headers: {
            'Authorization': 'Bearer test-secret',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ category: 'health' })
    }), env);
    assert.equal(generated.status, 200);
    assert.equal(aiCalls, 1);
    assert.equal(evaluator.mock.calls.length, 1);
    const generatedBody = await generated.json();
    assert.equal(generatedBody.generated[0].qualityPolicyVersion, '2026-11-02-v1');

    const staged = await worker.fetch(new Request('https://example.test/admin/staging?category=health', {
        headers: { 'Authorization': 'Bearer test-secret' }
    }), env);
    assert.equal(staged.status, 200);
    assert.equal((await staged.json()).record.status, 'promoted');

    const seenIds = [];
    for (let index = 0; index < samplePrompts.length; index += 1) {
        const response = await worker.fetch(makeRequest(seenIds), env);
        const body = await response.json();
        assert.equal(response.status, 200);
        assert.equal(body.source, 'ai-cache');
        assert.equal(body.cycleReset, false);
        assert.ok(!seenIds.includes(body.id));
        seenIds.push(body.id);
    }

    const repeated = await worker.fetch(makeRequest(seenIds), env);
    assert.equal((await repeated.json()).cycleReset, true);
    assert.equal(aiCalls, 1);
});

test('retries invalid AI batches and returns useful admin failure details', async () => {
    let aiCalls = 0;
    const env = {
        ADMIN_TOKEN: 'test-secret',
        BATCH_SIZE: '5',
        AI: {
            async run() {
                aiCalls += 1;
                return { response: 'not json' };
            }
        },
        QUOTE_CACHE: {
            async put() {
                assert.fail('invalid batches must not be cached');
            }
        },
        QUOTE_STAGING: { async put() {} }
    };

    const response = await worker.fetch(new Request('https://example.test/admin/generate', {
        method: 'POST',
        headers: {
            'Authorization': 'Bearer test-secret',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ category: 'health' })
    }), env);
    const body = await response.json();

    assert.equal(response.status, 503);
    assert.equal(aiCalls, 3);
    assert.deepEqual(body.generated, []);
    assert.match(body.failures[0].error, /prompt array/);
});

test('keeps evaluator-rejected batches in staging and out of public cache', async (t) => {
    const cacheValues = new Map();
    const stagingValues = new Map();
    let aiCalls = 0;
    const rejectedEvaluation = passingEvaluation(samplePrompts.length);
    rejectedEvaluation.response.evaluations[2].pass = false;
    rejectedEvaluation.response.evaluations[2].scores.tone = 2;
    rejectedEvaluation.response.evaluations[2].reasons = ['Tone is too forceful.'];
    mockOpenAI(t, () => rejectedEvaluation);

    const env = {
        ADMIN_TOKEN: 'test-secret',
        OPENAI_API_KEY: 'test-api-key',
        BATCH_SIZE: '5',
        AI: {
            async run(_model, options) {
                aiCalls += 1;
                return options.messages[0].content.includes('independent quality evaluator')
                    ? rejectedEvaluation
                    : { response: JSON.stringify(samplePrompts) };
            }
        },
        QUOTE_CACHE: {
            async put(key, value) { cacheValues.set(key, value); }
        },
        QUOTE_STAGING: {
            async put(key, value) { stagingValues.set(key, value); }
        }
    };

    const response = await worker.fetch(new Request('https://example.test/admin/generate', {
        method: 'POST',
        headers: {
            'Authorization': 'Bearer test-secret',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ category: 'health' })
    }), env);
    const body = await response.json();

    assert.equal(response.status, 503);
    assert.equal(aiCalls, 3);
    assert.equal(cacheValues.size, 0);
    assert.match(body.failures[0].error, /Approved 4 of 5/);
    const stagedRecords = [...stagingValues.entries()]
        .filter(([key]) => key.startsWith('staging-batch:'))
        .map(([, value]) => JSON.parse(value));
    assert.ok(stagedRecords.some((record) => record.status === 'incomplete' && record.rejected.length === 1));
});

test('retains valid prompts across attempts and stages an incomplete batch', async (t) => {
    mockOpenAI(t, () => passingEvaluation(3));
    const staged = new Map();
    const cache = new Map();
    let calls = 0;
    const env = {
        ADMIN_TOKEN: 'test-secret', OPENAI_API_KEY: 'test-api-key', BATCH_SIZE: '5',
        AI: { async run() { calls += 1; return { response: JSON.stringify(samplePrompts.slice(0, 3)) }; } },
        QUOTE_STAGING: { async put(key, value) { staged.set(key, value); } },
        QUOTE_CACHE: { async put(key, value) { cache.set(key, value); } }
    };
    const request = new Request('https://example.test/admin/generate', {
        method: 'POST', headers: { Authorization: 'Bearer test-secret', 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: 'code' })
    });
    const response = await worker.fetch(request, env);
    const body = await response.json();
    assert.equal(response.status, 503);
    assert.equal(calls, 3);
    assert.match(body.failures[0].error, /Approved 3 of 5/);
    const key = staged.get('staging-latest:v1:code');
    assert.deepEqual(JSON.parse(staged.get(key)).prompts, samplePrompts.slice(0, 3));
    assert.equal(cache.size, 0);
});

test('combines distinct prompts from separate attempts before evaluation', async (t) => {
    let evaluationCalls = 0;
    mockOpenAI(t, () => passingEvaluation(++evaluationCalls === 1 ? 3 : 2));
    const staged = new Map();
    const cache = new Map();
    let generationCalls = 0;
    const env = {
        ADMIN_TOKEN: 'test-secret', OPENAI_API_KEY: 'test-api-key', BATCH_SIZE: '5',
        AI: { async run(_model, options) {
            if (options.messages[0].content.includes('independent quality evaluator')) return passingEvaluation(5);
            generationCalls += 1;
            return { response: JSON.stringify(generationCalls === 1 ? samplePrompts.slice(0, 3) : samplePrompts.slice(2)) };
        } },
        QUOTE_STAGING: { async put(key, value) { staged.set(key, value); } },
        QUOTE_CACHE: { async put(key, value) { cache.set(key, value); } }
    };
    const request = new Request('https://example.test/admin/generate', {
        method: 'POST', headers: { Authorization: 'Bearer test-secret', 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: 'code' })
    });
    const response = await worker.fetch(request, env);
    assert.equal(response.status, 200);
    assert.equal(generationCalls, 2);
    assert.deepEqual(JSON.parse(cache.get('prompt-batch:v1:code')).prompts, samplePrompts);
});

test('replaces rejected prompts while retaining previously approved prompts', async (t) => {
    let evaluations = 0;
    mockOpenAI(t, () => {
        evaluations += 1;
        const value = passingEvaluation(evaluations === 1 ? 5 : 1);
        if (evaluations === 1) value.response.evaluations[2].pass = false;
        return value;
    });
    const cache = new Map();
    const staged = new Map();
    let generations = 0;
    const replacement = 'Explore a new skill through a short focused practice session today.';
    const env = {
        ADMIN_TOKEN: 'test-secret', OPENAI_API_KEY: 'test-api-key', BATCH_SIZE: '5',
        AI: { async run() { generations += 1; return { response: JSON.stringify(generations === 1 ? samplePrompts : [samplePrompts[2], replacement]) }; } },
        QUOTE_STAGING: { async put(key, value) { staged.set(key, value); } },
        QUOTE_CACHE: { async put(key, value) { cache.set(key, value); } }
    };
    const response = await worker.fetch(new Request('https://example.test/admin/generate', {
        method: 'POST', headers: { Authorization: 'Bearer test-secret', 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: 'code' })
    }), env);
    assert.equal(response.status, 200);
    const prompts = JSON.parse(cache.get('prompt-batch:v1:code')).prompts;
    assert.equal(generations, 2);
    assert.equal(evaluations, 2);
    assert.ok(!prompts.includes(samplePrompts[2]));
    assert.ok(prompts.includes(replacement));
    assert.ok(samplePrompts.filter((_, index) => index !== 2).every((prompt) => prompts.includes(prompt)));
});

test('evaluates large batches in groups and promotes only after all groups pass', async (t) => {
    const evaluator = mockOpenAI(t);
    const morePrompts = [
        'Review yesterday’s work and identify one practical lesson for tomorrow.',
        'Choose a manageable project and break the first milestone into steps.',
        'Share a useful insight with a colleague who might appreciate it.',
        'Set aside a quiet moment to reflect on what you have learned.',
        'Plan a short break before returning to your most demanding task.'
    ];
    const staged = new Map();
    const cache = new Map();
    const env = {
        ADMIN_TOKEN: 'test-secret', OPENAI_API_KEY: 'test-api-key', BATCH_SIZE: '10',
        AI: { async run(_model, options) {
            if (options.messages[0].content.includes('independent quality evaluator')) {
                return passingEvaluation(5);
            }
            return { response: JSON.stringify([...samplePrompts, ...morePrompts]) };
        } },
        QUOTE_STAGING: { async put(key, value) { staged.set(key, value); } },
        QUOTE_CACHE: { async put(key, value) { cache.set(key, value); } }
    };
    const response = await worker.fetch(new Request('https://example.test/admin/generate', {
        method: 'POST', headers: { Authorization: 'Bearer test-secret', 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: 'code' })
    }), env);
    assert.equal(response.status, 200);
    assert.equal(evaluator.mock.calls.length, 2);
    const record = JSON.parse(staged.get(staged.get('staging-latest:v1:code')));
    assert.deepEqual(record.evaluation.evaluations.map((item) => item.index), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    assert.equal(JSON.parse(cache.get('prompt-batch:v1:code')).prompts.length, 10);
});

test('missing OpenAI credentials keeps a full batch in staging without promotion', async () => {
    const staged = new Map();
    let promoted = false;
    const env = {
        ADMIN_TOKEN: 'test-secret', BATCH_SIZE: '5',
        AI: { async run() { return { response: JSON.stringify(samplePrompts) }; } },
        QUOTE_STAGING: { async put(key, value) { staged.set(key, value); } },
        QUOTE_CACHE: { async put() { promoted = true; } }
    };
    const response = await worker.fetch(new Request('https://example.test/admin/generate', {
        method: 'POST', headers: { Authorization: 'Bearer test-secret', 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: 'code' })
    }), env);
    assert.equal(response.status, 503);
    assert.match((await response.json()).failures[0].error, /OPENAI_API_KEY/);
    assert.equal(promoted, false);
    assert.equal(JSON.parse(staged.get(staged.get('staging-latest:v1:code'))).status, 'evaluation_error');
});
