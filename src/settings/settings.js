import {
    DEFAULT_PREFERENCES,
    PRESET_CATEGORIES,
    getPreferences,
    savePreferences
} from '../utils/preferences.js';
import { clearRecentPrompts, getRecentPrompts, RECENT_PROMPTS_KEY } from '../utils/recentPrompts.js';

async function renderRecentPrompts() {
    const prompts = globalThis.chrome?.storage?.local ? await getRecentPrompts() : [];
    const list = document.getElementById('recent-list');
    list.replaceChildren();
    document.getElementById('recent-empty').hidden = prompts.length > 0;
    document.getElementById('clear-recent').disabled = prompts.length === 0;
    for (const item of prompts) {
        const entry = document.createElement('li');
        const quote = document.createElement('p');
        quote.textContent = item.quote;
        const details = document.createElement('span');
        details.textContent = `${item.category} · ${new Date(item.shownAt).toLocaleString()}`;
        entry.append(quote, details);
        list.append(entry);
    }
}

function selectTab(id, focus = false) {
    for (const name of ['settings', 'recent']) {
        const selected = name === id;
        const tab = document.getElementById(`${name}-tab`);
        tab.setAttribute('aria-selected', String(selected));
        tab.tabIndex = selected ? 0 : -1;
        document.getElementById(`${name}-panel`).hidden = !selected;
        if (selected && focus) tab.focus();
    }
}

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
    for (const name of ['settings', 'recent']) {
        const tab = document.getElementById(`${name}-tab`);
        tab.addEventListener('click', () => selectTab(name));
        tab.addEventListener('keydown', (event) => {
            if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
                event.preventDefault();
                selectTab(name === 'settings' ? 'recent' : 'settings', true);
            }
        });
    }
    await renderRecentPrompts();
    document.getElementById('clear-recent').addEventListener('click', async () => {
        await clearRecentPrompts();
        await renderRecentPrompts();
    });
    globalThis.chrome?.storage?.onChanged?.addListener((changes, namespace) => {
        if (namespace === 'local' && changes[RECENT_PROMPTS_KEY]) void renderRecentPrompts();
    });
    const preferences = await getPreferences();
    const { notifications } = preferences;

    const upgradeNotice = document.getElementById('upgrade-notice');
    const notices = [];
    if (preferences.upgradeReview?.categoryChanged) {
        notices.push('Categories have changed. Failure and Success are now covered under Motivation; Code, Wisdom and custom categories are no longer available. Please review your selection.');
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
            alert('Select at least one goal category.');
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
