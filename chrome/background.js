// This background script implements the extension button,
// and triggers the content script upon tab title change.
import TARGET_URL_REGEXP_REPLACE from './target_url_regexp_replace.js';

// All console logs should start with this prefix.
const LOG_PREFIX = "[arXiv-utils]";

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
    // console.log(LOG_PREFIX, `Disabled browser action for tab ${tabId} with url: ${url}.`);
  } else {
    await chrome.action.enable(tabId);
    // console.log(LOG_PREFIX, `Enabled browser action for tab ${tabId} with url: ${url}.`);
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
// Open the abstract / PDF page according to the current URL.
async function onButtonClickedAsync(tab) {
  console.log(LOG_PREFIX, "Button clicked, opening abstract / PDF page.");
  const targetURL = getTargetURL(tab.url);
  if (!targetURL) {
    console.error(LOG_PREFIX, "Error: Failed to get paper ID, aborted.");
    return;
  }
  // Create the abstract / PDF page in existing / new tab.
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
  console.log(LOG_PREFIX, "Opened abstract / PDF page in existing / new tab.");
}
async function onMessage(message, sender, sendResponse) {
  // Handle API query requests from content script (to avoid Chrome's CORS restrictions)
  if (message.type === 'fetchArticleInfo') {
    try {
      console.log(LOG_PREFIX, `Fetching article info for id: ${message.id}`);
      const response = await fetch(`https://export.arxiv.org/api/query?id_list=${message.id}`);
      if (!response.ok) {
        console.error(LOG_PREFIX, "Error: ArXiv API request failed.");
        sendResponse({ success: false, error: 'API request failed' });
        return;
      }
      const xmlDoc = await response.text();
      console.log(LOG_PREFIX, "Successfully retrieved article info from ArXiv API.");
      sendResponse({ success: true, data: xmlDoc });
    } catch (error) {
      console.error(LOG_PREFIX, "Error fetching article info:", error);
      sendResponse({ success: false, error: error.message });
    }
    // Tell Chrome we will send the response asynchronously
    return true;
  }

  // Handle download requests
  if (message.type === 'downloadFile') {
    await chrome.downloads.download({
      url: message.url,
      filename: message.filename,
      saveAs: false,
    });
    console.log(LOG_PREFIX, `Downloading file: ${message.filename} from ${message.url}.`)
  }

  // Return false/undefined for non-async responses
  return false;
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
  // TODO: Fix errors:
  // - Injecting content scripts seems to cause error when
  //   disabling and re-enabling the extension very quickly with existing arXiv tabs:
  //       Uncaught (in promise) TypeError: Cannot read properties of undefined (reading 'sync')
  // - Another error seems to occur under unknown circumstances:
  //       Uncaught SyntaxError: Identifier 'ABS_REGEXP' has already been declared
  // - Another error seems to occur under unknown circumstances:
  //       Unchecked runtime.lastError: Cannot create item with duplicate id help
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
// Listen to download request
chrome.runtime.onMessage.addListener(onMessage);

// Listen to on extension install event.
chrome.runtime.onInstalled.addListener(onInstalled);
injectContentScriptsAsync();
