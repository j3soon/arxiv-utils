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
function onTabUpdated(tabId, changeInfo, tab) {
  const id = getId(tab.url, "Abstract") || getId(tab.url, "PDF");
  if (id !== null) {
    chrome.browserAction.enable(tabId);
  } else {
    chrome.browserAction.disable(tabId);
  }
}
// Open the abstract / PDF page according to the current URL.
function onButtonClickedAsync(tab) {
  console.log(LOG_PREFIX, "Button clicked, opening abstract / PDF page.");
  const pageType = tab.url.includes("pdf") ? "PDF" : "Abstract";
  var url = tab.url;
  if (pageType === "PDF") {
    // Remove the PDF container prefix of the custom PDF page.
    const pdfViewerURL = chrome.runtime.getURL(pdfViewerRelatedURL);
    url = tab.url.substr(pdfViewerURL.length);
  }
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

// Listen to all tab updates.
chrome.tabs.onUpdated.addListener(onTabUpdated);
// Listen to extension button click.
chrome.browserAction.onClicked.addListener(onButtonClickedAsync);
// Redirect the PDF page to custom PDF container page.
chrome.webRequest.onBeforeRequest.addListener(
  onBeforeWebRequest,
  { urls: redirectPatterns },
  ["blocking"]
);
// Capture bookmarking event of custom PDF page.
chrome.bookmarks.onCreated.addListener(onCreateBookmarkAsync);
