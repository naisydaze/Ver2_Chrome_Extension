export const PREFERENCES_KEY = 'v2Preferences';

export const PRESET_CATEGORIES = Object.freeze([
    { id: 'health', name: 'Health', topic: 'health' },
    { id: 'career', name: 'Career', topic: 'career' },
    { id: 'code', name: 'Code', topic: 'code' },
    { id: 'wisdom', name: 'Wisdom', topic: 'wisdom' },
    { id: 'motivation', name: 'Motivation', topic: 'motivation' }
]);

export const DEFAULT_PREFERENCES = Object.freeze({
    version: 1,
    categories: PRESET_CATEGORIES.map((category, index) => ({
        ...category,
        enabled: index === 0
    })),
    notifications: {
        intervalMinutes: 60,
        activeHours: {
            enabled: false,
            start: '09:00',
            end: '18:00'
        },
        dnd: {
            enabled: false,
            until: null
        }
    }
});

function cloneDefaults() {
    return JSON.parse(JSON.stringify(DEFAULT_PREFERENCES));
}

function validTime(value, fallback) {
    return /^([01]\d|2[0-3]):[0-5]\d$/.test(value || '') ? value : fallback;
}

export function normalizePreferences(value) {
    const defaults = cloneDefaults();
    const storedCategories = Array.isArray(value?.categories) ? value.categories : [];
    const categories = PRESET_CATEGORIES.map((preset, index) => {
        const stored = storedCategories.find((category) => {
            const storedTopic = String(category?.topic || '').toLowerCase();
            return category?.id === preset.id
                || String(category?.name || '').toLowerCase() === preset.name.toLowerCase()
                || storedTopic === preset.topic.toLowerCase()
                || (preset.id === 'code' && ['software development', 'programming', 'coding'].includes(storedTopic));
        });
        return {
            ...preset,
            enabled: stored ? stored.enabled === true : (storedCategories.length === 0 && defaults.categories[index].enabled)
        };
    });
    if (!categories.some((category) => category.enabled)) {
        categories[0].enabled = true;
    }

    const interval = Number(value?.notifications?.intervalMinutes);
    const until = Number(value?.notifications?.dnd?.until);

    return {
        version: 1,
        categories,
        upgradeReview: {
            categoryChanged: value?.upgradeReview?.categoryChanged === true,
            previewChanged: value?.upgradeReview?.previewChanged === true
        },
        notifications: {
            intervalMinutes: Number.isFinite(interval) && interval >= 1
                ? interval
                : defaults.notifications.intervalMinutes,
            activeHours: {
                enabled: value?.notifications?.activeHours?.enabled === true,
                start: validTime(
                    value?.notifications?.activeHours?.start,
                    defaults.notifications.activeHours.start
                ),
                end: validTime(
                    value?.notifications?.activeHours?.end,
                    defaults.notifications.activeHours.end
                )
            },
            dnd: {
                enabled: value?.notifications?.dnd?.enabled === true,
                until: Number.isFinite(until) && until > 0 ? until : null
            }
        }
    };
}

async function migrateSyncPreferences() {
    const legacy = await chrome.storage.sync.get([
        'promptCategory',
        'notificationInterval',
        'dnd',
        'dndUntil',
        'prevInterval',
        'showPreview'
    ]);
    const hasLegacyData = Object.values(legacy).some((value) => value !== undefined);
    if (!hasLegacyData) return cloneDefaults();

    const names = Array.isArray(legacy.promptCategory)
        ? legacy.promptCategory
        : [legacy.promptCategory].filter(Boolean);
    const normalizedNames = new Set(names.map((name) => String(name).trim().toLowerCase()).filter(Boolean));
    if (normalizedNames.has('motivational')) normalizedNames.add('motivation');
    if (['software development', 'programming', 'coding'].some((name) => normalizedNames.has(name))) {
        normalizedNames.add('code');
    }
    const categories = PRESET_CATEGORIES.map((category) => ({
        ...category,
        enabled: normalizedNames.has(category.id)
            || normalizedNames.has(category.name.toLowerCase())
            || normalizedNames.has(category.topic.toLowerCase())
    }));
    const knownNames = new Set([...PRESET_CATEGORIES.map((category) => category.id),
        'motivational', 'software development', 'programming', 'coding']);
    const categoryChanged = [...normalizedNames].some((name) => !knownNames.has(name));

    const endOfToday = new Date();
    endOfToday.setHours(24, 0, 0, 0);

    return normalizePreferences({
        categories: categories.length ? categories : undefined,
        upgradeReview: {
            categoryChanged,
            // Version 1.0 only showed previews when this value was truthy;
            // an unset value therefore also meant hidden notification text.
            previewChanged: legacy.showPreview !== true
        },
        notifications: {
            intervalMinutes: legacy.dnd && legacy.prevInterval
                ? legacy.prevInterval
                : legacy.notificationInterval,
            dnd: {
                enabled: legacy.dnd,
                until: legacy.dndUntil || (legacy.dnd ? endOfToday.getTime() : null)
            }
        }
    });
}

export async function getPreferences() {
    // This also lets the settings page render as a static preview for Store
    // screenshots without granting it access to extension storage.
    if (!globalThis.chrome?.storage?.local) return cloneDefaults();

    const stored = await chrome.storage.local.get(PREFERENCES_KEY);
    if (stored[PREFERENCES_KEY]) {
        const preferences = normalizePreferences(stored[PREFERENCES_KEY]);
        const dnd = preferences.notifications.dnd;
        if (dnd.enabled && dnd.until !== null && dnd.until <= Date.now()) {
            preferences.notifications.dnd = { enabled: false, until: null };
            await chrome.storage.local.set({ [PREFERENCES_KEY]: preferences });
        }
        return preferences;
    }

    const preferences = await migrateSyncPreferences();
    await chrome.storage.local.set({ [PREFERENCES_KEY]: preferences });
    return preferences;
}

export function savePreferences(preferences) {
    const normalized = normalizePreferences(preferences);
    return chrome.storage.local.set({ [PREFERENCES_KEY]: normalized });
}

export function isDndActive(dnd, now = Date.now()) {
    return dnd?.enabled === true && (dnd.until === null || now < dnd.until);
}

export function isWithinActiveHours(activeHours, date = new Date()) {
    if (!activeHours?.enabled) return true;

    const [startHour, startMinute] = activeHours.start.split(':').map(Number);
    const [endHour, endMinute] = activeHours.end.split(':').map(Number);
    const current = (date.getHours() * 60) + date.getMinutes();
    const start = (startHour * 60) + startMinute;
    const end = (endHour * 60) + endMinute;

    if (start === end) return true;
    if (start < end) return current >= start && current < end;
    return current >= start || current < end;
}
