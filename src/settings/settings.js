document.addEventListener("DOMContentLoaded", function() {
    document.getElementById("save-settings").addEventListener("click", () => {

        // Show/hide custom category input
    document.getElementById('prompt-category').addEventListener('change', function() {
        document.getElementById('custom-category').style.display =
        this.value === 'custom' ? 'block' : 'none';
    });

    document.getElementById('notification-interval').addEventListener('change', function() {
        document.getElementById('custom-interval-fields').style.display =
        this.value === 'custom' ? 'block' : 'none';
    });


    const categorySelect = document.getElementById('prompt-category');
    const intervalSelect = document.getElementById('notification-interval');
    const showPreview = document.getElementById("show-preview").checked;
    let selectedCategory = categorySelect.value === 'custom'
    ? document.getElementById('custom-category').value
    : categorySelect.value;
    let selectedInterval;
    if (intervalSelect.value === 'custom') {
    const hours = parseInt(document.getElementById('custom-hours').value) || 0;
    const minutes = parseInt(document.getElementById('custom-minutes').value) || 0;
    selectedInterval = (hours * 60) + minutes;
    } else {
    selectedInterval = parseInt(intervalSelect.value);
    } 
    chrome.storage.sync.set({ 
        notificationInterval: selectedInterval, 
        promptCategory: selectedCategory,
        showPreview: showPreview
    }, () => {
        alert('Settings saved!');
    });

    document.getElementById('reset-btn').addEventListener('click', resetProgress);

    function resetProgress() {
        chrome.storage.sync.clear(() => {
            alert('Extension state reset. Please wait 10–30 minutes before using the quote feature again.');
        });
    }
  });
});


  