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
    }
    else{ 
        console.log('wrong leh');
    }
});

chrome.alarms.onAlarm.addListener((alarm) => {
    console.log(alarm.name);
    if (alarm.name === "selfImprovementPrompt") {
        console.log("selfImprovementPrompt starts");
        chrome.storage.sync.get(["showPreview"], (settings) => {
            console.log("banner start");
            const message = settings.showPreview 
                ? "Here's a preview of your self-improvement prompt!"
                : "Click here to view your prompt.";
                
            chrome.notifications.create({
                type: "basic",
                iconUrl:"hello_extensions.png", 
                title: "Self-Improvement Prompt",
                message,
                priority: 1
            });
        });
    }
});
