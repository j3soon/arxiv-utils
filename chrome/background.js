// This background script is for adding the back to abstract button.
var app = {};
// All logs should start with this.
app.name = "[arXiv-utils]";
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
    // match = url.match(/arxiv.org\/pdf\/([\S]*)\2pdf$/);
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
  var id = app.getId(url, type);
  // Retrieve the abstract url by modifying the original url.
  var newURL;
  if (type === "PDF") {
    newURL = "https://arxiv.org/abs/" + id;
  } else {
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
    chrome.tabs.sendMessage(tabId, tab);
  } else {
    chrome.browserAction.disable(tabId);
  }
};
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
