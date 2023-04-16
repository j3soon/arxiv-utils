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
function onTabUpdated(tabId, changeInfo, tab) {
  const id = getId(tab.url, "Abstract") || getId(tab.url, "PDF");
  if (id !== null) {
    chrome.action.enable(tabId);
    if (changeInfo.title && tab.status == "complete") {
      // Send title changed message to content script.
      // Ref: https://stackoverflow.com/a/73151665
      console.log(LOG_PREFIX, "Title changed, sending message to content script.");
      chrome.tabs.sendMessage(tabId, tab);
    }
  } else {
    chrome.action.disable(tabId);
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

// Listen to all tab updates.
chrome.tabs.onUpdated.addListener(onTabUpdated);
// Listen to extension button click.
chrome.action.onClicked.addListener(onButtonClickedAsync);
