import assert from 'node:assert/strict';
import test from 'node:test';
import worker, { ScheduleGuard } from '../src/index.js';

function setup({ duplicateCandidates = false, rejectAll = false, rejectFirst = false } = {}) {
    const cache = new Map();
    const staging = new Map();
    let generations = 0;
    let evaluations = 0;
    const storage = new Map();
    const guard = new ScheduleGuard({ storage: {
        async transaction(callback) {
            return callback({ async get(key) { return storage.get(key); }, async put(key, value) { storage.set(key, value); } });
        }
    } });
    const env = {
        AI: { async run(model, options) {
            if (model.includes('llama-3.2-3b')) {
                const base = duplicateCandidates ? 0 : generations * 10;
                generations += 1;
                return { response: { prompts: Array.from({ length: 10 }, (_, i) => {
                    const n = base + i;
                    return `Choose activity${n} to explore benefit${n} during moment${n} for growth.`;
                }) }, usage: { neurons: 10 } };
            }
            evaluations += 1;
            const text = options.messages[1].content;
            const prompts = JSON.parse(text.slice(text.indexOf('Prompts:\n') + 'Prompts:\n'.length));
            return { response: { evaluations: prompts.map((_, index) => ({
                index, pass: !rejectAll && !(rejectFirst && index === 0), relevance: 4, actionability: 4, clarity: 4,
                tone: 4, safety: 5, originality: 4, reasons: []
            })) }, usage: { neurons: 20 } };
        } },
        QUOTE_CACHE: { async get(key) { return cache.get(key) || null; }, async put(key, value) { cache.set(key, JSON.parse(value)); } },
        QUOTE_STAGING: { async get(key) { return staging.get(key) || null; }, async put(key, value) { staging.set(key, value); } },
        SCHEDULE_GUARD: { idFromName(name) { return name; }, get() {
            return { fetch(url, options) { return guard.fetch(new Request(url, options)); } };
        } },
        INSTALL_RATE_LIMITER: { async limit() { return { success: true }; } },
        IP_RATE_LIMITER: { async limit() { return { success: true }; } },
        ALLOWED_EXTENSION_ORIGIN: 'chrome-extension://test'
    };
    return { env, cache, staging, counts: () => ({ generations, evaluations }) };
}

test('scheduled refresh generates three bounded batches once per slot', async () => {
    const { env, cache, counts } = setup();
    let noRetryCalls = 0;
    const event = { cron: '15 0,12 * * *', scheduledTime: 1_800_000_000_000, noRetry() { noRetryCalls += 1; } };
    await worker.scheduled(event, env);
    assert.equal(noRetryCalls, 1);
    assert.deepEqual(counts(), { generations: 15, evaluations: 30 });
    for (const category of ['health', 'career', 'motivation']) {
        assert.equal(cache.get(`prompt-batch:v1:${category}`).prompts.length, 50);
    }
    assert.equal(cache.has('prompt-batch:v1:wisdom'), false);
    await worker.scheduled(event, env);
    assert.deepEqual(counts(), { generations: 15, evaluations: 30 });
});

test('scheduled refresh preserves the prior cache if evaluation approves fewer than 20', async () => {
    const { env, cache, counts } = setup({ rejectAll: true });
    for (const category of ['health', 'career', 'motivation']) {
        cache.set(`prompt-batch:v1:${category}`, { batchId: 'previous', prompts: ['existing'] });
    }
    await worker.scheduled({ cron: '15 0,12 * * *', scheduledTime: 1_800_000_000_000, noRetry() {} }, env);
    assert.deepEqual(counts(), { generations: 15, evaluations: 30 });
    for (const category of ['health', 'career', 'motivation']) {
        assert.equal(cache.get(`prompt-batch:v1:${category}`).batchId, 'previous');
    }
});

test('scheduled refresh publishes only the approved subset when at least 20 pass', async () => {
    const { env, cache, counts } = setup({ rejectFirst: true });
    await worker.scheduled({ cron: '15 0,12 * * *', scheduledTime: 1_800_000_000_000, noRetry() {} }, env);
    assert.deepEqual(counts(), { generations: 15, evaluations: 30 });
    for (const category of ['health', 'career', 'motivation']) {
        const prompts = cache.get(`prompt-batch:v1:${category}`).prompts;
        assert.equal(prompts.length, 40);
        assert.ok(!prompts.some((prompt) => prompt.includes('activity0 ')));
    }
});

test('scheduled refresh preserves existing caches when too few candidates pass', async () => {
    const { env, cache, staging, counts } = setup({ duplicateCandidates: true });
    for (const category of ['health', 'career', 'motivation']) {
        cache.set(`prompt-batch:v1:${category}`, { batchId: 'previous', prompts: ['existing'] });
    }
    await worker.scheduled({ cron: '15 0,12 * * *', scheduledTime: 1_800_000_000_000, noRetry() {} }, env);
    assert.deepEqual(counts(), { generations: 15, evaluations: 0 });
    for (const category of ['health', 'career', 'motivation']) {
        assert.equal(cache.get(`prompt-batch:v1:${category}`).batchId, 'previous');
        assert.ok([...staging.values()].some((value) => value.includes('scheduled_failed') && value.includes(category)));
    }
});

test('server supports a complete cycle through a 50-prompt batch', async () => {
    const { env, cache } = setup();
    const batchId = '12345678-1234-1234-1234-123456789012';
    cache.set('prompt-batch:v1:health', { batchId, prompts: Array.from({ length: 50 }, (_, i) => `Prompt ${i}`) });
    const seenIds = [];
    for (let i = 0; i < 51; i += 1) {
        const response = await worker.fetch(new Request('https://example.test/quote', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ category: 'health', seenIds })
        }), env);
        const body = await response.json();
        assert.equal(response.status, 200);
        assert.equal(body.cycleReset, i === 50);
        if (i < 50) { assert.ok(!seenIds.includes(body.id)); seenIds.push(body.id); }
    }
});
