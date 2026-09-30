# Recorded Android download findings

Run date: 2026-10-01. Requested commit: `2440ee2ff4def04178a32ff14a22c980a6553cd1`.

## Purpose

Test the real Firefox for Android extension before and after the download fallback change. Earlier Playwright tests used mocked browser extension APIs and did not establish Android compatibility.

## Environment

- Linux x86_64 host with accessible `/dev/kvm`.
- No physical Android device, Android SDK, or emulator was initially installed.
- Installed a headless Android 15 (API 35), AOSP x86_64 emulator. The reusable environment is retained under the ignored repository-root `artifacts/firefox-android-repro/` directory.
- Android Emulator 37.1.11; platform-tools 37.0.1.
- Firefox for Android 156.0, official Mozilla x86_64 APK.
- `web-ext` 10.7.0, with temporary extensions installed using Firefox remote debugging.
- Original source: `2440ee2^` (`fe0e157`). Fixed source: `2440ee2`.
- The extension source was not modified during the investigation; only documentation, evidence, and a debugging helper were added to this repository.

## Sources

- [Mozilla Android extension development instructions](https://extensionworkshop.com/documentation/develop/developing-extensions-for-firefox-for-android/)
- [Official Firefox APK](https://archive.mozilla.org/pub/fenix/releases/156.0/android/fenix-156.0-android-x86_64/fenix-156.0.multi.android-x86_64.apk)
- [Android SDK package repository](https://dl.google.com/android/repository/repository2-3.xml)
- [Android system image repository](https://dl.google.com/android/repository/sys-img/android/sys-img2-3.xml)

## Executed procedure

1. Exported both source revisions into separate directories. They are retained under `artifacts/firefox-android-repro/before/` and `artifacts/firefox-android-repro/after/`.
2. Booted the emulator with hardware acceleration and installed Firefox.
3. Enabled Firefox remote debugging in the emulator's disposable profile.
4. Loaded the original extension with `web-ext` 10.7.0 targeting `firefox-android`, package `org.mozilla.firefox`, and device `emulator-5554`, with reload and interactive input disabled and a 30-second discovery timeout. The repeatable command is in [the reproduction guide](reproduce-downloads.md).
5. Requested the live page `https://arxiv.org/abs/2501.00001`.

## Results

The original failure was reproduced in a real Firefox for Android browser on an Android emulator, using the live arXiv page and actual UI taps. No extension APIs or network responses were mocked or replaced.

| Source revision | First tap on the mobile Direct Download button | Saved file |
| --- | --- | --- |
| Before: `fe0e157` | No download and no PDF preview. The click produces a rejected messaging request. | None |
| After: `2440ee2` | The fallback fetches the PDF, then Firefox opens the blob in a new PDF preview tab. | None until a second tap on the viewer's Download control |

The original abstract tab remains open after the fallback; Firefox creates a separate tab for the PDF preview. The fallback is progress over the original no-op, but it does **not** provide a one-tap file download on this tested Android configuration.

A second tap on the PDF viewer's Download control saves the PDF with the formatted filename:

```text
Mathematical modelling of flow and adsorption in a gas chromatograph, A. Cabrera-Codony et al., 2024, v1.pdf
```

The saved file is 889,089 bytes, starts with `%PDF-1.5`, and has SHA-256 `e7107313fc0f9eaded0e13d7a3ea8cd2bcaaec6525501716ed9282101b493487`. The PDF itself is not included in this repository.

### Background startup fails before download messaging is registered

Both revisions fail at the call to `browser.contextMenus.create`:

```text
TypeError: can't access property "create", browser.contextMenus is undefined
```

`browser.contextMenus` and `browser.bookmarks` are both `undefined` on this browser. The context menu exception occurs before `browser.runtime.onMessage.addListener(onMessage)` executes. Consequently, a real click rejects `runtime.sendMessage` with:

```text
Error: Could not establish connection. Receiving end does not exist.
```

In `2440ee2`, that rejection activates the fallback in the content script. The new background capability response `{ downloadSupported: false }` is not reached in this run because the handler is not installed.

### Presence of the downloads function does not establish support

`typeof browser.downloads.download` reports `"function"`. Calling the real API directly from the extension background console with an arXiv PDF URL and `saveAs: false` leaves its promise pending during a 15-second observation window. No `native-api-probe.pdf` appears in the Downloads directory.

This limited observation does not establish that the promise can never settle. It does establish that checking whether the function exists is insufficient on this browser, and that a rejection-only fallback cannot handle a pending request promptly.

### Why the earlier automated tests missed this

- Their mocked Firefox API object supplies working `contextMenus` and `bookmarks`, so it hides the real background startup error.
- Their mocked downloads API either resolves or rejects; it does not exercise an indefinitely pending request.
- The web-platform download tests run in desktop Chromium and desktop Firefox. Those engines save the blob as a file in these tests; Firefox for Android previews this PDF blob instead.

No source-code correction was made during this investigation. Commit `2440ee2` remains insufficient for one-tap direct downloading on the tested Android configuration. Follow-up work should account for unsupported background APIs, pending native calls, and Android's handling of PDF blobs. Those changes need another real Android verification.

## Run evidence

The original screenshots and JSON console captures remain locally under `artifacts/firefox-android-repro/reports/original-run/`. The repository-root `artifacts/` directory is ignored by Git, so they are not included in a fresh checkout. The results above preserve the observed behavior, environment, and download verification.

Actor identifiers, extension UUIDs, blob UUIDs, ports, and timestamps vary between runs. Capture new evidence using [the reproduction guide](reproduce-downloads.md).
