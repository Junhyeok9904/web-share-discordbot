document.addEventListener('DOMContentLoaded', () => {
  const tokenInput = document.getElementById('token');
  const channelIdInput = document.getElementById('channelId');
  const statusMessage = document.getElementById('statusMessage');
  const saveBtn = document.getElementById('saveBtn');
  const stopBtn = document.getElementById('stopBtn');

  // Load existing settings
  chrome.storage.local.get(['token', 'channelId', 'active'], (result) => {
    if (result.token) tokenInput.value = result.token;
    if (result.channelId) channelIdInput.value = result.channelId;
    updateStatusUI(result.active);
  });

  saveBtn.addEventListener('click', () => {
    const token = tokenInput.value.trim();
    const channelId = channelIdInput.value.trim();

    if (!token || !channelId) {
      alert('Please enter both Token and Channel ID');
      return;
    }

    chrome.storage.local.set({ token, channelId, active: true }, () => {
      updateStatusUI(true);
      // Notify background script to restart polling
      chrome.runtime.sendMessage({ action: 'start' });
    });
  });

  stopBtn.addEventListener('click', () => {
    chrome.storage.local.set({ active: false }, () => {
      updateStatusUI(false);
      chrome.runtime.sendMessage({ action: 'stop' });
    });
  });

  function updateStatusUI(isActive) {
    if (isActive) {
      statusMessage.textContent = 'Service Active (Listening...)';
      statusMessage.className = 'status active';
    } else {
      statusMessage.textContent = 'Service Stopped';
      statusMessage.className = 'status stopped';
    }
  }
});