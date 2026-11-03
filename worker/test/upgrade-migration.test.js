import assert from 'node:assert/strict';
import test from 'node:test';
import { getPreferences, normalizePreferences, savePreferences } from '../../src/utils/preferences.js';

async function migrate(legacy) {
    const local = {};
    const sync = { ...legacy };
    globalThis.chrome = { storage: {
        local: {
            async get(key) { return { [key]: local[key] }; },
            async set(values) { Object.assign(local, values); }
        },
        sync: { async get() { return { ...sync }; } }
    } };
    const preferences = await getPreferences();
    return { preferences, local, sync };
}

test('migrates the original motivational category and reminder interval', async () => {
    const { preferences, sync } = await migrate({ promptCategory: 'motivational', notificationInterval: 180, showPreview: true });
    assert.deepEqual(preferences.categories.filter((category) => category.enabled).map((category) => category.id), ['motivation']);
    assert.equal(preferences.notifications.intervalMinutes, 180);
    assert.deepEqual(preferences.upgradeReview, { categoryChanged: false, previewChanged: false });
    assert.equal(sync.promptCategory, 'motivational');
});

test('saving one non-default category does not silently re-enable Health', () => {
    const preferences = normalizePreferences({ categories: [{ id: 'motivation', enabled: true }] });
    assert.deepEqual(preferences.categories.filter((category) => category.enabled).map((category) => category.id), ['motivation']);
});

test('pauses for review when the old category is no longer offered', async () => {
    for (const promptCategory of ['failure', 'my custom topic']) {
        const { preferences, sync } = await migrate({ promptCategory, notificationInterval: 1 });
        assert.equal(preferences.upgradeReview.categoryChanged, true);
        assert.equal(preferences.notifications.intervalMinutes, 1);
        assert.equal(sync.promptCategory, promptCategory);
    }
});

test('preserves a preview privacy choice until settings are explicitly reviewed', async () => {
    const { preferences, local } = await migrate({ promptCategory: 'wisdom', notificationInterval: 15, showPreview: false });
    assert.equal(preferences.upgradeReview.previewChanged, true);
    assert.equal(normalizePreferences(preferences).upgradeReview.previewChanged, true);
    await savePreferences({ ...preferences, upgradeReview: { categoryChanged: false, previewChanged: false } });
    assert.deepEqual(local.v2Preferences.upgradeReview, { categoryChanged: false, previewChanged: false });
});

test('treats an unset legacy preview setting as hidden', async () => {
    const { preferences } = await migrate({ promptCategory: 'wisdom', notificationInterval: 15 });
    assert.equal(preferences.upgradeReview.previewChanged, true);
});

test('migrates a legacy deep-work pause and its previous interval', async () => {
    const until = Date.now() + 60_000;
    const { preferences } = await migrate({ promptCategory: 'wisdom', notificationInterval: 1440, prevInterval: 30, dnd: true, dndUntil: until });
    assert.equal(preferences.notifications.intervalMinutes, 30);
    assert.deepEqual(preferences.notifications.dnd, { enabled: true, until });
});
