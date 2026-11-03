import { getPreferences, isDndActive, savePreferences } from '../utils/preferences.js';

function formatInterval(minutes) {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (hours && remainingMinutes) return `${hours}h ${remainingMinutes}m`;
    if (hours) return `${hours} hour${hours === 1 ? '' : 's'}`;
    return `${remainingMinutes} minute${remainingMinutes === 1 ? '' : 's'}`;
}

function formatTime(time) {
    const [hour, minute] = time.split(':').map(Number);
    return new Intl.DateTimeFormat(undefined, {
        hour: 'numeric',
        minute: '2-digit'
    }).format(new Date(2000, 0, 1, hour, minute));
}

function dndEnd(duration) {
    const now = new Date();
    if (duration === 'day') {
        return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime();
    }
    return now.getTime() + (Number(duration) * 60 * 1000);
}

function render(preferences) {
    const { notifications } = preferences;
    const activeDnd = isDndActive(notifications.dnd);
    const dndButton = document.getElementById('dnd-btn');
    const upgradeNotice = document.getElementById('upgrade-notice');
    const needsReview = preferences.upgradeReview?.categoryChanged || preferences.upgradeReview?.previewChanged;
    upgradeNotice.hidden = !needsReview;
    if (needsReview) {
        upgradeNotice.textContent = 'V2 has changed some settings. Reminders are paused until you review and save them.';
    }

    document.getElementById('selected-category').textContent = preferences.categories
        .filter((category) => category.enabled)
        .map((category) => category.name)
        .join(', ');
    document.getElementById('selected-interval').textContent =
        formatInterval(notifications.intervalMinutes);
    document.getElementById('active-hours').textContent = notifications.activeHours.enabled
        ? `${formatTime(notifications.activeHours.start)}–${formatTime(notifications.activeHours.end)}`
        : 'Any time';

    dndButton.classList.toggle('dnd-on', activeDnd);
    dndButton.classList.toggle('dnd-off', !activeDnd);
    dndButton.textContent = activeDnd ? 'End Deep Work' : 'Start Deep Work';
    document.getElementById('dnd-duration').disabled = activeDnd;
    document.getElementById('dnd-status').textContent = activeDnd
        ? notifications.dnd.until === null
            ? 'Paused until you end deep work.'
            : `Paused until ${new Date(notifications.dnd.until).toLocaleTimeString([], {
                hour: 'numeric',
                minute: '2-digit'
            })}`
        : 'Notifications are active.';
}

document.addEventListener('DOMContentLoaded', async () => {
    let preferences = await getPreferences();
    render(preferences);

    document.getElementById('dnd-btn').addEventListener('click', async () => {
        // Re-read before writing so changes made in the settings page are retained.
        preferences = await getPreferences();
        const activeDnd = isDndActive(preferences.notifications.dnd);
        preferences.notifications.dnd = activeDnd
            ? { enabled: false, until: null }
            : {
                enabled: true,
                until: dndEnd(document.getElementById('dnd-duration').value)
            };
        await savePreferences(preferences);
        render(preferences);
    });

    document.getElementById('saveSettings').addEventListener('click', () => {
        chrome.tabs.create({ url: chrome.runtime.getURL('index.html') });
    });
});
