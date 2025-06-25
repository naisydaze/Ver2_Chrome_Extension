// Load right and wrong answer counts on settings page load

document.addEventListener("DOMContentLoaded", function() {
    document.getElementById("save-settings").addEventListener("click", () => {

    const promptCatElement = document.getElementById("prompt-category");
    const promptCat = promptCatElement ? promptCatElement.value : null;    
    console.log("promptCat: " + promptCat);


    console.log("changes savedddd!");
    const intervalElement = document.getElementById("notification-interval");
    console.log(intervalElement.value); // should log the element if found
    const interval = intervalElement ? intervalElement.value : null;    
    console.log("changes saved!");
    // const interval = document.getElementById("notification-interval").value;
    const showPreview = document.getElementById("show-preview").checked;

    // Save to storage
    chrome.storage.sync.set({
        promptCategory: parseInt(promptCat.value),
        notificationInterval: parseInt(intervalElement.value),
        showPreview: showPreview
    }, () => {
        alert("Settings saved!");
        console.log("saved to chrome sync!");
        console.log(parseInt(intervalElement.value));
    });
  });
});


  