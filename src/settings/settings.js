import {
    DEFAULT_PREFERENCES,
    PRESET_CATEGORIES,
    getPreferences,
    savePreferences
} from '../utils/preferences.js';

function renderCategories(categories) {
    const container = document.getElementById('category-options');
    container.innerHTML = PRESET_CATEGORIES.map((option) => {
        const selected = categories.some((category) => category.id === option.id && category.enabled);
        return `
            <label class="category-option">
                <input type="checkbox" value="${option.id}" ${selected ? 'checked' : ''}>
                ${option.name}
            </label>`;
    }).join('');

}

function readCategories() {
    const selectedIds = [...document.querySelectorAll('#category-options input:checked')]
        .map((input) => input.value);
    return PRESET_CATEGORIES
        .filter((option) => selectedIds.includes(option.id))
        .map((option) => ({ ...option, enabled: true }));
}

function populateIntervalFields(intervalMinutes) {
    const select = document.getElementById('notification-interval');
    const preset = [...select.options].some((option) => option.value === String(intervalMinutes));
    select.value = preset ? String(intervalMinutes) : 'custom';
    document.getElementById('custom-hours').value = preset ? '' : Math.floor(intervalMinutes / 60);
    document.getElementById('custom-minutes').value = preset ? '' : intervalMinutes % 60;
    toggleCustomInterval();
}

function toggleCustomInterval() {
    document.getElementById('custom-interval-fields').hidden =
        document.getElementById('notification-interval').value !== 'custom';
}

document.addEventListener('DOMContentLoaded', async () => {
    const preferences = await getPreferences();
    const { notifications } = preferences;

    const upgradeNotice = document.getElementById('upgrade-notice');
    const notices = [];
    if (preferences.upgradeReview?.categoryChanged) {
        notices.push('One or more of your previous categories are no longer available. Please review the categories selected below.');
    }
    if (preferences.upgradeReview?.previewChanged) {
        notices.push('V2 now shows the full prompt in notifications; the option to hide previews has been removed.');
    }
    if (notices.length) {
        upgradeNotice.textContent = `${notices.join(' ')} Reminders are paused until you review and save these settings.`;
        upgradeNotice.hidden = false;
    }

    renderCategories(preferences.categories);
    populateIntervalFields(notifications.intervalMinutes);
    document.getElementById('active-hours-enabled').checked = notifications.activeHours.enabled;
    document.getElementById('active-hours-start').value = notifications.activeHours.start;
    document.getElementById('active-hours-end').value = notifications.activeHours.end;

    document.getElementById('notification-interval').addEventListener('change', toggleCustomInterval);

    document.getElementById('save-settings').addEventListener('click', async () => {
        const categories = readCategories();
        if (!categories.length) {
            alert('Select or enter at least one goal category.');
            return;
        }

        const intervalSelect = document.getElementById('notification-interval');
        const intervalMinutes = intervalSelect.value === 'custom'
            ? (Number(document.getElementById('custom-hours').value) * 60)
                + Number(document.getElementById('custom-minutes').value)
            : Number(intervalSelect.value);

        if (!Number.isFinite(intervalMinutes) || intervalMinutes < 1) {
            alert('Please choose a notification interval of at least 1 minute.');
            return;
        }

        // Preserve a deep-work block that may have been changed in the popup
        // while this settings page was open.
        const latestPreferences = await getPreferences();
        await savePreferences({
            ...latestPreferences,
            categories,
            upgradeReview: { categoryChanged: false, previewChanged: false },
            notifications: {
                ...latestPreferences.notifications,
                intervalMinutes,
                activeHours: {
                    enabled: document.getElementById('active-hours-enabled').checked,
                    start: document.getElementById('active-hours-start').value,
                    end: document.getElementById('active-hours-end').value
                }
            }
        });
        upgradeNotice.hidden = true;
        upgradeNotice.textContent = '';
        alert('Settings saved!');
    });

    document.getElementById('reset-btn').addEventListener('click', async () => {
        await savePreferences(DEFAULT_PREFERENCES);
        window.location.reload();
    });
});
