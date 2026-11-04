import { getLocalQuote } from '../data/localQuotes.js';

// A backend URL is safe to ship; credentials are not. When the production
// backend is deployed, set its HTTPS endpoint here and add only that origin to
// host_permissions in manifest.json.
const QUOTE_BACKEND_URL = 'https://v2-quote-api.shanaisyz.workers.dev/quote';
const REQUEST_TIMEOUT_MS = 8000;
const INSTALL_ID_KEY = 'v2InstallId';
const QUOTE_HISTORY_KEY = 'v2QuoteHistory';
const MAX_PROMPT_HISTORY = 50;

function validBackendQuote(value) {
    return value
        && typeof value.quote === 'string'
        && value.quote.trim().length > 0
        && (value.author === undefined || typeof value.author === 'string');
}

async function fetchBackendQuote(category) {
    const stored = await chrome.storage.local.get([INSTALL_ID_KEY, QUOTE_HISTORY_KEY]);
    const installId = stored[INSTALL_ID_KEY] || crypto.randomUUID();
    if (!stored[INSTALL_ID_KEY]) {
        await chrome.storage.local.set({ [INSTALL_ID_KEY]: installId });
    }

    const history = stored[QUOTE_HISTORY_KEY] || {};
    const historyEntry = history[category] || { batchId: null, seenIds: [] };

    const response = await fetch(QUOTE_BACKEND_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-V2-Install-ID': installId
        },
        body: JSON.stringify({ category, seenIds: historyEntry.seenIds.slice(-MAX_PROMPT_HISTORY) }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    });

    if (!response.ok) {
        throw new Error(`Quote backend returned HTTP ${response.status}`);
    }

    const data = await response.json();
    if (!validBackendQuote(data)) {
        throw new Error('Quote backend returned an invalid response');
    }

    const batchChanged = data.batchId && data.batchId !== historyEntry.batchId;
    const seenIds = batchChanged || data.cycleReset ? [] : [...historyEntry.seenIds];
    if (typeof data.id === 'string') seenIds.push(data.id);
    history[category] = {
        batchId: data.batchId || historyEntry.batchId,
        seenIds: [...new Set(seenIds)].slice(-MAX_PROMPT_HISTORY)
    };
    await chrome.storage.local.set({ [QUOTE_HISTORY_KEY]: history });

    return {
        quote: data.quote.trim(),
        category,
        source: data.source || 'backend'
    };
}

export async function fetchQuote(category) {
    if (QUOTE_BACKEND_URL) {
        try {
            return await fetchBackendQuote(category);
        } catch (error) {
            console.warn('Quote backend unavailable; using a local quote.', error);
        }
    }

    return getLocalQuote(category);
}
