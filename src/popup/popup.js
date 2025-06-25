document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.sync.get(['category', 'hours', 'minutes'], (data) => {
    // Display selected category
    const category = data.category || 'Not set';
    document.getElementById('selected-category').textContent = category.charAt(0).toUpperCase() + category.slice(1);

    // Display selected interval
    const hours = data.hours || '0';
    const minutes = data.minutes || '0';
    document.getElementById('selected-interval').textContent = `${hours} hour(s) ${minutes} minute(s)`;
  });
});


// // Restore saved settings
// document.addEventListener('DOMContentLoaded', async () => {
//   const { category = 'leadership', hours = '0', minutes = '10' } = await chrome.storage.sync.get(['category', 'hours', 'minutes']);
//   document.querySelectorAll('.category-btn').forEach(btn => {
//     btn.classList.toggle('selected', btn.dataset.category === category);
//   });
//   document.getElementById('hours').value = hours;
//   document.getElementById('minutes').value = minutes;
// });

// // Category selection
// document.getElementById('categories').addEventListener('click', (e) => {
//   if (e.target.classList.contains('category-btn')) {
//     document.querySelectorAll('.category-btn').forEach(btn => btn.classList.remove('selected'));
//     e.target.classList.add('selected');
//   }
// });

// Save settings
document.getElementById('saveSettings').addEventListener('click',  function(){
  chrome.tabs.create({url:"index.html"});
});

// document.getElementById("settingsPage").addEventListener("click", function(){
//     chrome.tabs.create({url:"index.html"});
// });
