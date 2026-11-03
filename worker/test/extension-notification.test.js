import assert from 'node:assert/strict';
import test from 'node:test';

test('a network failure still creates a reminder using the packaged icon', async (t) => {
    let alarmListener;
    let created;
    let resolveNotification;
    const notificationCreated = new Promise((resolve) => { resolveNotification = resolve; });
    const preferences = {
        categories: [{ id: 'health', name: 'Health', topic: 'health', enabled: true }],
        notifications: { intervalMinutes: 1, activeHours: { enabled: false }, dnd: { enabled: false } }
    };
    t.mock.method(globalThis, 'fetch', async () => { throw new TypeError('Failed to fetch'); });
    globalThis.chrome = {
        runtime: {
            getURL: (path) => `chrome-extension://test-id/${path}`,
            onInstalled: { addListener() {} },
            onStartup: { addListener() {} }
        },
        alarms: {
            create() {},
            async get() { return { periodInMinutes: 1 }; },
            onAlarm: { addListener(listener) { alarmListener = listener; } }
        },
        storage: {
            local: {
                async get(key) { return key === 'v2Preferences' ? { v2Preferences: preferences } : {}; },
                async set() {}
            },
            onChanged: { addListener() {} }
        },
        notifications: {
            async create(options) { created = options; resolveNotification(); }
        }
    };
    t.after(() => { delete globalThis.chrome; });
    await import('../../background.js');
    alarmListener({ name: 'V2Prompt' });
    await Promise.race([
        notificationCreated,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Notification not created')), 1000))
    ]);
    assert.equal(created.iconUrl, 'chrome-extension://test-id/assets/icons/icon-128.png');
    assert.ok(created.message);
    assert.equal(created.title, 'V2 Prompt · Health');
});
