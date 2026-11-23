// Serialize note mutations so concurrent pages never overwrite unrelated notes.
let operations = Promise.resolve();
const selectionMenuId = 'webpad-new-note-from-selection';

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
    if (message.text !== undefined && typeof message.text !== 'string') {
      throw new Error('Invalid note text.');
    }
    selected = newNote(notebook.notes, message.text ?? '');
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
  await chrome.storage.local.set({
    webpadNotebook: notebook,
    ...(message.type === 'webpad:create' && message.open === true
      ? { webpadActiveNote: selected.id, webpadView: 'open' } : {})
  });
  return { notebook, noteId: selected.id };
}

function queueNotebook(message) {
  const run = () => updateNotebook(message);
  operations = operations.then(run, run);
  return operations;
}

chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (sender.id !== chrome.runtime.id ||
      !['webpad:load', 'webpad:create', 'webpad:save', 'webpad:rename', 'webpad:delete'].includes(message?.type)) return;
  queueNotebook(message).then(
    result => respond({ ok: true, ...result }),
    error => {
      console.error('Webpad could not update notes.', error);
      respond({ ok: false, error: error.message, code: error.code });
    }
  );
  return true;
});

async function sendToNotepad(tabId, message) {
  const [context] = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => Boolean(globalThis.__webpadMounted)
  });
  if (!context?.result) {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['vendor/markdown-it.min.js', 'markdown.js', 'content.js']
    });
  }
  const result = await chrome.tabs.sendMessage(tabId, message, { frameId: 0 });
  if (!result?.ok) throw new Error(result?.error || 'Webpad did not confirm the action.');
  await chrome.action.setBadgeText({ tabId, text: '' });
  await chrome.action.setTitle({ tabId, title: 'Show or hide Webpad' });
}

async function showTabError(tabId, title) {
  await chrome.action.setBadgeBackgroundColor({ tabId, color: '#a24935' });
  await chrome.action.setBadgeText({ tabId, text: '!' });
  await chrome.action.setTitle({ tabId, title });
}

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return;
  try {
    await sendToNotepad(tab.id, { type: 'webpad:toggle' });
  } catch (error) {
    console.warn('Webpad is unavailable on this page.', error);
    await showTabError(tab.id, 'Webpad cannot run on this page. Open a regular website. For local files, enable "Allow access to file URLs" in extension settings.');
  }
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    if (chrome.runtime.lastError) {
      console.error('Webpad could not reset its context menu.', chrome.runtime.lastError.message);
      return;
    }
    chrome.contextMenus.create({
      id: selectionMenuId,
      title: 'Send selection to Webpad',
      contexts: ['selection'],
      documentUrlPatterns: ['http://*/*', 'https://*/*', 'file://*/*']
    }, () => {
      if (chrome.runtime.lastError) {
        console.error('Webpad could not create its context menu.', chrome.runtime.lastError.message);
      }
    });
  });
});

async function captureSelection(info, tab) {
  if (info.menuItemId !== selectionMenuId) return;
  if (!tab?.id) {
    console.error('Webpad could not capture a selection without a browser tab.');
    return;
  }
  let saved = false;
  try {
    if (typeof info.selectionText !== 'string' || !info.selectionText.length) {
      throw new Error('No selected text was provided.');
    }
    const result = await queueNotebook({
      type: 'webpad:create', text: info.selectionText, open: true
    });
    saved = true;
    await sendToNotepad(tab.id, {
      type: 'webpad:open-note', noteId: result.noteId, notebook: result.notebook
    });
  } catch (error) {
    console.error(saved ? 'Webpad saved the selection but could not display it.' : 'Webpad could not save the selection.', error);
    await showTabError(tab.id, saved
      ? 'Selection saved as a new note. Webpad could not open on this page; open it on a regular website to view the note.'
      : 'Could not save the selection. Please try again; your existing notes are unchanged.');
  }
}

chrome.contextMenus.onClicked.addListener(captureSelection);
