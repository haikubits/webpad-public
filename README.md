# Webpad

A lightweight Chrome extension with a floating notepad, based on the `index.html` design preview. No build step, dependencies, account, or server.

## Install

1. Open `chrome://extensions` in Chrome.
2. Turn on **Developer mode**.
3. Click **Load unpacked** and select this `webpad` folder.
4. Pin **Webpad - Floating Notepad** using Chrome's Extensions menu.
5. Visit a website and click **Quick note**, or click Webpad's toolbar icon. For tabs already open during installation, click the toolbar icon or refresh the page.

## Use

- Write in the floating pad. Text saves automatically to this Chrome profile and follows you across websites, tabs, and browser restarts.
- Drag the header to move it; drag its bottom-right corner to resize it. Position and size are remembered and kept inside the viewport.
- Click **Copy text** to copy everything. If the page prevents clipboard access, the text is selected for manual copying.
- **Minimize** or press **Escape** to keep a small launcher. **Close** removes the launcher too; the toolbar button brings it back. Neither deletes your note.
- There is one shared note, not a separate note per website. Changes appear in other tabs; when editing simultaneously, the last saved edit wins.
- Save failures are shown in the notepad. Use **Retry** or copy your text before leaving the page.

## Availability and privacy

Webpad runs on regular HTTP and HTTPS webpages. Chrome prohibits extensions on protected pages such as `chrome://` pages, the Chrome Web Store, other extensions' pages, and its built-in PDF viewer. On unsupported pages the toolbar displays `!`; hover it for details.

For `file://` webpages, enable **Allow access to file URLs** in Webpad's extension details. Incognito access is off unless you explicitly enable it in Chrome.

Notes use `chrome.storage.local`, not website storage or cloud sync. There are no analytics, remote fonts, network services, or external dependencies. Removing the extension removes its saved data. Export anything important using **Copy text** first.

The interface uses a closed shadow root to avoid website style collisions. It does not read page content. Like any interface embedded in a webpage, it is not intended for secrets on untrusted websites.

The extension requests access to all sites to display the notepad, storage for notes and layout, clipboard write for copying, and scripting/active-tab access so the toolbar also works on tabs opened before installation.

`index.html` remains a standalone design preview; its sample text and browser-local preview notes are not imported into the extension.

## Test

Run `node .\scripts\test-extension.cjs` on Windows with Node.js and a recent Chrome installed. If Chrome is installed somewhere other than its standard location, set the `CHROME_PATH` environment variable to its executable.

The dependency-free test loads the real unpacked extension into a temporary headless Chrome profile. It checks cross-site saving and live updates, rapid edits, empty notes, strict website policies, controls, dragging/resizing, clipboard behavior, and storage-error recovery. Toolbar injection and restricted-page handling are also checked with mocked Chrome APIs. The temporary profile is removed afterward; your normal browser profile is not used.
