let lastMessageId = null;
let pollInterval = null;

// Initialize on load
chrome.storage.local.get(['token', 'channelId', 'active'], (result) => {
  if (result.active) {
    startPolling();
  }
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'start') {
    startPolling();
  } else if (message.action === 'stop') {
    stopPolling();
  }
});

function startPolling() {
  stopPolling(); // Clear existing
  console.log('Starting Discord polling...');
  // Poll every 3 seconds
  pollInterval = setInterval(checkNewMessages, 3000);
}

function stopPolling() {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
  console.log('Stopped Discord polling.');
}

async function checkNewMessages() {
  const settings = await chrome.storage.local.get(['token', 'channelId', 'active']);
  if (!settings.active || !settings.token || !settings.channelId) return;

  try {
    const response = await fetch(`https://discord.com/api/v10/channels/${settings.channelId}/messages?limit=1`, {
      headers: {
        'Authorization': `Bot ${settings.token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.error('Discord API error:', response.statusText);
      return;
    }

    const messages = await response.json();
    if (messages.length === 0) return;

    const latestMsg = messages[0];

    // Initialize lastMessageId if first run
    if (!lastMessageId) {
      lastMessageId = latestMsg.id;
      return;
    }

    // Check if it's a new message
    if (latestMsg.id !== lastMessageId) {
      lastMessageId = latestMsg.id;
      
      // Basic URL extraction
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const urls = latestMsg.content.match(urlRegex);

      if (urls && urls.length > 0) {
        const targetUrl = urls[0].replace(/[>)\].;,"']+$/, '');
        console.log('Opening link from extension:', targetUrl);
        
        // Open tab
        chrome.tabs.create({ url: targetUrl });
        
        // Notification
        chrome.notifications.create({
          type: 'basic',
          iconUrl: '../icons/icon128.png',
          title: 'Link Opened!',
          message: `Opened link from ${latestMsg.author.username}`
        });
      }
    }
  } catch (err) {
    console.error('Polling error:', err);
  }
}