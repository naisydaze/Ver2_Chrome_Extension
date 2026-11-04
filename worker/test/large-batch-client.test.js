import assert from 'node:assert/strict';
import test from 'node:test';
import worker from '../src/index.js';
import { fetchQuote } from '../../src/utils/quoteClient.js';

test('extension and Worker cycle through all 50 cached prompts before repeating', async (t) => {
    const data = {};
    globalThis.chrome = { storage: { local: {
        async get(keys) { return Object.fromEntries(keys.filter((key) => key in data).map((key) => [key, data[key]])); },
        async set(values) { Object.assign(data, values); }
    } } };
    t.after(() => { delete globalThis.chrome; });
    const batchId = '12345678-1234-1234-1234-123456789012';
    const env = {
        QUOTE_CACHE: { async get() { return { batchId, prompts: Array.from({ length: 50 }, (_, i) => `Prompt ${i}`) }; } },
        INSTALL_RATE_LIMITER: { async limit() { return { success: true }; } },
        IP_RATE_LIMITER: { async limit() { return { success: true }; } }
    };
    const requestLengths = [];
    t.mock.method(globalThis, 'fetch', async (url, options) => {
        requestLengths.push(JSON.parse(options.body).seenIds.length);
        return worker.fetch(new Request(url, options), env);
    });
    const seenQuotes = new Set();
    for (let i = 0; i < 50; i += 1) {
        const result = await fetchQuote('health');
        assert.equal(result.source, 'ai-cache');
        assert.ok(!seenQuotes.has(result.quote));
        seenQuotes.add(result.quote);
    }
    assert.equal((await fetchQuote('health')).source, 'ai-cache');
    assert.equal(requestLengths.at(-1), 50);
    assert.equal(data.v2QuoteHistory.health.seenIds.length, 1);
});
