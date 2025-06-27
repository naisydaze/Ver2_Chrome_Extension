function updateDndButton(dndEnabled) {
  const btn = document.getElementById('dnd-btn');
  btn.classList.remove('dnd-on', 'dnd-off');
  if (dndEnabled) {
    btn.classList.add('dnd-on');
    btn.classList.remove('dnd-off');
  } else {
    btn.classList.remove('dnd-on');
    btn.classList.add('dnd-off');
  }
}

function formatInterval(minutes) {
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hrs > 0 && mins > 0) return `${hrs} Hour${hrs > 1 ? 's' : ''} ${mins} Minute${mins > 1 ? 's' : ''}`;
  if (hrs > 0) return `${hrs} Hour${hrs > 1 ? 's' : ''}`;
  return `${mins} Minute${mins > 1 ? 's' : ''}`;
}

document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.sync.get(['promptCategory', 'notificationInterval'], (data) => {
    console.log(data);
    // Show selected category
    const categories = data.promptCategory || [];
    const formattedCategories = Array.isArray(categories)
      ? categories.map(c => c.charAt(0).toUpperCase() + c.slice(1)).join(', ')
      : categories;

    document.getElementById('selected-category').textContent = formattedCategories || 'Not set';

    const interval = parseInt(data.notificationInterval) || 1;
    document.getElementById('selected-interval').textContent = formatInterval(interval);
    updateDndButton(data.dnd === true);
  });

  chrome.storage.sync.get(['dnd'], (data) => {
    updateDndButton(data.dnd === true);
  });

  document.getElementById('dnd-btn').addEventListener('click', () => {
    chrome.storage.sync.get(['dnd', 'notificationInterval', 'prevInterval'], (data) => {
      const dndEnabled = data.dnd === true;
      if (dndEnabled) {
        chrome.storage.sync.set({ dnd: false , notificationInterval: data.prevInterval || 1}, () => {
          updateDndButton(false);
          alert('Do Not Disturb disabled. Notifications will resume.');
        });
      } else {
        chrome.storage.sync.set({ dnd: true,
        prevInterval: data.notificationInterval,
        notificationInterval: 1440}, () => {
          console.log('notificationInterval set to 1 day');
          updateDndButton(true);
          alert('Notifications paused for the rest of the day.');
        });
      }
    });
  });
;
});
  
// Save settings
document.getElementById('saveSettings').addEventListener('click',  function(){
  chrome.tabs.create({url:"index.html"});
});