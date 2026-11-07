const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs/promises');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const browserPath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function waitFor(check, description) {
  for (let i = 0; i < 80; i++) {
    if (await check()) return;
    await sleep(50);
  }
  throw new Error(`Timed out: ${description}`);
}

async function testToolbar() {
  let action;
  const calls = [];
  let mounted = false;
  let blocked = false;
  const chrome = {
    runtime: { onMessage: { addListener() {} } },
    storage: { local: { set: async () => {} } },
    scripting: {
      executeScript: async request => {
        calls.push(request);
        if (blocked) throw new Error('Protected page');
        return [{ result: mounted }];
      }
    },
    tabs: { sendMessage: async (...args) => calls.push(args) },
    action: {
      onClicked: { addListener: listener => { action = listener; } },
      setBadgeText: async value => calls.push(value),
      setBadgeBackgroundColor: async () => {},
      setTitle: async value => calls.push(value)
    }
  };
  vm.runInNewContext(await fs.readFile(path.join(root, 'background.js'), 'utf8'), {
    chrome, console: { warn() {}, error() {} }
  });
  await action({ id: 1 });
  assert(calls.some(call => call.files?.[0] === 'content.js'), 'Toolbar injects into existing tabs');
  calls.length = 0;
  mounted = true;
  await action({ id: 1 });
  assert(!calls.some(call => call.files), 'Toolbar does not inject duplicate UI');
  assert(calls.some(call => Array.isArray(call) && call[1].type === 'webpad:toggle'));
  calls.length = 0;
  blocked = true;
  await action({ id: 2 });
  assert(calls.some(call => call.text === '!'), 'Restricted pages show an error badge');
}

async function main() {
  await testToolbar();
  const manifest = JSON.parse(await fs.readFile(path.join(root, 'manifest.json'), 'utf8'));
  for (const file of Object.values(manifest.icons)) await fs.access(path.join(root, file));
  const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'webpad-test-'));
  const server = http.createServer((request, response) => {
    response.setHeader('Content-Type', 'text/html');
    response.setHeader('Content-Security-Policy', "default-src 'none'; script-src 'none'; style-src 'none'; require-trusted-types-for 'script'");
    response.end('<!doctype html><html><head><title>Webpad test</title></head><body><h1>A regular website</h1><input aria-label="Website input"></body></html>');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const browser = spawn(browserPath, [
    '--headless=new', '--no-first-run', '--no-default-browser-check',
    '--remote-debugging-pipe', '--enable-unsafe-extension-debugging',
    '--host-resolver-rules=MAP webpad.test 127.0.0.1, MAP second.test 127.0.0.1',
    '--no-proxy-server', `--user-data-dir=${profile}`, 'about:blank'
  ], { stdio: ['ignore', 'ignore', 'pipe', 'pipe', 'pipe'] });
  let nextId = 0;
  let buffer = '';
  let browserLog = '';
  const pending = new Map();
  const errors = [];
  browser.stderr.on('data', data => { browserLog += data; });
  browser.on('error', error => {
    for (const request of pending.values()) request.reject(error);
  });
  browser.stdio[4].on('data', data => {
    buffer += data.toString();
    let boundary;
    while ((boundary = buffer.indexOf('\0')) !== -1) {
      const message = JSON.parse(buffer.slice(0, boundary));
      buffer = buffer.slice(boundary + 1);
      if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails);
      if (!message.id) continue;
      const request = pending.get(message.id);
      if (!request) continue;
      pending.delete(message.id);
      clearTimeout(request.timer);
      if (message.error) request.reject(new Error(JSON.stringify(message.error)));
      else request.resolve(message.result);
    }
  });
  function send(method, params = {}, sessionId) {
    return new Promise((resolve, reject) => {
      const id = ++nextId;
      const timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}\n${browserLog}`)); }, 15000);
      pending.set(id, { resolve, reject, timer });
      browser.stdio[3].write(JSON.stringify({ id, method, params, sessionId }) + '\0');
    });
  }
  async function attach(targetId) {
    const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
    const call = (method, params) => send(method, params, sessionId);
    await call('Runtime.enable');
    const evaluate = async expression => {
      const result = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true });
      if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
      return result.result.value;
    };
    return { call, evaluate };
  }
  async function page(url) {
    const { targetId } = await send('Target.createTarget', { url });
    const target = await attach(targetId);
    let shadow;
    await target.call('DOM.enable');
    await waitFor(async () => {
      const { root: document } = await target.call('DOM.getDocument', { depth: -1, pierce: true });
      function find(node) {
        if (node.nodeName === 'WEBPAD-NOTEPAD') return node.shadowRoots?.[0];
        for (const child of node.children || []) {
          const found = find(child);
          if (found) return found;
        }
      }
      shadow = find(document);
      return !!shadow;
    }, 'Extension content script mounted');
    const { object } = await target.call('DOM.resolveNode', { nodeId: shadow.nodeId });
    target.ui = async body => {
      const result = await target.call('Runtime.callFunctionOn', {
        objectId: object.objectId,
        functionDeclaration: `function() {
          const note = this.querySelector('textarea');
          const pad = this.querySelector('.pad');
          const launcher = this.querySelector('.launcher');
          const status = this.querySelector('.status');
          const copy = this.querySelector('.copy');
          ${body}
        }`,
        returnByValue: true, awaitPromise: true, userGesture: true
      });
      if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
      return result.result.value;
    };
    await waitFor(() => target.ui('return !note.disabled;'), 'Note loaded');
    return { ...target, targetId };
  }
  let extensionId;
  try {
    ({ id: extensionId } = await send('Extensions.loadUnpacked', { path: root }));
    console.log(`Loaded unpacked extension: ${extensionId}`);
    const first = await page(`http://webpad.test:${port}/first`);
    assert.equal(await first.evaluate('isSecureContext'), false, 'Test includes plain HTTP');
    assert.equal(await first.ui('return pad.hidden && !launcher.hidden && note.value === "";'), true);
    assert.equal(await first.evaluate('document.querySelector("webpad-notepad").shadowRoot'), null);
    await first.ui('launcher.click();');
    assert.equal(await first.ui('return !pad.hidden && this.activeElement === note;'), true);
    assert.equal(await first.ui('return getComputedStyle(pad).backgroundColor;'), 'rgb(255, 254, 247)');
    await first.ui('note.value = "Draft across websites\\nKeep this for later."; note.dispatchEvent(new Event("input", { bubbles: true }));');
    await waitFor(() => first.ui('return status.textContent.includes("Saved on this device");'), 'Initial save');
    const second = await page(`http://second.test:${port}/second`);
    assert.equal(await second.ui('return note.value;'), 'Draft across websites\nKeep this for later.');
    assert.equal(await second.ui('return !pad.hidden;'), true, 'Open state follows navigation');
    await second.ui('note.value = "Updated from another tab"; note.dispatchEvent(new Event("input", { bubbles: true }));');
    await waitFor(() => first.ui('return note.value === "Updated from another tab";'), 'Cross-origin tab sync');
    await first.ui(`for (let i = 0; i < 30; i++) { note.value = 'Rapid draft ' + i; note.dispatchEvent(new Event('input', { bubbles: true })); }`);
    await waitFor(() => first.ui('return status.textContent.includes("Saved on this device");'), 'Rapid edits saved');
    await waitFor(() => second.ui('return note.value === "Rapid draft 29";'), 'Latest rapid edit wins');
    await first.ui('note.value = ""; note.dispatchEvent(new Event("input", { bubbles: true }));');
    await waitFor(() => second.ui('return note.value === "" && copy.disabled;'), 'Empty notes persist');

    await first.ui('this.querySelector("[aria-label=\\"Minimize notepad\\"]").click();');
    assert.equal(await first.ui('return pad.hidden && !launcher.hidden;'), true);
    await first.ui('launcher.click(); this.querySelector("[aria-label=\\"Close notepad\\"]").click();');
    assert.equal(await first.ui('return pad.hidden && launcher.hidden;'), true);
    const targets = await send('Target.getTargets');
    const workerInfo = targets.targetInfos.find(target => target.type === 'service_worker' && target.url.startsWith(`chrome-extension://${extensionId}/`));
    assert(workerInfo, 'Extension service worker running');
    const worker = await attach(workerInfo.targetId);
    await worker.evaluate(`(async () => {
      const tabs = await chrome.tabs.query({});
      const tab = tabs.find(tab => tab.url?.includes('/first'));
      await chrome.tabs.sendMessage(tab.id, { type: 'webpad:toggle' });
    })()`);
    assert.equal(await first.ui('return !pad.hidden;'), true, 'Toolbar message reopens closed pad');
    await send('Target.activateTarget', { targetId: first.targetId });
    const before = await first.ui('const r = pad.getBoundingClientRect(); return { x: r.left + 90, y: r.top + 25 };');
    await first.call('Input.dispatchMouseEvent', { type: 'mousePressed', x: before.x, y: before.y, button: 'left', clickCount: 1 });
    await first.call('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 190, y: 125, button: 'left', buttons: 1 });
    await first.call('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 190, y: 125, button: 'left', clickCount: 1 });
    assert.equal(await first.ui('return Math.abs(pad.getBoundingClientRect().left - 100) < 2;'), true);
    await first.ui('pad.style.width = "420px"; pad.style.height = "310px";');
    await sleep(350);
    assert.equal(await first.ui('return pad.offsetWidth === 420 && pad.offsetHeight === 310;'), true);
    await first.call('Emulation.setDeviceMetricsOverride', { width: 360, height: 640, deviceScaleFactor: 1, mobile: false });
    await sleep(100);
    const mobileBounds = await first.ui('const r = pad.getBoundingClientRect(); return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: innerWidth, height: innerHeight };');
    assert(mobileBounds.left >= 0 && mobileBounds.top >= 0 && mobileBounds.right <= mobileBounds.width && mobileBounds.bottom <= mobileBounds.height, JSON.stringify(mobileBounds));

    const secure = await page(`http://127.0.0.1:${port}/clipboard`);
    await send('Browser.grantPermissions', { origin: `http://127.0.0.1:${port}`, permissions: ['clipboardReadWrite', 'clipboardSanitizedWrite'] });
    await secure.ui('if (pad.hidden) launcher.click(); note.value = "Copy this note"; note.dispatchEvent(new Event("input", { bubbles: true })); copy.click();');
    await waitFor(() => secure.ui('return copy.textContent.includes("Copied!");'), 'Copy to clipboard');
    assert.equal(await secure.evaluate('navigator.clipboard.readText()'), 'Copy this note');
    await first.ui('note.value = "Manual fallback"; note.dispatchEvent(new Event("input", { bubbles: true })); copy.click();');
    await waitFor(() => first.ui('return copy.textContent.includes("Copy manually") && note.selectionEnd === note.value.length;'), 'Plain HTTP manual clipboard fallback');
    await first.ui('note.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, composed: true }));');
    assert.equal(await first.ui('return pad.hidden && !launcher.hidden;'), true);

    await waitFor(() => first.ui('return status.textContent.includes("Saved on this device");'), 'Final save');
    await worker.evaluate(`globalThis.originalSet = chrome.storage.local.set.bind(chrome.storage.local); chrome.storage.local.set = async () => { throw new Error('Test: storage unavailable'); };`);
    await first.ui('launcher.click(); note.value = "Keep my unsaved draft"; note.dispatchEvent(new Event("input", { bubbles: true }));');
    await waitFor(() => first.ui('return status.classList.contains("error") && !this.querySelector(".text-button").hidden;'), 'Save failure shown with retry');
    await worker.evaluate('chrome.storage.local.set = globalThis.originalSet;');
    await second.ui('note.value = "Other tab while draft is unsaved"; note.dispatchEvent(new Event("input", { bubbles: true }));');
    await waitFor(() => second.ui('return status.textContent.includes("Saved on this device");'), 'Save queue recovers after failure');
    assert.equal(await first.ui('return note.value;'), 'Keep my unsaved draft', 'Remote writes do not discard an unsaved draft');
    await first.ui('this.querySelector(".text-button").click();');
    await waitFor(() => first.ui('return status.textContent.includes("Saved on this device");'), 'Retry saves draft');
    await waitFor(() => second.ui('return note.value === "Keep my unsaved draft";'), 'Retried note syncs across tabs');
    const fresh = await page(`http://webpad.test:${port}/fresh`);
    assert.equal(await fresh.ui('return note.value;'), 'Keep my unsaved draft', 'Saved note survives navigation');
    assert.deepEqual(errors, [], 'No uncaught exceptions in extension/page contexts');
    console.log('PASS: toolbar injection/toggle/restrictions, strict CSP, HTTP, isolated styling, cross-site persistence and live sync, rapid edits, empty notes, minimize/close/reopen, focus, drag/resize, mobile bounds, clipboard, manual fallback, save failure, unsaved draft preservation, and retry recovery.');
  } finally {
    await send('Browser.close').catch(() => {});
    if (browser.exitCode === null) await Promise.race([new Promise(resolve => browser.once('exit', resolve)), sleep(3000)]);
    if (browser.exitCode === null) browser.kill();
    for (const request of pending.values()) clearTimeout(request.timer);
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
    await fs.rm(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 });
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
