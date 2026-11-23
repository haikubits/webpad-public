// Serialize note mutations so concurrent pages never overwrite unrelated notes.
let operations = Promise.resolve();

function newNote(notes, text = '') {
  let number = 1;
  while (notes.some(note => note.title === `Note ${number}`)) number++;
  return { id: crypto.randomUUID(), title: `Note ${number}`, text };
}

async function readNotebook() {
  const data = await chrome.storage.local.get(['webpadNotebook', 'webpadNote']);
  if (data.webpadNotebook !== undefined) {
    const book = data.webpadNotebook;
    if (!Number.isSafeInteger(book?.revision) || !Array.isArray(book.notes) || !book.notes.length ||
        book.notes.some(note => !note || typeof note.id !== 'string' || !note.id ||
          typeof note.title !== 'string' || typeof note.text !== 'string') ||
        new Set(book.notes.map(note => note.id)).size !== book.notes.length) {
      throw new Error('Saved notes are invalid. No changes were made.');
    }
    return book;
  }
  if (data.webpadNote !== undefined && typeof data.webpadNote?.text !== 'string') {
    throw new Error('The previous note could not be read. No changes were made.');
  }
  const notebook = { revision: 1, notes: [newNote([], data.webpadNote?.text ?? '')] };
  // Keep the old storage key as a migration backup.
  await chrome.storage.local.set({ webpadNotebook: notebook });
  return notebook;
}

async function updateNotebook(message) {
  const notebook = await readNotebook();
  if (message.type === 'webpad:load') return { notebook };
  let selected = notebook.notes.find(note => note.id === message.noteId);
  if (message.type === 'webpad:create') {
    selected = newNote(notebook.notes);
    notebook.notes.push(selected);
  } else {
    if (typeof message.noteId !== 'string' || !message.noteId || message.noteId.length > 100) {
      throw new Error('Invalid note ID.');
    }
    if (!selected) {
      if (message.type !== 'webpad:save' || message.restore !== true) {
        const error = new Error('This note was deleted in another tab.');
        error.code = 'NOTE_DELETED';
        throw error;
      }
      if (typeof message.title !== 'string' || !message.title.trim() || message.title.length > 80) {
        throw new Error('A restored note needs a name of 1 to 80 characters.');
      }
      selected = { id: message.noteId, title: message.title, text: '' };
      notebook.notes.push(selected);
    }
    if (message.type === 'webpad:save') {
      if (typeof message.text !== 'string') throw new Error('Invalid note text.');
      selected.text = message.text;
    } else if (message.type === 'webpad:rename') {
      if (typeof message.title !== 'string' || !message.title.trim() || message.title.trim().length > 80) {
        throw new Error('Note names must contain 1 to 80 characters.');
      }
      selected.title = message.title.trim();
    } else if (message.type === 'webpad:delete') {
      notebook.notes = notebook.notes.filter(note => note.id !== message.noteId);
      if (!notebook.notes.length) notebook.notes.push(newNote([]));
    }
  }
  notebook.revision++;
  await chrome.storage.local.set({ webpadNotebook: notebook });
  return { notebook, noteId: selected.id };
}

chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (sender.id !== chrome.runtime.id ||
      !['webpad:load', 'webpad:create', 'webpad:save', 'webpad:rename', 'webpad:delete'].includes(message?.type)) return;
  operations = operations.then(async () => {
    try {
      respond({ ok: true, ...await updateNotebook(message) });
    } catch (error) {
      console.error('Webpad could not update notes.', error);
      respond({ ok: false, error: error.message, code: error.code });
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
        files: ['vendor/markdown-it.min.js', 'markdown.js', 'content.js']
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
