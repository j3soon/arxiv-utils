# usenix-utils

> **Built on arxiv-utils.** This extension is **derived from and built on top of [arxiv-utils](https://github.com/j3soon/arxiv-utils)** — it reuses the same content-script / background-script structure and the USENIX logic that was first implemented inside arxiv-utils. It is **not** an independent rewrite; it is the USENIX subset of arxiv-utils repackaged as a separate, lighter extension. It lives in the [`usenix-utils/`](.) folder of the arxiv-utils repository.

A small standalone browser extension that enhances reading [USENIX](https://www.usenix.org/) papers. Because it **only** touches `usenix.org`, it can be installed alongside arxiv-utils without overlap.

## Features

- Renames the **presentation page** and **PDF page** tab titles to the paper's title (instead of the meaningless filename like `nsdi26-luo.pdf`).
- Adds a button and hotkey (`Alt+A`) to navigate between the presentation page and the PDF:
  - `https://www.usenix.org/conference/<conf>/presentation/<slug>` ↔
  - `https://www.usenix.org/system/files/<conf>-<slug>.pdf`

The paper title is obtained by fetching the presentation page and reading its `citation_title` meta tag (falling back to the page heading).

## Install (Chrome / Edge)

Self-built extensions are unsigned, so load it unpacked:

1. Open `chrome://extensions/` (Edge: `edge://extensions/`).
2. Enable **Developer mode** (top-right).
3. Click **Load unpacked** and select the `usenix-utils/chrome/` folder.

## Try it

- Presentation: `https://www.usenix.org/conference/nsdi26/presentation/luo` → title becomes the paper title; press `Alt+A` to jump to the PDF.
- PDF: `https://www.usenix.org/system/files/nsdi26-luo.pdf` → title becomes the paper title; press `Alt+A` to jump back to the presentation page.

## Permissions

- `tabs`, `activeTab`: read/open the active tab and place the new tab next to it.
- `storage`: remember the "open in new tab" preference.
- `contextMenus`: add a Help item to the extension button's right-click menu.
- `scripting`: inject the content script into already-open USENIX tabs after install/enable.
- `*://usenix.org/*`, `*://www.usenix.org/*`: read USENIX pages and fetch the presentation page to retrieve the paper title.

## Credits

Built on / derived from [j3soon/arxiv-utils](https://github.com/j3soon/arxiv-utils) (Apache-2.0). The USENIX title-renaming and navigation logic was originally developed inside arxiv-utils; this extension reuses that code as a standalone package.
