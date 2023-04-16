// This background script implements the extension button,
// and redirects PDF pages to custom PDF container.

// For our PDF container.
const pdfViewerRelatedURL = "pdfviewer.html?target=";
// The match pattern for the URLs to redirect
// Note: https://arxiv.org/pdf/<id> is the direct link, then the url is renamed to https://arxiv.org/pdf/<id>.pdf
//       we capture only the last url (the one that ends with '.pdf').
// Adding some extra parameter such as https://arxiv.org/pdf/<id>.pdf?download can bypass this capture.
const redirectPatterns = [
  "*://arxiv.org/*.pdf", "*://export.arxiv.org/*.pdf",
  "*://arxiv.org/pdf/*/", "*://export.arxiv.org/pdf/*/"
];
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
    chrome.browserAction.disable(tabId, () => {
      console.log(LOG_PREFIX, `Disabled browser action for tab ${tabId} with url: ${url}.`);
    });
    return false;
  }
  chrome.browserAction.enable(tabId, () => {
    console.log(LOG_PREFIX, `Enabled browser action for tab ${tabId} with url: ${url}.`);
  });
  return true;
}
// Update browser action state for the updated tab.
function onTabUpdated(tabId, changeInfo, tab) {
  updateActionState(tabId, tab.url)
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
// Redirect to custom PDF page.
function onBeforeWebRequest(requestDetails) {
  if (requestDetails.documentUrl !== undefined) {
    // Request from this plugin itself (the embedded PDF).
    return;
  }
  // Force HTTPS to avoid CSP (Content Security Policy) violation.
  const targetRelatedURL = pdfViewerRelatedURL + requestDetails.url.replace("http:", "https:");
  const targetURL = chrome.runtime.getURL(targetRelatedURL);
  console.log(`${LOG_PREFIX} Redirecting: ${requestDetails.url} to ${targetURL}`);
  return {
    redirectUrl: targetURL
  };
}
// If the custom PDF page is bookmarked, bookmark the original PDF link instead.
function onCreateBookmarkAsync(id, bookmarkInfo) {
  var prefix = chrome.runtime.getURL(pdfViewerRelatedURL);
  if (!bookmarkInfo.url.startsWith(prefix)) {
    return;
  }
  console.log(LOG_PREFIX, "Updating bookmark with id: " + id + ", url: " + bookmarkInfo.url);
  var url = bookmarkInfo.url.substr(prefix.length);
  chrome.bookmarks.update(id, {
    url: url
  }, () => {
    console.log(LOG_PREFIX, "Updated bookmark with id: " + id + " to URL: " + url);
  });
}

// Update browser action state upon start (e.g., installation, enable).
chrome.tabs.query({}, function(tabs) {
  if (!tabs) return;
  for (const tab of tabs)
    updateActionState(tab.id, tab.url)
});
// Disable the extension button by default. (Manifest v2)
chrome.browserAction.disable();
// Listen to all tab updates.
chrome.tabs.onUpdated.addListener(onTabUpdated);
// Listen to extension button click.
chrome.browserAction.onClicked.addListener(onButtonClickedAsync);
// Add Help menu item to extension button context menu. (Manifest v2)
chrome.contextMenus.create({
  title: "Help",
  contexts: ["browser_action"],
  onclick: () => {
    chrome.tabs.create({ "url": "https://github.com/j3soon/arxiv-utils" })
  }
});

// Redirect the PDF page to custom PDF container page.
chrome.webRequest.onBeforeRequest.addListener(
  onBeforeWebRequest,
  { urls: redirectPatterns },
  ["blocking"]
);
// Capture bookmarking event of custom PDF page.
chrome.bookmarks.onCreated.addListener(onCreateBookmarkAsync);
