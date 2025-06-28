document.addEventListener("DOMContentLoaded", function() {
    const categorySelect = document.getElementById('prompt-category');
    const customCategoryInput = document.getElementById('custom-category');
    const intervalSelect = document.getElementById('notification-interval');
    const customHours = document.getElementById('custom-hours');
    const customMinutes = document.getElementById('custom-minutes');
    const showPreviewCheckbox = document.getElementById("show-preview");

    // Show/hide custom category input based on selection
    categorySelect.addEventListener('change', function() {
        customCategoryInput.style.display = categorySelect.value === 'custom' ? 'block' : 'none';
    });
    // Show/hide on load if needed
    customCategoryInput.style.display = categorySelect.value === 'custom' ? 'block' : 'none';

    // Show/hide custom interval fields
    intervalSelect.addEventListener('change', function() {
        document.getElementById('custom-interval-fields').style.display =
        intervalSelect.value === 'custom' ? 'block' : 'none';
    });
    // Show/hide on load if needed
    document.getElementById('custom-interval-fields').style.display =
        intervalSelect.value === 'custom' ? 'block' : 'none';

    // Save settings
    document.getElementById('save-settings').addEventListener('click', function() {
        const showPreview = showPreviewCheckbox.checked;
        let selectedCategory = categorySelect.value === 'custom'
        ? customCategoryInput.value
        : categorySelect.value;
        let selectedInterval;
        if (intervalSelect.value === 'custom') {
        const hours = parseInt(customHours.value) || 0;
        const minutes = parseInt(customMinutes.value) || 0;
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


  