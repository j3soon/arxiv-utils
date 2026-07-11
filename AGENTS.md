# Repository Instructions

## Navigation tests

- Add every navigation testcase to the shared `navigation` list in `tests/testcases/testcases.yaml`. The Jest test must always run the complete list; do not filter or comment out cases for Jest.
- For local Selenium development, mark the new or currently relevant cases with `selenium_focus: True`. Remove stale focus markers when moving to another navigation feature. Do not comment out or move existing testcases to create a focused run.
- The Selenium navigation runner uses focused cases by default. Use `E2E_FULL=1` only when the complete Selenium suite is required. CI must always run with `E2E_FULL=1`.
- Before handing off a navigation change, run the full Jest navigation suite and the focused Selenium suite for Chrome, Firefox, and Edge. Restore any temporary browser-list edits afterward.
