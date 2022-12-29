// This background script is for adding the back to abstract button.
var app = {};
// All logs should start with this.
app.name = "[arXiv-utils]";
// For our PDF container.
app.pdfviewer = "pdfviewer.html";
app.pdfviewerTarget = "pdf.js/build/generic/web/viewer.html?file=";
// The match pattern for the URLs to redirect
// Note: https://arxiv.org/pdf/<id> is the direct link, then the url is renamed to https://arxiv.org/pdf/<id>.pdf
//       we capture only the last url (the one that ends with '.pdf').
// Adding some extra parameter such as https://arxiv.org/pdf/<id>.pdf?download can bypass this capture.
app.redirectPatterns = ["*://arxiv.org/*.pdf", "*://export.arxiv.org/*.pdf",
                        "*://arxiv.org/pdf/*/", "*://export.arxiv.org/pdf/*/"];
// These 2 below is for regex matching.
app.abs_regexp = /arxiv.org\/abs\/([\S]*)$/;
app.pdf_regexp = /arxiv.org\/[\S]*\/([^\/]*)$/;
// Return the type parsed from the url. (Returns "PDF" or "Abstract")
app.getType = function (url) {
  if (url.indexOf("pdf") !== -1) {
    return "PDF";
  }
  return "Abstract";
}
// Return the id parsed from the url.
app.getId = function (url, type) {
  url = url.replace(".pdf", "");
  if (url.endsWith("/")) url = url.slice(0, -1);
  var match;
  if (type === "PDF") {
    // match = url.match(/arxiv.org\/pdf\/([\S]*)\.pdf$/);
    match = url.match(app.pdf_regexp);
    // The first match is the matched string, the second one is the captured group.
    if (match === null || match.length !== 2) {
      return null;
    }
  } else {
    match = url.match(app.abs_regexp);
    // The first match is the matched string, the second one is the captured group.
    if (match === null || match.length !== 2) {
      return null;
    }
  }
  return match[1];
}
// Open the abstract / PDF page using the current URL.
app.openAbstractTab = function (activeTabIdx, url, type) {
  // Retrieve the abstract url by modifying the original url.
  var newURL;
  if (type === "PDF") {
    var prefix = chrome.runtime.getURL(app.pdfviewerTarget);
    newURL = url.substr(prefix.length);
    var id = app.getId(newURL, type);
    newURL = "https://arxiv.org/abs/" + id;
  } else {
    var id = app.getId(url, type);
    newURL = "https://arxiv.org/pdf/" + id + ".pdf";
  }
  // Create the abstract page in new tab.
  chrome.tabs.create({ "url": newURL }, (tab) => {
    console.log(app.name, "Opened abstract page in new tab.");
    // Move the target tab next to the active tab.
    chrome.tabs.move(tab.id, {
      index: activeTabIdx + 1
    }, function (tab) {
      console.log(app.name, "Moved abstract tab.");
    });
  });
}
// Check if the URL is abstract or PDF page, returns true if the URL is either.
app.checkURL = function (url) {
  url = url.replace(".pdf", "");
  if (url.endsWith("/")) url = url.slice(0, -1);
  var matchPDF = url.match(app.pdf_regexp);
  var matchAbs = url.match(app.abs_regexp);
  if (matchPDF !== null || matchAbs !== null) {
    return true;
  }
  return false;
}
// Called when the url of a tab changes.
app.updateBrowserActionState = function (tabId, changeInfo, tab) {
  var avail = app.checkURL(tab.url)
  if (avail) {
    chrome.browserAction.enable(tabId);
  } else {
    chrome.browserAction.disable(tabId);
  }
};
// Redirect to custom PDF page.
app.redirect = function (requestDetails) {
  if (requestDetails.documentUrl !== undefined) {
    // Request from this plugin itself (embedded PDF).
    return;
  }
  // Force HTTPS to avoid CSP (Content Security Policy) violation.
  var url = app.pdfviewerTarget + requestDetails.url.replace("http:", "https:");
  url = chrome.runtime.getURL(url);
  console.log(app.name, "Redirecting: " + requestDetails.url + " to " + url);
  return {
    redirectUrl: url
  };
}
// If the custom PDF page is bookmarked, bookmark the original PDF link instead.
app.modifyBookmark = function (id, bookmarkInfo) {
  var prefix = chrome.runtime.getURL(app.pdfviewerTarget);
  if (!bookmarkInfo.url.startsWith(prefix)) {
    return;
  }
  console.log(app.name, "Updating bookmark with id: " + id + ", url: " + bookmarkInfo.url);
  var url = bookmarkInfo.url.substr(prefix.length);
  chrome.bookmarks.update(id, {
    url: url
  }, () => {
    console.log(app.name, "Updated bookmark with id: " + id + " to URL: " + url);
  });
}
// Run this when the button clicked.
app.run = function (tab) {
  if (!app.checkURL(tab.url)) {
    console.log(app.name, "Error: Not arXiv page.");
    return;
  }
  var type = app.getType(tab.url);
  app.openAbstractTab(tab.index, tab.url, type);
}
// Listen for any changes to the URL of any tab.
chrome.tabs.onUpdated.addListener(app.updateBrowserActionState);
// Extension button click to modify title.
chrome.browserAction.onClicked.addListener(app.run);
// Redirect the PDF page to custom PDF container page.
chrome.webRequest.onBeforeRequest.addListener(
  app.redirect,
  { urls: app.redirectPatterns },
  ["blocking"]
);
// Capture bookmarking custom PDF page.
chrome.bookmarks.onCreated.addListener(app.modifyBookmark);
