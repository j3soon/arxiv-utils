# Repository Instructions

## Project structure

- `chrome/`: Manifest V3 extension for Chrome and Edge.
- `firefox/`: Manifest V2 extension for desktop Firefox and Firefox for Android, including the custom PDF viewer.
- `tests/testcases/testcases.yaml`: shared navigation cases for Jest and Selenium.
- `tests/unit-test/`: Jest navigation and localization checks. The navigation test expects the repository mounted at `/app`, as configured by its Docker Compose setup.
- `tests/playwright/`: Chromium extension tests and Firefox script tests with mocked browser APIs. The responsive fixtures include CSS excerpts copied from arXiv.
- `tests/end-to-end-test/`: Selenium navigation tests for Chrome, Firefox, and Edge against live sites.
- `skills/`: tracked reproduction procedures and helper scripts. `.agents/skills` and `.claude/skills` both symlink to `../skills`.
- `artifacts/`: ignored local environments and run output, including the Android SDK, emulator images, test profiles, screenshots, console captures, and downloaded test files. Keep large downloads here so they survive host reboots.

## Shared workflow

- Keep changes scoped to the requested behavior. Check both browser implementations when changing a shared feature, while preserving their manifest and API differences.
- Run the checks affected by the change and report their results and any material validation limits.
- Preserve unrelated staged and unstaged changes. Stage or commit only when requested, using focused, self-contained commits and Conventional Commit messages.
- Use the configured human Git author and committer. Do not add a coding agent as an author or co-author.
- Keep generated evidence and local test environments under the repository-root `artifacts/` directory and do not track them. Reuse Android SDK downloads, emulator images, and test profiles across host reboots.
- Keep reusable reproduction instructions and scripts under `skills/`. Record durable repository-wide guidance here, and keep `CLAUDE.md` referencing this file.

## Test selection

- For navigation rules or localization, use the Jest Docker workflow in [README.md](README.md#run-unit-tests-locally).
- For content scripts, downloads, options, or responsive layout changes, run Playwright from `tests/playwright/`:

  ```sh
  npm ci
  npx playwright install --with-deps chromium
  npm test
  ```

- Keep the arXiv layout and button CSS in the Playwright fixtures when testing responsive behavior. Follow the source comments when refreshing those excerpts.
- Playwright's Firefox script tests use mocked extension APIs in desktop Chromium. They do not establish compatibility with real Firefox for Android.
- For browser navigation interactions, use the Selenium workflow in [README.md](README.md#run-end-to-end-tests-locally), following the navigation policy below.
- Documentation or skill changes need the relevant link, script, and symlink checks rather than an unrelated browser suite. Validate skills with the skill-creator validator when available, and run new or changed helpers against their intended environment.

## Navigation tests

- Add every navigation testcase to the shared `navigation` list in `tests/testcases/testcases.yaml`. The Jest test must always run the complete list; do not filter or comment out cases for Jest.
- For local Selenium development, mark the new or currently relevant cases with `selenium_focus: True`. Remove stale focus markers when moving to another navigation feature. Do not comment out or move existing testcases to create a focused run.
- The Selenium navigation runner uses focused cases by default. Use `E2E_FULL=1` only when the complete Selenium suite is required. CI must always run with `E2E_FULL=1`.
- Before handing off a navigation change, run the full Jest navigation suite and the focused Selenium suite for Chrome, Firefox, and Edge. Restore any temporary browser-list edits afterward.

## Firefox for Android verification

- Use [skills/firefox-android-repro/SKILL.md](skills/firefox-android-repro/SKILL.md) when reproducing Android downloads or changing their behavior. It documents source revision comparisons, temporary extension loading, a headless emulator setup, and the remote-debugging probe.
- Compare the original failure and proposed behavior on a real Android browser using actual extension APIs and UI taps. Record the Android and Firefox versions, background and content errors, tab state, and files saved in Downloads.
- Distinguish a PDF preview from a saved file. Verify the downloaded filename and PDF contents, and record whether another tap is needed to save it.
- A downloads function being present does not prove it works. If a native request remains pending, report the observation interval rather than claiming it never settles.
- The recorded Firefox for Android 156 run reproduced a background startup error before messaging was registered. Commit `2440ee2` opened a PDF preview through its fallback and still required a second tap to save. Treat these as findings for that configuration and verify subsequent fixes again on Android.
