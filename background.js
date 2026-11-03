import { fetchQuote } from './src/utils/quoteClient.js';
import {
    PREFERENCES_KEY,
    getPreferences,
    isDndActive,
    isWithinActiveHours
} from './src/utils/preferences.js';

const REMINDER_ALARM = 'V2Prompt';

function createReminderAlarm(intervalMinutes) {
    chrome.alarms.create(REMINDER_ALARM, {
        delayInMinutes: intervalMinutes,
        periodInMinutes: intervalMinutes
    });
}

async function ensureReminderAlarm() {
    const preferences = await getPreferences();
    const expectedInterval = preferences.notifications.intervalMinutes;
    const alarm = await chrome.alarms.get(REMINDER_ALARM);

    if (!alarm || alarm.periodInMinutes !== expectedInterval) {
        createReminderAlarm(expectedInterval);
    }
}

chrome.runtime.onInstalled.addListener(() => void ensureReminderAlarm());
chrome.runtime.onStartup.addListener(() => void ensureReminderAlarm());

// Alarm persistence across browser restarts is not guaranteed. Check whenever
// Chrome spins this worker up, in addition to the explicit lifecycle events.
void ensureReminderAlarm();

chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace !== 'local' || !changes[PREFERENCES_KEY]) return;

    const oldInterval = changes[PREFERENCES_KEY].oldValue?.notifications?.intervalMinutes;
    const newInterval = changes[PREFERENCES_KEY].newValue?.notifications?.intervalMinutes;
    if (oldInterval !== newInterval) {
        void ensureReminderAlarm();
    }
});

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name !== REMINDER_ALARM) return;
    void showReminderIfAllowed();
});

async function showReminderIfAllowed() {
    const preferences = await getPreferences();
    const { notifications } = preferences;

    if (isDndActive(notifications.dnd)) {
        console.log('Deep work mode active; reminder skipped.');
        return;
    }

    if (!isWithinActiveHours(notifications.activeHours)) {
        console.log('Outside active hours; reminder skipped.');
        return;
    }

    const categories = preferences.categories.filter((category) => category.enabled);
    const category = categories[Math.floor(Math.random() * categories.length)];

    let quoteObj;
    try {
        quoteObj = await fetchQuote(category.topic);
    } catch (error) {
        console.error('Unable to obtain a reminder prompt:', error);
        return;
    }

    try {
        await chrome.notifications.create({
            type: 'basic',
            iconUrl: chrome.runtime.getURL('assets/icons/icon-128.png'),
            title: `V2 Prompt · ${category.name}`,
            message: quoteObj.quote,
            priority: 1
        });
    } catch (error) {
        console.error('Unable to create reminder notification:', error);
    }
}
