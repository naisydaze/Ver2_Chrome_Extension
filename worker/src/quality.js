export const QUALITY_POLICY_VERSION = '2026-11-02-v1';

export const QUALITY_CRITERIA = Object.freeze({
    relevance: 'Clearly relates to the selected category.',
    actionability: 'Invites one practical action or useful moment of reflection.',
    clarity: 'Works as a concise, standalone notification with one clear idea.',
    tone: 'Supportive, calm, non-judgmental, and free from shame or pressure.',
    safety: 'Contains no medical, crisis, hateful, sexual, violent, illegal, or guaranteed-outcome advice.',
    originality: 'Is not an attributed, famous, or recognizably copied quotation.',
    diversity: 'Does not substantially duplicate another prompt in the same batch.'
});

const SCORE_NAMES = ['relevance', 'actionability', 'clarity', 'tone', 'safety', 'originality'];
const UNSAFE_PATTERN = /\b(cure|cures|diagnose|diagnosis|medication|prescription|treatment|therapist|doctor|disease|disorder|suicide|self-harm|kill|violence|weapon|hate|worthless|lazy|guaranteed|always|never)\b/i;
const ATTRIBUTION_PATTERN = /\b(according to|once said|as .* said)\b|\s[—-]\s*[A-Z][\p{L}. '-]+$/iu;
const URL_OR_MARKUP_PATTERN = /https?:\/\/|www\.|<[^>]+>|\[[^\]]+\]\([^\)]+\)|```/i;

function normalizePrompt(value) {
    return String(value || '')
        .normalize('NFKC')
        .replace(/\s+/g, ' ')
        .trim();
}

function words(value) {
    return value.toLowerCase().match(/[\p{L}\p{N}'’-]+/gu) || [];
}

function comparableTokens(value) {
    const ignored = new Set(['a', 'an', 'and', 'for', 'in', 'of', 'on', 'the', 'to', 'your']);
    return new Set(words(value).filter((word) => !ignored.has(word)));
}

function similarity(left, right) {
    const a = comparableTokens(left);
    const b = comparableTokens(right);
    if (!a.size || !b.size) return 0;
    const intersection = [...a].filter((token) => b.has(token)).length;
    return intersection / (a.size + b.size - intersection);
}

export function validatePrompt(value) {
    const prompt = normalizePrompt(value);
    const reasons = [];
    const wordCount = words(prompt).length;
    const sentenceEndings = prompt.match(/[.!?]/g)?.length || 0;

    if (typeof value !== 'string') reasons.push('not_string');
    if (/[\r\n\u0000-\u001f\u007f]/.test(String(value || ''))) reasons.push('control_or_multiline_text');
    if (prompt.length < 10 || prompt.length > 180) reasons.push('invalid_character_length');
    if (wordCount < 8 || wordCount > 22) reasons.push('invalid_word_count');
    if (sentenceEndings > 1) reasons.push('multiple_sentences');
    if (URL_OR_MARKUP_PATTERN.test(prompt)) reasons.push('url_or_markup');
    if (UNSAFE_PATTERN.test(prompt)) reasons.push('unsafe_or_absolute_language');
    if (ATTRIBUTION_PATTERN.test(prompt) || /["“”]/.test(prompt)) reasons.push('quotation_or_attribution');

    return { prompt, valid: reasons.length === 0, reasons, wordCount };
}

function parseJSONValue(result) {
    const message = result?.choices?.[0]?.message;
    const candidates = [
        result?.response,
        result?.result?.response,
        result?.output_text,
        result?.generated_text,
        result?.text,
        message?.parsed,
        message?.content,
        result?.choices?.[0]?.text,
        result
    ];

    for (const candidate of candidates) {
        if (Array.isArray(candidate) && candidate.length && candidate.every((item) => item?.type === 'text' && typeof item.text === 'string')) {
            try {
                return JSON.parse(candidate.map((item) => item.text).join(''));
            } catch {
                continue;
            }
        }
        if (candidate && typeof candidate === 'object') return candidate;
        if (typeof candidate !== 'string') continue;
        const trimmed = candidate.trim().replace(/^```(?:json)?\s*|\s*```$/g, '');
        try {
            return JSON.parse(trimmed);
        } catch {
            const arrayStart = trimmed.indexOf('[');
            const arrayEnd = trimmed.lastIndexOf(']');
            if (arrayStart !== -1 && arrayEnd > arrayStart) {
                try {
                    return JSON.parse(trimmed.slice(arrayStart, arrayEnd + 1));
                } catch {
                    // Try the next response shape.
                }
            }
        }
    }

    const keys = result && typeof result === 'object'
        ? Object.keys(result).slice(0, 10).join(', ') || 'none'
        : 'not an object';
    throw new Error(`AI returned no valid JSON response (top-level keys: ${keys})`);
}

export function parsePromptBatch(result, expectedSize, existing = [], rejected = []) {
    const parsed = parseJSONValue(result);
    const candidates = Array.isArray(parsed) ? parsed : parsed?.prompts;
    if (!Array.isArray(candidates)) throw new Error('AI response did not contain a prompt array');

    const selected = [...existing];
    const normalizedSeen = new Set([...existing, ...rejected].map((prompt) => prompt.toLocaleLowerCase('en-US')));
    const openingCounts = new Map();
    for (const prompt of existing) {
        const opening = words(prompt).slice(0, 2).join(' ');
        openingCounts.set(opening, (openingCounts.get(opening) || 0) + 1);
    }

    for (const candidate of candidates) {
        const validation = validatePrompt(candidate);
        if (!validation.valid) continue;

        const normalized = validation.prompt.toLocaleLowerCase('en-US');
        if (normalizedSeen.has(normalized)) continue;
        if ([...selected, ...rejected].some((existing) => similarity(existing, validation.prompt) >= 0.72)) continue;

        const opening = words(validation.prompt).slice(0, 2).join(' ');
        const openingCount = openingCounts.get(opening) || 0;
        if (opening && openingCount >= 3) continue;

        normalizedSeen.add(normalized);
        openingCounts.set(opening, openingCount + 1);
        selected.push(validation.prompt);
        if (selected.length === expectedSize) break;
    }

    return selected;
}

export function parseEvaluation(result, prompts) {
    const parsed = parseJSONValue(result);
    const rawEvaluations = Array.isArray(parsed)
        ? parsed
        : parsed?.evaluations || parsed?.results || parsed?.items;
    if (!Array.isArray(rawEvaluations)) {
        const keys = parsed && typeof parsed === 'object' ? Object.keys(parsed).slice(0, 10).join(', ') : 'none';
        throw new Error(`Evaluator response did not contain evaluations (keys: ${keys})`);
    }

    const byIndex = new Map(rawEvaluations.map((item) => [Number(item?.index), item]));
    if (rawEvaluations.length !== prompts.length || byIndex.size !== prompts.length
        || rawEvaluations.some((item) => !Number.isInteger(item?.index) || item.index < 0 || item.index >= prompts.length)) {
        throw new Error('Evaluator returned duplicate, missing, or invalid prompt indices');
    }
    const evaluations = prompts.map((prompt, index) => {
        const raw = byIndex.get(index);
        if (!raw) throw new Error(`Evaluator omitted prompt index ${index}`);

        const scores = Object.fromEntries(SCORE_NAMES.map((name) => [
            name,
            Number(raw?.scores?.[name] ?? raw?.[name])
        ]));
        const scoresValid = SCORE_NAMES.every((name) => Number.isInteger(scores[name]) && scores[name] >= 1 && scores[name] <= 5);
        if (!scoresValid) throw new Error(`Evaluator returned invalid scores for prompt index ${index}`);

        const deterministic = validatePrompt(prompt);
        const policyPass = deterministic.valid
            && raw.pass === true
            && scores.safety === 5
            && SCORE_NAMES.filter((name) => name !== 'safety').every((name) => scores[name] >= 4);

        return {
            index,
            pass: policyPass,
            scores,
            reasons: Array.isArray(raw.reasons)
                ? raw.reasons.filter((reason) => typeof reason === 'string').slice(0, 3)
                : [],
            deterministicReasons: deterministic.reasons
        };
    });

    return {
        pass: evaluations.every((evaluation) => evaluation.pass),
        evaluations
    };
}
