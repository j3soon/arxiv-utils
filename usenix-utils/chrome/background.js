// This background script implements the extension button,
// and triggers the content script upon tab title change.
import TARGET_URL_REGEXP_REPLACE from './target_url_regexp_replace.js';

// All console logs should start with this prefix.
const LOG_PREFIX = "[USENIX-utils]";

// Return the target URL parsed from the url.
function getTargetURL(url) {
  for (const [regexp, replacement] of TARGET_URL_REGEXP_REPLACE) {
    if (regexp.test(url))
      return url.replace(regexp, replacement);
  }
  return null;
}
// Update the state of the extension button (i.e., browser action)
async function updateActionStateAsync(tabId, url) {
  const id = getTargetURL(url);
  if (!id) {
    await chrome.action.disable(tabId);
  } else {
    await chrome.action.enable(tabId);
  }
}
// Update browser action state for the updated tab.
function onTabUpdated(tabId, changeInfo, tab) {
  updateActionStateAsync(tabId, tab.url)
  const id = getTargetURL(tab.url);
  if (!id) return;
  if (changeInfo.title && tab.status == "complete") {
    // Send title changed message to content script.
    // Ref: https://stackoverflow.com/a/73151665
    console.log(LOG_PREFIX, "Title changed, sending message to content script.");
    chrome.tabs.sendMessage(tabId, tab);
  }
}
// Open the presentation / PDF page according to the current URL.
async function onButtonClickedAsync(tab) {
  console.log(LOG_PREFIX, "Button clicked, opening presentation / PDF page.");
  const targetURL = getTargetURL(tab.url);
  if (!targetURL) {
    console.error(LOG_PREFIX, "Error: Failed to get target URL, aborted.");
    return;
  }
  // Create the presentation / PDF page in existing / new tab.
  const openInNewTab = (await chrome.storage.sync.get({
    'open_in_new_tab': true
  })).open_in_new_tab;
  if (openInNewTab) {
    await chrome.tabs.create({
      url: targetURL,
      index: tab.index + 1,
    });
  } else {
    await chrome.tabs.update({
      url: targetURL,
    });
  }
  console.log(LOG_PREFIX, "Opened presentation / PDF page in existing / new tab.");
}
function onMessage(message, sender, sendResponse) {
  // Handle page HTML fetch requests (for USENIX title extraction)
  if (message.type === 'fetchPageHTML') {
    (async () => {
      try {
        console.log(LOG_PREFIX, `Fetching page: ${message.url}`);
        const response = await fetch(message.url);
        if (!response.ok) {
          console.error(LOG_PREFIX, "Error: Page request failed.");
          sendResponse({ success: false, error: 'Page request failed' });
          return;
        }
        const html = await response.text();
        console.log(LOG_PREFIX, "Successfully retrieved page HTML.");
        sendResponse({ success: true, data: html });
      } catch (error) {
        console.error(LOG_PREFIX, "Error fetching page:", error);
        sendResponse({ success: false, error: error.message });
      }
    })();
    // Tell Chrome we will send the response asynchronously
    return true;
  }
}
function onContextClicked(info, tab) {
  if (info.menuItemId === 'help')
    chrome.tabs.create({
      url: "https://github.com/j3soon/arxiv-utils",
    });
}
function onInstalled() {
  // Add Help menu item to extension button context menu. (Manifest v3)
  chrome.contextMenus.create({
    id: "help",
    title: "Help",
    contexts: ["action"],
  });
}
// Inject content scripts to pre-existing tabs. E.g., after installation or re-enable.
// Firefox injects content scripts automatically, but Chrome does not.
async function injectContentScriptsAsync() {
  for (const cs of chrome.runtime.getManifest().content_scripts) {
    for (const tab of await chrome.tabs.query({url: cs.matches})) {
      console.log(LOG_PREFIX, `Injecting content scripts for tab ${tab.id} with url: ${tab.url}.`);
      chrome.scripting.executeScript({
        target: {tabId: tab.id},
        files: cs.js,
      });
    }
  }
}

// Update browser action state upon start (e.g., installation, enable).
chrome.tabs.query({}, function(tabs) {
  if (!tabs) return;
  for (const tab of tabs)
    updateActionStateAsync(tab.id, tab.url)
});
// Disable the extension button by default. (Manifest v3)
chrome.action.disable();
// Listen to all tab updates.
chrome.tabs.onUpdated.addListener(onTabUpdated);
// Listen to extension button click.
chrome.action.onClicked.addListener(onButtonClickedAsync);
// Listen to extension button right-click.
chrome.contextMenus.onClicked.addListener(onContextClicked)
// Listen to page fetch request.
chrome.runtime.onMessage.addListener(onMessage);

// Listen to on extension install event.
chrome.runtime.onInstalled.addListener(onInstalled);
injectContentScriptsAsync();
