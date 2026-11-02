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

test('normalizes categories used as cache keys', () => {
    assert.equal(normalizeCategory('  Software   Development!  '), 'software development');
    assert.equal(normalizeCategory('Code'), 'software development');
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

test('protects generation and serves every cached prompt before repeating', async () => {
    const values = new Map();
    const stagingValues = new Map();
    let aiCalls = 0;
    const env = {
        ALLOWED_EXTENSION_ORIGIN: 'chrome-extension://test-id',
        ADMIN_TOKEN: 'test-secret',
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
    assert.equal(aiCalls, 2);
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
    assert.equal(aiCalls, 2);
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
    assert.deepEqual(body.generated, []);
    assert.match(body.failures[0].error, /prompt array/);
});

test('keeps evaluator-rejected batches in staging and out of public cache', async () => {
    const cacheValues = new Map();
    const stagingValues = new Map();
    let aiCalls = 0;
    const rejectedEvaluation = passingEvaluation(samplePrompts.length);
    rejectedEvaluation.response.evaluations[2].pass = false;
    rejectedEvaluation.response.evaluations[2].scores.tone = 2;
    rejectedEvaluation.response.evaluations[2].reasons = ['Tone is too forceful.'];

    const env = {
        ADMIN_TOKEN: 'test-secret',
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
    assert.equal(aiCalls, 6);
    assert.equal(cacheValues.size, 0);
    assert.match(body.failures[0].error, /rejected 1/);
    const stagedRecords = [...stagingValues.entries()]
        .filter(([key]) => key.startsWith('staging-batch:'))
        .map(([, value]) => JSON.parse(value));
    assert.equal(stagedRecords.length, 3);
    assert.ok(stagedRecords.every((record) => record.status === 'rejected'));
});
