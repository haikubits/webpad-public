(() => {
  if (globalThis.__webpadMounted) return;
  globalThis.__webpadMounted = true;

  const host = document.createElement('webpad-notepad');
  for (const [property, value] of Object.entries({
    all: 'initial', position: 'fixed', top: '0', left: '0',
    width: '0', height: '0', display: 'block', 'z-index': '2147483647',
    'pointer-events': 'none', 'color-scheme': 'light'
  })) host.style.setProperty(property, value, 'important');
  const root = host.attachShadow({ mode: 'closed' });
  const stylesheet = new CSSStyleSheet();
  stylesheet.replaceSync(`
    * { box-sizing: border-box; }
    [hidden] { display: none !important; }
    button, textarea, input { font: inherit; }
    button { cursor: pointer; }
    button:focus-visible { outline: 3px solid #6d947f; outline-offset: 3px; }
    button:disabled { cursor: default; opacity: .4; }
    svg { width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; flex-shrink: 0; }
    .pad, .launcher {
      position: fixed; pointer-events: auto; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      font-size: 14px; line-height: 1.5; font-weight: 400; letter-spacing: normal;
      text-align: left; direction: ltr; color: #4b4d40; color-scheme: light;
    }
    .pad {
      right: 28px; bottom: 28px; width: 370px; height: 390px;
      min-width: min(280px, calc(100vw - 24px)); min-height: min(240px, calc(100dvh - 24px));
      max-width: calc(100vw - 24px); max-height: calc(100dvh - 24px);
      display: flex; flex-direction: column; overflow: hidden; resize: both;
      border: 1px solid #dcdac6; border-radius: 13px; background: #fffef7;
      box-shadow: 0 20px 70px #26352521, 0 3px 12px #2635250a;
    }
    .header {
      flex-shrink: 0; display: flex; align-items: center; justify-content: space-between;
      gap: 10px; padding: 13px 14px 13px 19px; background: #f6f1d8;
      border-bottom: 1px solid #e8e2c6; cursor: grab; touch-action: none; user-select: none;
    }
    .header:active { cursor: grabbing; }
    .title { display: flex; align-items: center; gap: 9px; font-size: 13px; font-weight: 600; color: #514d35; }
    .title svg { width: 17px; height: 17px; color: #8d8150; }
    .actions { display: flex; gap: 4px; }
    .icon-button { display: grid; place-items: center; width: 28px; height: 28px; padding: 0; border: 0; border-radius: 5px; background: transparent; color: #8c866b; }
    .icon-button:hover { background: #e9e2c1; color: #514d35; }
    .preview-toggle { align-self: center; padding: 5px 8px; border: 1px solid #ded6b7; border-radius: 5px; background: transparent; color: #666044; font-size: 11px; line-height: 1.5; }
    .preview-toggle:hover:not(:disabled), .preview-toggle[aria-pressed="true"] { background: #e9e2c1; }
    .note-bar { display: flex; align-items: center; gap: 3px; flex-shrink: 0; padding: 6px 9px; border-bottom: 1px solid #ecebdc; }
    .note-tabs { display: flex; flex: 1; min-width: 0; gap: 4px; overflow-x: auto; scrollbar-width: thin; padding: 3px; }
    .note-tab { flex-shrink: 0; max-width: 140px; padding: 5px 9px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; border: 1px solid transparent; border-radius: 6px; color: #858673; background: transparent; font-size: 11px; }
    .note-tab:hover { background: #f3f1df; }
    .note-tab[aria-selected="true"] { color: #514d35; background: #f3f1df; border-color: #e4dfc5; }
    .note-form { display: flex; align-items: center; flex-shrink: 0; gap: 7px; padding: 8px 12px; border-bottom: 1px solid #ecebdc; font-size: 11px; }
    .note-form input { width: 0; flex: 1; min-width: 0; padding: 6px 8px; border: 1px solid #dedecb; border-radius: 5px; background: #fffef8; color: #514d35; }
    .note-form button { padding: 5px 7px; border: 1px solid #dedecb; border-radius: 5px; background: #f3f1df; color: #66684f; font-size: 11px; }
    .note-form .confirm-delete { color: #a24935; }
    .note-form span { flex: 1; }
    .editor { display: flex; flex-direction: column; flex: 1; min-height: 0; }
    textarea {
      display: block; flex: 1; width: 100%; min-height: 0; margin: 0; border: 0; resize: none; outline: none;
      border-radius: 0; background: transparent; padding: 23px 23px 12px; color: #4b4d40;
      font-size: 14px; line-height: 1.9; letter-spacing: .05px;
    }
    textarea::placeholder { color: #a4a38f; opacity: 1; }
    textarea:focus-visible { box-shadow: inset 0 0 0 2px #b5bd9b; }
    .preview { flex: 1; min-height: 0; overflow: auto; padding: 19px 23px 12px; font: inherit; line-height: 1.75; overflow-wrap: anywhere; }
    .preview:focus-visible { outline: none; box-shadow: inset 0 0 0 2px #b5bd9b; }
    .preview > :first-child { margin-top: 0; }
    .preview > :last-child { margin-bottom: 0; }
    .preview p { margin: 0 0 12px; }
    .preview h1, .preview h2, .preview h3, .preview h4, .preview h5, .preview h6 { margin: 18px 0 10px; line-height: 1.3; color: #514d35; font-weight: 650; }
    .preview h1 { font-size: 24px; }
    .preview h2 { font-size: 20px; }
    .preview h3 { font-size: 17px; }
    .preview h4, .preview h5, .preview h6 { font-size: 14px; }
    .preview ul, .preview ol { margin: 0 0 12px; padding-left: 23px; }
    .preview li > p { margin-bottom: 6px; }
    .preview a { color: #355747; text-decoration: underline; }
    .preview blockquote { margin: 0 0 12px; border-left: 3px solid #d7d1ad; padding-left: 12px; color: #7b7b66; }
    .preview code { font-family: Consolas, "Courier New", monospace; font-size: 12px; background: #f2efde; border-radius: 3px; padding: 2px 4px; }
    .preview pre { margin: 0 0 12px; padding: 10px 12px; overflow: auto; background: #f2efde; border-radius: 6px; line-height: 1.6; }
    .preview pre code { padding: 0; background: transparent; }
    .preview hr { margin: 16px 0; border: 0; border-top: 1px solid #dedecb; }
    .preview table { width: 100%; margin-bottom: 12px; border-collapse: collapse; font-size: 12px; }
    .preview th, .preview td { padding: 6px 8px; border: 1px solid #dedecb; }
    .preview th { background: #f2efde; font-weight: 600; }
    .preview-empty, .markdown-image { color: #858673; }
    .footer { flex-shrink: 0; display: flex; align-items: center; justify-content: space-between; gap: 8px; margin: 0 19px; padding: 13px 0 16px; border-top: 1px solid #ecebdc; }
    .status { display: flex; align-items: center; gap: 6px; color: #858673; font-size: 10px; }
    .dot { width: 5px; height: 5px; border-radius: 50%; background: #8b9b75; flex-shrink: 0; }
    .status.error { color: #a24935; }
    .status.error .dot { background: #a24935; }
    .text-button { padding: 0; border: 0; background: transparent; color: #a24935; font-size: 10px; text-decoration: underline; }
    .copy { display: flex; align-items: center; gap: 6px; padding: 7px 10px; border: 1px solid #dedecb; border-radius: 6px; background: #fffef8; color: #66684f; font-size: 11px; white-space: nowrap; }
    .copy:hover:not(:disabled) { background: #f3f1df; }
    .copy svg { width: 13px; height: 13px; }
    .launcher {
      right: 20px; bottom: 20px; display: flex; align-items: center; gap: 9px; padding: 12px 16px;
      max-width: calc(100vw - 24px); border: 1px solid #e1d9b6; border-radius: 12px;
      background: #f6f1d8; color: #514d35; font-size: 13px; box-shadow: 0 6px 24px #26352518;
    }
    .launcher:hover { background: #eee7c5; }
    .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; border: 0; }
    @media (max-width: 480px) { .pad { right: 12px; bottom: 12px; } .launcher { right: 12px; bottom: 12px; } }
  `);
  root.adoptedStyleSheets = [stylesheet];

  function element(tag, attributes = {}, ...children) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
    node.append(...children);
    return node;
  }

  function icon(paths) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    for (const d of paths) {
      const path = document.createElementNS(svg.namespaceURI, 'path');
      path.setAttribute('d', d);
      svg.append(path);
    }
    return svg;
  }

  const noteIcon = () => icon(['M5 4h14v12l-4 4H5z', 'M15 20v-4h4M9 8h6M9 12h5']);
  const minimize = element('button', { type: 'button', class: 'icon-button', 'aria-label': 'Minimize notepad', title: 'Minimize' }, icon(['M6 12h12']));
  const close = element('button', { type: 'button', class: 'icon-button', 'aria-label': 'Close notepad', title: 'Close; reopen with the Webpad toolbar button' }, icon(['m7 7 10 10M17 7 7 17']));
  const previewToggle = element('button', {
    type: 'button', class: 'preview-toggle', 'aria-label': 'Markdown preview',
    'aria-pressed': 'false', 'aria-controls': 'webpad-preview', title: 'Preview Markdown', disabled: ''
  }, 'Preview');
  const header = element('div', { class: 'header' },
    element('div', { class: 'title', id: 'webpad-title' }, noteIcon(), 'Quick note'),
    element('div', { class: 'actions' }, previewToggle, minimize, close));
  const note = element('textarea', {
    'aria-label': 'Your quick note', placeholder: 'A thought, a link, a little reminder...',
    spellcheck: 'true', disabled: ''
  });
  const preview = element('div', {
    class: 'preview', id: 'webpad-preview', role: 'region',
    'aria-label': 'Rendered Markdown', tabindex: '0', hidden: ''
  });
  const tabs = element('div', { class: 'note-tabs', role: 'tablist', 'aria-label': 'Notes' });
  const addNote = element('button', {
    type: 'button', class: 'icon-button add-note', 'aria-label': 'New note', title: 'New note', disabled: ''
  }, icon(['M12 5v14M5 12h14']));
  const renameNote = element('button', {
    type: 'button', class: 'icon-button rename-note', 'aria-label': 'Rename note', title: 'Rename note', disabled: ''
  }, icon(['m14 4 6 6M4 20l5-1L20 8l-4-4L5 15z']));
  const deleteNote = element('button', {
    type: 'button', class: 'icon-button delete-note', 'aria-label': 'Delete note', title: 'Delete note', disabled: ''
  }, icon(['M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v5M14 11v5']));
  const noteAction = element('form', { class: 'note-form', hidden: '' });
  const editor = element('div', { class: 'editor', id: 'webpad-editor', role: 'tabpanel' }, note, preview);
  const statusLabel = element('span', {}, 'Loading note...');
  const retry = element('button', { class: 'text-button', type: 'button', hidden: '' }, 'Retry');
  const status = element('span', { class: 'status', role: 'status' },
    element('span', { class: 'dot', 'aria-hidden': 'true' }), statusLabel, retry);
  const copyLabel = element('span', {}, 'Copy text');
  const copy = element('button', { class: 'copy', type: 'button', disabled: '' },
    icon(['M8 8h12v13H8zM15 8V3H3v13h5']), copyLabel);
  const pad = element('aside', { class: 'pad', 'aria-labelledby': 'webpad-title', hidden: '' },
    header, element('div', { class: 'note-bar' }, tabs, addNote, renameNote, deleteNote),
    noteAction, editor, element('div', { class: 'footer' }, status, copy));
  const launcher = element('button', {
    class: 'launcher', type: 'button', 'aria-label': 'Open Webpad notepad', hidden: ''
  }, noteIcon(), 'Quick note');
  const announcement = element('span', { class: 'sr-only', role: 'status' });
  root.append(pad, launcher, announcement);
  document.documentElement.append(host);

  let view = 'minimized';
  let previewing = false;
  let loaded = false;
  let notebook = { revision: 0, notes: [] };
  let activeId = null;
  const drafts = new Map();
  let busy = false;
  let managementDone = Promise.resolve();
  let failedOperation = null;
  let tabsSignature = '';
  let copyReset;
  let layoutTimer;
  let drag = null;
  let previousFocus = null;
  let viewChange = 0;

  function setStatus(text, error = false) {
    statusLabel.textContent = text;
    status.classList.toggle('error', error);
    retry.hidden = !error;
  }

  function resetCopy() {
    clearTimeout(copyReset);
    copyLabel.textContent = 'Copy text';
    copy.disabled = note.disabled || note.value.length === 0;
  }

  function renderPreview() {
    try {
      preview.replaceChildren(note.value.trim()
        ? globalThis.webpadRenderMarkdown(note.value)
        : element('p', { class: 'preview-empty' }, 'Nothing to preview yet.'));
    } catch (error) {
      console.error('Webpad could not render Markdown.', error);
      preview.replaceChildren(element('p', { role: 'alert' }, 'Could not render Markdown. Switch to Edit to view your text.'));
    }
  }

  function setPreview(next, focus = true) {
    previewing = next;
    note.hidden = next;
    preview.hidden = !next;
    previewToggle.textContent = next ? 'Edit' : 'Preview';
    previewToggle.setAttribute('aria-pressed', String(next));
    previewToggle.title = next ? 'Edit Markdown source' : 'Preview Markdown';
    if (next) renderPreview();
    if (focus) (next ? preview : note).focus();
  }

  function visibleNotes() {
    return [...notebook.notes, ...Array.from(drafts, ([id, draft]) => ({
      id, title: draft.title, text: draft.text
    })).filter(draft => !notebook.notes.some(saved => saved.id === draft.id))];
  }

  function renderTabs() {
    const entries = visibleNotes();
    const signature = JSON.stringify([activeId, entries.map(entry => [
      entry.id, entry.title, drafts.get(entry.id)?.error ?? drafts.has(entry.id)
    ])]);
    if (signature !== tabsSignature) {
      const focusedId = root.activeElement?.getAttribute('data-note-id');
      tabs.replaceChildren(...entries.map(entry => {
        const draft = drafts.get(entry.id);
        const tab = element('button', {
          type: 'button', class: 'note-tab', role: 'tab', id: `webpad-tab-${entry.id}`,
          'data-note-id': entry.id, 'aria-selected': String(entry.id === activeId),
          'aria-controls': 'webpad-editor', tabindex: entry.id === activeId ? '0' : '-1',
          title: entry.title + (draft ? ` (${draft.error || 'Saving...'})` : '')
        }, entry.title + (draft ? ' *' : ''));
        tab.addEventListener('click', () => selectNote(entry.id));
        return tab;
      }));
      Array.from(tabs.children).find(tab => tab.dataset.noteId === focusedId)?.focus();
      tabsSignature = signature;
    }
    for (const tab of tabs.children) tab.disabled = busy || !loaded;
  }

  function renderStatus() {
    const draft = drafts.get(activeId);
    if (failedOperation) setStatus(failedOperation.message, true);
    else if (draft?.error) setStatus(draft.error, true);
    else setStatus(draft ? 'Saving...' : 'Saved on this device');
    retry.disabled = busy || Boolean(draft?.pending);
  }

  function refreshEditor() {
    if (!loaded) return;
    const entries = visibleNotes();
    if (!entries.some(entry => entry.id === activeId)) {
      activeId = entries[0].id;
      noteAction.hidden = true;
      void savePreference('webpadActiveNote', activeId);
    }
    const entry = entries.find(entry => entry.id === activeId);
    const text = drafts.get(activeId)?.text ?? entry.text;
    if (note.value !== text) {
      note.value = text;
      if (previewing) renderPreview();
      resetCopy();
    }
    note.setAttribute('aria-label', `Note: ${entry.title}`);
    editor.setAttribute('aria-labelledby', `webpad-tab-${activeId}`);
    note.disabled = busy;
    previewToggle.disabled = busy;
    addNote.disabled = busy;
    renameNote.disabled = busy || !notebook.notes.some(saved => saved.id === activeId);
    deleteNote.disabled = busy;
    for (const control of noteAction.elements) control.disabled = busy;
    renderTabs();
    renderStatus();
  }

  function receiveNotebook(next) {
    if (next.revision <= notebook.revision) return;
    notebook = next;
    for (const [id, draft] of drafts) {
      if (!notebook.notes.some(entry => entry.id === id)) {
        draft.error = 'Deleted elsewhere; retry to restore';
      }
    }
    refreshEditor();
  }

  function selectNote(id, focusEditor = true) {
    if (busy || !visibleNotes().some(entry => entry.id === id)) return;
    activeId = id;
    failedOperation = null;
    noteAction.hidden = true;
    resetCopy();
    refreshEditor();
    void savePreference('webpadActiveNote', id);
    if (focusEditor) (previewing ? preview : note).focus();
    else Array.from(tabs.children).find(tab => tab.dataset.noteId === id)?.focus();
  }

  async function command(type, fields = {}) {
    const result = await chrome.runtime.sendMessage({ type: `webpad:${type}`, ...fields });
    if (!result?.ok) {
      const error = new Error(result?.error || 'No confirmation received.');
      error.code = result?.code;
      throw error;
    }
    return result;
  }

  async function load() {
    const startViewChange = viewChange;
    try {
      const [result, data] = await Promise.all([
        command('load'),
        chrome.storage.local.get(['webpadActiveNote', 'webpadView', 'webpadLayout'])
      ]);
      receiveNotebook(result.notebook);
      activeId = notebook.notes.some(entry => entry.id === data.webpadActiveNote)
        ? data.webpadActiveNote : notebook.notes[0].id;
      loaded = true;
      refreshEditor();
      resetCopy();
      if (startViewChange === viewChange) {
        setView(['open', 'minimized', 'closed'].includes(data.webpadView) ? data.webpadView : 'minimized');
      }
      const layout = data.webpadLayout;
      if (layout && [layout.left, layout.top, layout.width, layout.height].every(Number.isFinite)) {
        pad.style.width = `${Math.max(280, layout.width)}px`;
        pad.style.height = `${Math.max(240, layout.height)}px`;
        positionPad(layout.left, layout.top);
      }
      keepInViewport();
    } catch (error) {
      console.error('Webpad could not load your note.', error);
      setStatus('Could not load note', true);
      setView('open');
    }
  }

  async function saveNote(id = activeId, restore = false) {
    const draft = drafts.get(id);
    if (!draft) return;
    draft.pending = true;
    draft.error = null;
    renderStatus();
    try {
      const result = await command('save', { noteId: id, text: draft.text, title: draft.title, restore });
      if (drafts.get(id) === draft) drafts.delete(id);
      receiveNotebook(result.notebook);
      refreshEditor();
    } catch (error) {
      console.error('Webpad could not save your note.', error);
      if (drafts.get(id) === draft) {
        draft.pending = false;
        draft.error = error.code === 'NOTE_DELETED'
          ? 'Deleted elsewhere; retry to restore' : 'Not saved; retry or copy';
        refreshEditor();
      }
    }
  }

  function manageNote(type, fields = {}) {
    if (busy) return managementDone;
    managementDone = performNoteAction(type, fields);
    return managementDone;
  }

  async function performNoteAction(type, fields) {
    busy = true;
    failedOperation = null;
    let appendedDraft;
    if (type === 'append') {
      const entry = visibleNotes().find(item => item.id === fields.noteId);
      const base = drafts.get(fields.noteId)?.text ?? entry.text;
      appendedDraft = { text: base + (base ? '\n\n' : '') + fields.text, title: entry.title, pending: true, error: null };
      drafts.set(fields.noteId, appendedDraft);
    }
    refreshEditor();
    try {
      let result;
      if (type === 'delete' && !notebook.notes.some(entry => entry.id === fields.noteId)) {
        drafts.delete(fields.noteId);
      } else {
        result = await command(type, fields);
        if (type === 'delete') drafts.delete(fields.noteId);
        if (type === 'append' && drafts.get(fields.noteId) === appendedDraft) drafts.delete(fields.noteId);
        receiveNotebook(result.notebook);
      }
      noteAction.hidden = true;
      if (type === 'create') {
        activeId = result.noteId;
        setPreview(false, false);
        void savePreference('webpadActiveNote', activeId);
      }
      return { ok: true };
    } catch (error) {
      console.error(`Webpad could not ${type} the note.`, error);
      if (appendedDraft) {
        appendedDraft.pending = false;
        appendedDraft.error = error.code === 'NOTE_DELETED'
          ? 'Deleted elsewhere; retry to restore' : 'Not saved; retry or copy';
      } else {
        failedOperation = {
          message: `Could not ${type} note`,
          retry: () => { void manageNote(type, fields); }
        };
      }
      announcement.textContent = error.message;
      return { ok: false, error: error.message, retained: Boolean(appendedDraft) };
    } finally {
      busy = false;
      refreshEditor();
      resetCopy();
      if (!failedOperation) (previewing ? preview : note).focus();
    }
  }

  function showNoteAction(type) {
    const id = activeId;
    const entry = visibleNotes().find(item => item.id === id);
    const cancel = element('button', { type: 'button', class: 'cancel-note-action' }, 'Cancel');
    cancel.addEventListener('click', () => {
      noteAction.hidden = true;
      (previewing ? preview : note).focus();
    });
    noteAction.replaceChildren();
    if (type === 'rename') {
      const name = element('input', { type: 'text', 'aria-label': 'Note name', maxlength: '80', required: '' });
      name.value = entry.title;
      noteAction.append(name, element('button', { type: 'submit' }, 'Save'), cancel);
    } else {
      noteAction.append(element('span', {}, 'Delete this note?'),
        element('button', { type: 'submit', class: 'confirm-delete' }, 'Delete'), cancel);
    }
    noteAction.onsubmit = event => {
      event.preventDefault();
      event.stopPropagation();
      const name = noteAction.querySelector('input');
      if (name && !name.value.trim()) {
        name.setCustomValidity('Enter a note name.');
        name.reportValidity();
        return;
      }
      void manageNote(type, { noteId: id, ...(name ? { title: name.value.trim() } : {}) });
    };
    noteAction.hidden = false;
    const name = noteAction.querySelector('input');
    if (name) { name.focus(); name.select(); }
    else cancel.focus();
  }

  async function savePreference(key, value) {
    try {
      await chrome.storage.local.set({ [key]: value });
    } catch (error) {
      console.error('Webpad could not save its layout preference.', error);
      announcement.textContent = 'Could not save your notepad layout. Your text is unchanged.';
      launcher.title = 'Could not save layout. Your text is unchanged.';
    }
  }

  function setView(next, focus = false) {
    view = next;
    pad.hidden = next !== 'open';
    launcher.hidden = next !== 'minimized';
    if (next === 'open') {
      keepInViewport();
      if (focus) {
        previousFocus = document.activeElement;
        (previewing ? preview : note).focus();
      }
    } else if (focus) {
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected && previousFocus !== host) previousFocus.focus();
      if (next === 'minimized') launcher.focus();
    }
  }

  function changeView(next) {
    viewChange++;
    setView(next, true);
    void savePreference('webpadView', next);
  }

  note.addEventListener('input', () => {
    if (!activeId || !loaded) return;
    failedOperation = null;
    drafts.set(activeId, {
      text: note.value, title: visibleNotes().find(entry => entry.id === activeId).title,
      pending: false, error: null
    });
    resetCopy();
    if (previewing) renderPreview();
    void saveNote();
  });
  addNote.addEventListener('click', () => { void manageNote('create'); });
  renameNote.addEventListener('click', () => showNoteAction('rename'));
  deleteNote.addEventListener('click', () => showNoteAction('delete'));
  noteAction.addEventListener('input', event => event.target.setCustomValidity?.(''));
  noteAction.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      event.preventDefault();
      noteAction.hidden = true;
      (previewing ? preview : note).focus();
      event.stopPropagation();
    }
  });
  tabs.addEventListener('keydown', event => {
    const entries = visibleNotes();
    const index = entries.findIndex(entry => entry.id === activeId);
    let next;
    if (event.key === 'ArrowRight') next = (index + 1) % entries.length;
    if (event.key === 'ArrowLeft') next = (index + entries.length - 1) % entries.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = entries.length - 1;
    if (next !== undefined) {
      event.preventDefault();
      event.stopPropagation();
      selectNote(entries[next].id, false);
    }
  });
  previewToggle.addEventListener('click', () => setPreview(!previewing));
  retry.addEventListener('click', () => {
    if (!loaded) void load();
    else if (failedOperation) failedOperation.retry();
    else void saveNote(activeId, !notebook.notes.some(entry => entry.id === activeId));
  });
  launcher.addEventListener('click', () => changeView('open'));
  minimize.addEventListener('click', () => changeView('minimized'));
  close.addEventListener('click', () => changeView('closed'));
  root.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && view === 'open') {
      event.preventDefault();
      changeView('minimized');
    }
    event.stopPropagation();
  });
  for (const type of ['keyup', 'keypress', 'input', 'beforeinput', 'paste', 'copy', 'cut', 'pointerdown', 'click']) {
    root.addEventListener(type, event => event.stopPropagation());
  }

  copy.addEventListener('click', async () => {
    const text = note.value;
    const copiedId = activeId;
    clearTimeout(copyReset);
    try {
      await navigator.clipboard.writeText(text);
      announcement.textContent = 'Note copied to clipboard.';
      if (activeId === copiedId && note.value === text) {
        copyLabel.textContent = 'Copied!';
        copyReset = setTimeout(resetCopy, 2000);
      }
    } catch (error) {
      console.warn('Webpad could not access the clipboard.', error);
      if (activeId !== copiedId || note.value !== text) {
        announcement.textContent = 'Clipboard unavailable. Return to the note and copy it manually.';
        return;
      }
      setPreview(false);
      note.select();
      copyLabel.textContent = 'Copy manually';
      announcement.textContent = 'Text selected. Press Control+C or Command+C to copy.';
      copyReset = setTimeout(resetCopy, 4000);
    }
  });

  function positionPad(left, top) {
    const width = pad.hidden ? Math.min(parseFloat(pad.style.width) || 370, innerWidth - 24) : pad.offsetWidth;
    const height = pad.hidden ? Math.min(parseFloat(pad.style.height) || 390, innerHeight - 24) : pad.offsetHeight;
    pad.style.left = `${Math.max(12, Math.min(left, innerWidth - width - 12))}px`;
    pad.style.top = `${Math.max(12, Math.min(top, innerHeight - height - 12))}px`;
    pad.style.right = 'auto';
    pad.style.bottom = 'auto';
  }

  function keepInViewport() {
    if (pad.hidden) return;
    const bounds = pad.getBoundingClientRect();
    positionPad(bounds.left, bounds.top);
  }

  function rememberLayout() {
    if (pad.hidden || !loaded) return;
    clearTimeout(layoutTimer);
    layoutTimer = setTimeout(() => {
      if (pad.hidden) return;
      const bounds = pad.getBoundingClientRect();
      void savePreference('webpadLayout', {
        left: bounds.left, top: bounds.top, width: bounds.width, height: bounds.height
      });
    }, 200);
  }

  header.addEventListener('pointerdown', (event) => {
    if (event.target.closest('button') || event.button !== 0) return;
    const bounds = pad.getBoundingClientRect();
    drag = { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
    header.setPointerCapture(event.pointerId);
  });
  header.addEventListener('pointermove', (event) => {
    if (drag) positionPad(event.clientX - drag.x, event.clientY - drag.y);
  });
  function endDrag() {
    if (drag) rememberLayout();
    drag = null;
  }
  header.addEventListener('pointerup', endDrag);
  header.addEventListener('pointercancel', endDrag);
  header.addEventListener('lostpointercapture', endDrag);
  window.addEventListener('resize', keepInViewport);
  new ResizeObserver(() => { keepInViewport(); rememberLayout(); }).observe(pad);

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !changes.webpadNotebook?.newValue) return;
    receiveNotebook(changes.webpadNotebook.newValue);
  });
  chrome.runtime.onMessage.addListener((message, sender, respond) => {
    if (sender.id !== chrome.runtime.id) return;
    if (message?.type === 'webpad:toggle') {
      changeView(view === 'open' ? 'minimized' : 'open');
      respond({ ok: true });
    } else if (['webpad:open-note', 'webpad:append-selection'].includes(message?.type)) {
      handleCapturedSelection(message).then(
        result => respond(result),
        error => {
          console.error('Webpad could not open the captured note.', error);
          respond({ ok: false, error: error.message });
        }
      );
      return true;
    }
  });

  async function handleCapturedSelection(message) {
    await ready;
    while (busy) await managementDone;
    if (!loaded) throw new Error('The saved notes could not be loaded.');
    if (message.type === 'webpad:append-selection') {
      if (typeof message.text !== 'string' || !message.text.length) throw new Error('No selected text was provided.');
      const draft = drafts.get(activeId);
      noteAction.hidden = true;
      setPreview(false, false);
      changeView('open');
      return manageNote('append', {
        noteId: activeId, text: message.text, open: true,
        ...(draft ? { baseText: draft.text } : {})
      });
    }
    receiveNotebook(message.notebook);
    if (!notebook.notes.some(entry => entry.id === message.noteId)) {
      throw new Error('The captured note is no longer available.');
    }
    setPreview(false, false);
    selectNote(message.noteId);
    changeView('open');
    return { ok: true };
  }

  const ready = load();
})();
