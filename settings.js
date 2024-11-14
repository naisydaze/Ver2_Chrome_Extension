// Load right and wrong answer counts on settings page load
document.addEventListener("DOMContentLoaded", () => {
    chrome.storage.sync.get(["rightAns", "wrongAns"], (data) => {
      document.getElementById("rightAns").textContent = data.rightAns || 0;
      document.getElementById("wrongAns").textContent = data.wrongAns || 0;
    });
  });
  
  // Optional: Add reset functionality for debugging or to let users reset their progress
  function resetProgress() {
    chrome.storage.sync.set({ rightAns: 0, wrongAns: 0 }, () => {
      document.getElementById("rightAns").textContent = 0;
      document.getElementById("wrongAns").textContent = 0;
    });
  }
document.addEventListener("DOMContentLoaded", function() {
    document.getElementById("save-settings").addEventListener("click", () => {

    console.log("changes savedddd!");
    const intervalElement = document.getElementById("notification-interval");
    console.log(intervalElement.value); // should log the element if found
    const interval = intervalElement ? intervalElement.value : null;    
    console.log("changes saved!");
    // const interval = document.getElementById("notification-interval").value;
    const showPreview = document.getElementById("show-preview").checked;

    // Save to storage
    chrome.storage.sync.set({
        notificationInterval: parseInt(intervalElement.value),
        showPreview: showPreview
    }, () => {
        alert("Settings saved!");
        console.log("saved to chrome sync!");
        console.log(parseInt(intervalElement.value));
    });
  });
});


  