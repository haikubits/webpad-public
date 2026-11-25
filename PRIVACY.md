# Webpad Privacy Policy

**Effective date: November 25, 2026**

This policy describes how **Webpad - Floating Notepad**, the Chrome extension, handles data.

## Data Webpad handles

Webpad handles the information needed to provide its floating notepad:

- Note text and note names that you enter.
- Webpage text that you explicitly select and send to Webpad using its context menu.
- Locally generated note identifiers and preferences, including the selected note, whether the notepad is open or minimized, and its position and size.

Note text can contain whatever information you choose to enter. Webpad does not require an account, request identity or payment information, record browsing history, or monitor activity outside its own note-taking interface. It does not automatically scrape webpage content.

## How data is used and stored

Webpad uses this information only to display, edit, organize, preview, save, and copy your notes.

Saved notes and preferences are stored using `chrome.storage.local` in your Chrome profile. Saved changes are shared between Webpad instances in open webpages within that profile. Webpad does not provide cloud sync or transmit this data to the developer's servers.

Unsaved drafts are held in the webpage's memory. They may be lost when that webpage is closed or refreshed. Wait for the saved status or copy your draft elsewhere before leaving the page.

## Sharing and external services

Webpad does not sell user data, share it with advertisers or data brokers, or use it for advertising, creditworthiness, lending, or purposes unrelated to note-taking. The extension has no analytics, tracking services, or remote-code downloads.

The Markdown parser is bundled with the extension. Markdown previews do not fetch external images; images are represented by their alternative text. If you click a link in a note, your browser opens that destination, which is subject to its own privacy practices.

When you click **Copy text**, Webpad writes the note to your operating system's clipboard. Webpad does not read the clipboard. Your operating system's clipboard history or synchronization settings, and any application into which you paste the text, govern subsequent handling of that copy.

## Permissions

| Permission | Use |
| --- | --- |
| Access to all sites (`<all_urls>`) | Display the floating notepad across supported webpages and enable user-invoked selected-text capture. |
| `storage` | Save notes and notepad preferences locally. |
| `scripting` | Inject the bundled interface when invoked on a page where Webpad has not yet loaded, including pages opened before installation. |
| `clipboardWrite` | Copy note text when you click **Copy text**. |
| `contextMenus` | Provide **Send to Webpad** actions for appending selected text to the current note or creating a new note. |

Site access does not mean Webpad continuously collects the contents of websites you visit. Webpage text is captured only when you invoke the selected-text action.

## Retention and deletion

Saved notes and preferences remain in your Chrome profile until you change or delete them, clear the extension's stored data, or remove the extension.

Deleting a note removes it from the active notebook. If you upgraded from Webpad's older single-note version, its original note may remain locally as a migration backup until the extension's stored data is cleared or the extension is removed. An unsaved draft of a note deleted in another webpage can also remain in that webpage's memory until you discard it or close the page.

Removing Webpad removes its extension storage. This does not remove copies you have placed on the clipboard, pasted into other applications, or saved elsewhere. Webpad does not maintain a server-side copy of your notes.

## Security

Webpad does not provide password protection or its own encryption for notes. Its interface is embedded in webpages and is not a secure vault for passwords or other sensitive information. Avoid storing sensitive information on untrusted webpages.

## Policy updates

This document will be updated if Webpad's data-handling practices change. The effective date above identifies the current revision.

## Contact

For privacy questions, use the [Webpad GitHub issue tracker](https://github.com/haikubits/webpad-public/issues). GitHub issues are public and subject to GitHub's privacy practices; do not include private notes or sensitive information in an issue.
