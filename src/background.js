// Serialize saves across tabs, including writes submitted just before navigation.
let saves = Promise.resolve();

chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (sender.id !== chrome.runtime.id || message?.type !== 'webpad:save') return;
  if (typeof message.text !== 'string' || typeof message.writer !== 'string') {
    respond({ ok: false, error: 'Invalid note data.' });
    return;
  }
  const record = { text: message.text, writer: message.writer };
  saves = saves.then(async () => {
    try {
      await chrome.storage.local.set({ webpadNote: record });
      respond({ ok: true });
    } catch (error) {
      console.error('Webpad could not save the note.', error);
      respond({ ok: false, error: error.message });
    }
  });
  return true;
});

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return;
  try {
    const [context] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => Boolean(globalThis.__webpadMounted)
    });
    if (!context?.result) {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      });
    }
    await chrome.tabs.sendMessage(tab.id, { type: 'webpad:toggle' });
    await chrome.action.setBadgeText({ tabId: tab.id, text: '' });
    await chrome.action.setTitle({ tabId: tab.id, title: 'Show or hide Webpad' });
  } catch (error) {
    console.warn('Webpad is unavailable on this page.', error);
    await chrome.action.setBadgeBackgroundColor({ tabId: tab.id, color: '#a24935' });
    await chrome.action.setBadgeText({ tabId: tab.id, text: '!' });
    await chrome.action.setTitle({
      tabId: tab.id,
      title: 'Webpad cannot run on this page. Open a regular website. For local files, enable "Allow access to file URLs" in extension settings.'
    });
  }
});
