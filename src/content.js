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
    button, textarea { font: inherit; }
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
    textarea {
      display: block; flex: 1; width: 100%; min-height: 0; margin: 0; border: 0; resize: none; outline: none;
      border-radius: 0; background: transparent; padding: 23px 23px 12px; color: #4b4d40;
      font-size: 14px; line-height: 1.9; letter-spacing: .05px;
    }
    textarea::placeholder { color: #a4a38f; opacity: 1; }
    textarea:focus-visible { box-shadow: inset 0 0 0 2px #b5bd9b; }
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
  const header = element('div', { class: 'header' },
    element('div', { class: 'title', id: 'webpad-title' }, noteIcon(), 'Quick note'),
    element('div', { class: 'actions' }, minimize, close));
  const note = element('textarea', {
    'aria-label': 'Your quick note', placeholder: 'A thought, a link, a little reminder...',
    spellcheck: 'true', disabled: ''
  });
  const statusLabel = element('span', {}, 'Loading note...');
  const retry = element('button', { class: 'text-button', type: 'button', hidden: '' }, 'Retry');
  const status = element('span', { class: 'status', role: 'status' },
    element('span', { class: 'dot', 'aria-hidden': 'true' }), statusLabel, retry);
  const copyLabel = element('span', {}, 'Copy text');
  const copy = element('button', { class: 'copy', type: 'button', disabled: '' },
    icon(['M8 8h12v13H8zM15 8V3H3v13h5']), copyLabel);
  const pad = element('aside', { class: 'pad', 'aria-labelledby': 'webpad-title', hidden: '' },
    header, note, element('div', { class: 'footer' }, status, copy));
  const launcher = element('button', {
    class: 'launcher', type: 'button', 'aria-label': 'Open Webpad notepad', hidden: ''
  }, noteIcon(), 'Quick note');
  const announcement = element('span', { class: 'sr-only', role: 'status' });
  root.append(pad, launcher, announcement);
  document.documentElement.append(host);

  const writer = Array.from(crypto.getRandomValues(new Uint32Array(4)), word => word.toString(16)).join('-');
  let view = 'minimized';
  let loaded = false;
  let dirty = false;
  let revision = 0;
  let copyReset;
  let layoutTimer;
  let drag = null;
  let previousFocus = null;
  let noteChange = 0;
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

  function applyRecord(record) {
    const text = typeof record?.text === 'string' ? record.text : '';
    if (note.value !== text) note.value = text;
    resetCopy();
  }

  async function load() {
    const startNoteChange = noteChange;
    const startViewChange = viewChange;
    try {
      const data = await chrome.storage.local.get(['webpadNote', 'webpadView', 'webpadLayout']);
      if (startNoteChange === noteChange) applyRecord(data.webpadNote);
      loaded = true;
      note.disabled = false;
      resetCopy();
      setStatus('Saved on this device');
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

  async function saveNote() {
    const currentRevision = ++revision;
    dirty = true;
    setStatus('Saving...');
    try {
      const result = await chrome.runtime.sendMessage({ type: 'webpad:save', text: note.value, writer });
      if (!result?.ok) throw new Error(result?.error || 'No save confirmation received.');
      if (currentRevision !== revision) return;
      dirty = false;
      setStatus('Saved on this device');
      // Reconcile a different tab's write that arrived while this save was pending.
      const change = noteChange;
      const data = await chrome.storage.local.get('webpadNote');
      if (currentRevision === revision && change === noteChange && !dirty) {
        applyRecord(data.webpadNote);
        setStatus('Saved on this device');
      }
    } catch (error) {
      console.error('Webpad could not save your note.', error);
      if (currentRevision === revision) {
        dirty = true;
        setStatus('Not saved; retry or copy', true);
      }
    }
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
        note.focus();
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
    resetCopy();
    void saveNote();
  });
  retry.addEventListener('click', () => { void (loaded ? saveNote() : load()); });
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
    clearTimeout(copyReset);
    try {
      await navigator.clipboard.writeText(text);
      announcement.textContent = 'Note copied to clipboard.';
      if (note.value === text) copyLabel.textContent = 'Copied!';
      copyReset = setTimeout(resetCopy, 2000);
    } catch (error) {
      console.warn('Webpad could not access the clipboard.', error);
      note.focus();
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
    if (area !== 'local' || !changes.webpadNote) return;
    noteChange++;
    if (dirty || changes.webpadNote.newValue?.writer === writer) return;
    applyRecord(changes.webpadNote.newValue);
    setStatus('Updated from another tab');
  });
  chrome.runtime.onMessage.addListener((message, sender, respond) => {
    if (sender.id !== chrome.runtime.id || message?.type !== 'webpad:toggle') return;
    changeView(view === 'open' ? 'minimized' : 'open');
    respond({ ok: true });
  });
  void load();
})();
