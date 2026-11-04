import assert from 'node:assert/strict';
import test from 'node:test';
import { clearRecentPrompts, getRecentPrompts, saveRecentPrompt } from '../../src/utils/recentPrompts.js';
import { validatePrompt } from '../src/quality.js';

test('recent reminders are stored newest first, limited to 20, and clearable', async (t) => {
    const storage = {};
    globalThis.chrome = { storage: { local: {
        async get(key) { return { [key]: storage[key] }; },
        async set(values) { Object.assign(storage, values); },
        async remove(key) { delete storage[key]; }
    } } };
    t.after(() => { delete globalThis.chrome; });
    for (let i = 0; i < 22; i++) await saveRecentPrompt(`Prompt ${i}`, 'Health');
    const recent = await getRecentPrompts();
    assert.equal(recent.length, 20);
    assert.equal(recent[0].quote, 'Prompt 21');
    assert.equal(recent[19].quote, 'Prompt 2');
    assert.equal(recent[0].category, 'Health');
    await clearRecentPrompts();
    assert.deepEqual(await getRecentPrompts(), []);
});

test('new generated prompts obey the short notification limits', () => {
    assert.equal(validatePrompt('Take one small step toward your goal.').valid, true);
    assert.ok(validatePrompt('Take one small step.').reasons.includes('invalid_word_count'));
    assert.ok(validatePrompt('Take one small step toward a goal that matters to you every single day.').reasons.includes('invalid_word_count'));
    assert.ok(validatePrompt('Extraordinarilylongword '.repeat(5) + 'today.').reasons.includes('invalid_character_length'));
});
