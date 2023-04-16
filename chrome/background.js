// This background script implements the extension button,
// and triggers the content script upon tab title change.

// Regular expressions for parsing arXiv URLs.
// Ref: https://info.arxiv.org/help/arxiv_identifier_for_services.html#urls-for-standard-arxiv-functions
const ABS_REGEXP = /arxiv\.org\/abs\/([\S]*)$/;
const PDF_REGEXP = /arxiv\.org\/[\S]*\/([^\/]*)$/;
// All console logs should start with this prefix.
const LOG_PREFIX = "[arXiv-utils]";

// Return the id parsed from the url.
function getId(url, pageType) {
  url = url.replace(".pdf", "");
  if (url.endsWith("/")) url = url.slice(0, -1);
  const match = pageType === "PDF" ? url.match(PDF_REGEXP) : url.match(ABS_REGEXP);
  // string.match() returns null if no match found.
  return match && match[1];
}
// Update the state of the extension button (i.e., browser action)
function updateActionState(tabId, url) {
  const id = getId(url, "Abstract") || getId(url, "PDF");
  if (id === null) {
    chrome.action.disable(tabId, () => {
      console.log(LOG_PREFIX, `Disabled browser action for tab ${tabId} with url: ${url}.`);
    });
    return false;
  }
  chrome.action.enable(tabId, () => {
    console.log(LOG_PREFIX, `Enabled browser action for tab ${tabId} with url: ${url}.`);
  });
  return true;
}
// Update browser action state for the updated tab.
function onTabUpdated(tabId, changeInfo, tab) {
  const actionActive = updateActionState(tabId, tab.url)
  if (!actionActive) return;
  if (changeInfo.title && tab.status == "complete") {
    // Send title changed message to content script.
    // Ref: https://stackoverflow.com/a/73151665
    console.log(LOG_PREFIX, "Title changed, sending message to content script.");
    chrome.tabs.sendMessage(tabId, tab);
  }
}
// Open the abstract / PDF page according to the current URL.
function onButtonClickedAsync(tab) {
  console.log(LOG_PREFIX, "Button clicked, opening abstract / PDF page.");
  const pageType = tab.url.includes("pdf") ? "PDF" : "Abstract";
  const id = getId(tab.url, pageType);
  if (id === null) {
    console.error(LOG_PREFIX, "Error: Failed to get paper ID, aborted.");
    return;
  }
  // Construct the target URL.
  const targetURL = (pageType === "PDF") ? `https://arxiv.org/abs/${id}` : `https://arxiv.org/pdf/${id}.pdf`;
  // Create the abstract / PDF page in new tab.
  chrome.tabs.create({ "url": targetURL }, (newTab) => {
    console.log(LOG_PREFIX, "Opened abstract / PDF page in new tab.");
    // Move the new tab to the right of the active tab.
    chrome.tabs.move(newTab.id, {
      index: tab.index + 1
    }, function (tab) {
      console.log(LOG_PREFIX, "Moved the new tab to the right of the active tab.");
    });
  });
}
function onContextClicked(info, tab) {
  if (info.menuItemId === 'help')
    chrome.tabs.create({ "url": "https://github.com/j3soon/arxiv-utils" })
}
function onInstalled() {
  // Add Help menu item to extension button context menu. (Manifest v3)
  chrome.contextMenus.create({
    id: "help",
    title: "Help",
    contexts: ["action"],
  });
}

// Update browser action state upon start (e.g., installation, enable).
chrome.tabs.query({}, function(tabs) {
  if (!tabs) return;
  for (const tab of tabs)
    updateActionState(tab.id, tab.url)
});
// Disable the extension button by default. (Manifest v3)
chrome.action.disable();
// Listen to all tab updates.
chrome.tabs.onUpdated.addListener(onTabUpdated);
// Listen to extension button click.
chrome.action.onClicked.addListener(onButtonClickedAsync);
// Listen to extension button right-click.
chrome.contextMenus.onClicked.addListener(onContextClicked)

// Listen to on extension install event.
chrome.runtime.onInstalled.addListener(onInstalled);
