// Serialize note mutations so concurrent pages never overwrite unrelated notes.
let operations = Promise.resolve();
const selectionMenuId = 'webpad-new-note-from-selection';
const currentNoteMenuId = 'webpad-append-selection';

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
  let noteId = message.noteId;
  if (message.type === 'webpad:append' && noteId === undefined) {
    const { webpadActiveNote } = await chrome.storage.local.get(['webpadActiveNote']);
    noteId = notebook.notes.some(note => note.id === webpadActiveNote)
      ? webpadActiveNote : notebook.notes[0].id;
  }
  let selected = notebook.notes.find(note => note.id === noteId);
  if (message.type === 'webpad:create') {
    if (message.text !== undefined && typeof message.text !== 'string') {
      throw new Error('Invalid note text.');
    }
    selected = newNote(notebook.notes, message.text ?? '');
    notebook.notes.push(selected);
  } else {
    if (typeof noteId !== 'string' || !noteId || noteId.length > 100) {
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
      selected = { id: noteId, title: message.title, text: '' };
      notebook.notes.push(selected);
    }
    if (message.type === 'webpad:save') {
      if (typeof message.text !== 'string') throw new Error('Invalid note text.');
      selected.text = message.text;
    } else if (message.type === 'webpad:append') {
      if (typeof message.text !== 'string' || !message.text.length ||
          (message.baseText !== undefined && typeof message.baseText !== 'string')) {
        throw new Error('Invalid selection text.');
      }
      const base = message.baseText ?? selected.text;
      selected.text = base + (base ? '\n\n' : '') + message.text;
    } else if (message.type === 'webpad:rename') {
      if (typeof message.title !== 'string' || !message.title.trim() || message.title.trim().length > 80) {
        throw new Error('Note names must contain 1 to 80 characters.');
      }
      selected.title = message.title.trim();
    } else if (message.type === 'webpad:delete') {
      notebook.notes = notebook.notes.filter(note => note.id !== noteId);
      if (!notebook.notes.length) notebook.notes.push(newNote([]));
    }
  }
  notebook.revision++;
  await chrome.storage.local.set({
    webpadNotebook: notebook,
    ...(['webpad:create', 'webpad:append'].includes(message.type) && message.open === true
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
      !['webpad:load', 'webpad:create', 'webpad:save', 'webpad:append', 'webpad:rename', 'webpad:delete'].includes(message?.type)) return;
  queueNotebook(message).then(
    result => respond({ ok: true, ...result }),
    error => {
      console.error('Webpad could not update notes.', error);
      respond({ ok: false, error: error.message, code: error.code });
    }
  );
  return true;
});

async function ensureNotepad(tabId) {
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
}

async function sendToNotepad(tabId, message) {
  await ensureNotepad(tabId);
  await deliverToNotepad(tabId, message);
}

async function deliverToNotepad(tabId, message) {
  const result = await chrome.tabs.sendMessage(tabId, message, { frameId: 0 });
  if (!result?.ok) {
    const error = new Error(result?.error || 'Webpad did not confirm the action. Check the note before retrying.');
    error.retained = result?.retained === true;
    throw error;
  }
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
    const parentId = 'webpad-send-selection';
    for (const item of [
      { id: parentId, title: 'Send to Webpad' },
      { id: currentNoteMenuId, parentId, title: 'Current note' },
      { id: selectionMenuId, parentId, title: 'New note' }
    ]) {
      chrome.contextMenus.create({
        ...item,
        contexts: ['selection'],
        documentUrlPatterns: ['http://*/*', 'https://*/*', 'file://*/*']
      }, () => {
        if (chrome.runtime.lastError) {
          console.error('Webpad could not create its context menu.', chrome.runtime.lastError.message);
        }
      });
    }
  });
});

async function captureSelection(info, tab) {
  if (![selectionMenuId, currentNoteMenuId].includes(info.menuItemId)) return;
  if (!tab?.id) {
    console.error('Webpad could not capture a selection without a browser tab.');
    return;
  }
  let saved = false;
  let currentNoteRequestSent = false;
  const append = info.menuItemId === currentNoteMenuId;
  try {
    if (typeof info.selectionText !== 'string' || !info.selectionText.length) {
      throw new Error('No selected text was provided.');
    }
    if (append) {
      let available = false;
      try {
        await ensureNotepad(tab.id);
        available = true;
      } catch (error) {
        console.warn('Webpad cannot display here; appending to the last selected saved note.', error);
      }
      if (available) {
        currentNoteRequestSent = true;
        await deliverToNotepad(tab.id, { type: 'webpad:append-selection', text: info.selectionText });
        return;
      }
    }
    const result = await queueNotebook({
      type: append ? 'webpad:append' : 'webpad:create', text: info.selectionText, open: true
    });
    saved = true;
    if (append) {
      await showTabError(tab.id, 'Selection appended to the last selected note. Webpad cannot open on this page; open it on a regular website to view the note.');
      return;
    }
    await sendToNotepad(tab.id, {
      type: 'webpad:open-note', noteId: result.noteId, notebook: result.notebook
    });
  } catch (error) {
    console.error(saved ? 'Webpad saved the selection but could not display it.' : 'Webpad could not save the selection.', error);
    let title = 'Could not save the selection. Please try again; your existing notes are unchanged.';
    if (saved) {
      title = 'Selection saved as a new note. Webpad could not open on this page; open it on a regular website to view the note.';
    } else if (error.retained) {
      title = 'Could not save the selection. Appended text is kept as an unsaved draft in Webpad; use Retry or copy it.';
    } else if (currentNoteRequestSent) {
      title = 'Could not confirm the append. Check the current note in Webpad before retrying.';
    }
    await showTabError(tab.id, title);
  }
}

chrome.contextMenus.onClicked.addListener(captureSelection);
