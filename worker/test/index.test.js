import assert from 'node:assert/strict';
import test from 'node:test';
import worker, { normalizeCategory, parsePromptBatch } from '../src/index.js';

const samplePrompts = [
    'Take one concrete step toward the task you have been avoiding today.',
    'Protect ten focused minutes for the work that matters most right now.',
    'Write down the smallest action that would make tomorrow easier.',
    'Pause and choose the response that supports your longer-term goal.',
    'Finish one meaningful task before adding another commitment.'
];

test('normalizes categories used as cache keys', () => {
    assert.equal(normalizeCategory('  Software   Development!  '), 'software development');
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
    assert.throws(() => parsePromptBatch({ response: 'not json' }), /JSON array/);
});

test('accepts a nested Workers AI response', () => {
    const prompts = parsePromptBatch({
        result: { response: JSON.stringify(samplePrompts) }
    }, 5);
    assert.deepEqual(prompts, samplePrompts);
});

test('protects generation and serves every cached prompt before repeating', async () => {
    const values = new Map();
    let aiCalls = 0;
    const env = {
        ALLOWED_EXTENSION_ORIGIN: 'chrome-extension://test-id',
        ADMIN_TOKEN: 'test-secret',
        BATCH_SIZE: '5',
        AI: {
            async run() {
                aiCalls += 1;
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
