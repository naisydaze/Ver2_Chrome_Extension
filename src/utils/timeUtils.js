function isWithinWorkingHours() {
  const now = new Date();
  const hour = now.getHours();
  return hour >= 9 && hour <= 18;
}

function isDoNotDisturb() {
  const now = new Date();
  const hour = now.getHours();
  return hour >= 22 || hour < 7; // Example DND window
}

// Export for use in other scripts
if (typeof module !== 'undefined') {
  module.exports = { isWithinWorkingHours, isDoNotDisturb };
}