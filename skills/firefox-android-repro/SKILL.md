---
name: firefox-android-repro
description: Reproduce and diagnose arxiv-utils download behavior in real Firefox for Android using an Android device or headless emulator, ADB, and Firefox remote debugging. Use when verifying Android compatibility or comparing download fixes with their original failure.
---

# Firefox for Android reproduction

Read [the reproduction guide](references/reproduce-downloads.md) to set up a device, load source revisions with `web-ext`, tap the injected download button, and capture browser state. It includes the isolated Linux x86_64 emulator setup used in the original investigation.

Read [the recorded findings](references/download-findings.md) when assessing commit `2440ee2` or interpreting missing background listeners, pending native download requests, and PDF preview tabs. These findings describe Firefox for Android 156 on Android 15, not every Android/browser version.

Compare the requested source revision with its parent or the relevant original revision. Use actual extension APIs and UI taps for the Android reproduction. Desktop tests with mocked Firefox APIs cannot establish Android download behavior.

Capture the background and content errors, tab state, and Downloads directory before and after the tap. A PDF preview is a separate outcome from a saved file. Record whether saving requires another tap and verify the saved filename and PDF contents.

Use [scripts/android_rdp_probe.py](scripts/android_rdp_probe.py) with the debugging port forwarded by `web-ext` to capture real browser state. Its optional `--native-probe` makes a real download request and observes whether it settles within the requested interval. An API being present does not prove it works, and a pending result only establishes behavior during that interval.

Keep screenshots, console captures, downloaded PDFs, and other run output under `artifacts/firefox-android-repro/reports/`. Keep SDK downloads, emulator images, and test profiles under `artifacts/firefox-android-repro/` so they persist across host reboots. The repository-root `artifacts/` directory is ignored by Git. Reuse that environment instead of downloading it again. Update these tracked instructions or scripts when a run reveals reusable guidance.

Stop the `web-ext` session and the emulator started for the reproduction when finished. Preserve unrelated devices and sessions.
