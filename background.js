chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === "sync") {
        if (changes.notificationInterval) {
            const interval = changes.notificationInterval.newValue;
            console.log(interval);
            chrome.alarms.clear("selfImprovementPrompt", () => {
                chrome.alarms.create("selfImprovementPrompt", { delayInMinutes: interval, periodInMinutes: interval });
            });
        }
        if (changes.showPreview) {
            console.log(changes.showPreview.newValue);
            console.log("Show preview setting updated:", changes.showPreview.newValue);
        }
        if (changes.promptCategory) {
            console.log(changes.promptCategory.newValue);
            console.log("New Prompt Category Selected:", changes.promptCategory.newValue);
        }
    }
    else{ 
        console.log('wrong leh');
    }
});

chrome.alarms.onAlarm.addListener((alarm) => {
    console.log(alarm.name);
    if (alarm.name === "selfImprovementPrompt") {
        console.log("selfImprovementPrompt starts");
        chrome.storage.sync.get(["showPreview", "promptCategory"], async (settings) => {
            console.log("banner start");
            let quote = await getQuoteForCategory(settings.promptCategory || "leadership");

            const message = settings.showPreview 
                ? `Preview: ${quote}`
                // ? "Here's a preview of your self-improvement prompt!"
                : "Click here to view your prompt.";
                
            const url = chrome.runtime.getURL("hello_extensions.png");
console.log("Icon test URL:", url);

// Try fetching the image to see if it loads
fetch(url)
  .then((res) => {
    if (!res.ok) throw new Error("Image not found");
    console.log("✅ Icon loaded successfully.");
  })
  .catch((err) => {
    console.error("❌ Failed to load icon:", err);
  });
            chrome.notifications.create({
                type: "basic",
                iconUrl:"hello_extensions.png", 
                title: "Self-Improvement Prompt",
                message,
                priority: 1
            });
            console.log("notifications ran");

        });
    }
});


async function getQuoteForCategory(category) {
    // Example local quotes; replace with API call as needed
    const quotes = {
        mindfulness: "Be present in all things and thankful for all things.",
        "goal-focused": "Set your goals high, and don't stop till you get there.",
        leadership: "Leadership is the capacity to translate vision into reality."
    };
    return quotes[category] || quotes.leadership;
}