import { fetchQuote } from './src/utils/geminiClient.js'; 

chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === "sync") {
        if (changes.notificationInterval) {
            const interval = changes.notificationInterval.newValue;
            console.log("Show preview setting updated:", interval);
            chrome.alarms.clear("V2Prompt", () => {
                chrome.alarms.create("V2Prompt", { delayInMinutes: interval, periodInMinutes: interval });
            });
        }
        if (changes.showPreview) {
            console.log("Show preview setting updated:", changes.showPreview.newValue);
        }
        if (changes.promptCategory) {
            console.log("New Prompt Category Selected:", changes.promptCategory.newValue);
        }
    }
    else{ 
        console.log('Something went wrong while updating the settings');
    }
});

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "V2Prompt") {
        chrome.storage.sync.get(["dnd", "dndUntil", "showPreview", "promptCategory"], async (settings) => {
                // Check DND state
        const now = Date.now();
        if (settings.dnd && settings.dndUntil && now < settings.dndUntil) {
            console.log("DND active, skipping notification.");
            return;
        }
            let quoteObj = await getQuoteForCategory(settings.promptCategory || "leadership");
            console.log("quoteObj", quoteObj);
            console.log("quote", quoteObj.quote);

            const message = settings.showPreview 
                ? `${quoteObj.quote}`
                : "Click here to view your prompt.";
                
            const url = chrome.runtime.getURL("harmony.png");

            chrome.notifications.create({
                type: "basic",
                iconUrl:"harmony.png", 
                title: "V2 Prompt",
                message,
                priority: 1
            });
            console.log("notifications ran");

        });
    }
});


async function getQuoteForCategory(category) {
    return await fetchQuote(category);
}