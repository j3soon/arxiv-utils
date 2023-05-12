// This background script implements the extension button,
// and redirects PDF pages to custom PDF container.

// For our PDF container.
const pdfViewerRelatedURL = "pdfviewer.html?target=";
// The match pattern for the URLs to redirect
// Note: `https://arxiv.org/pdf/<id>` is the direct link, then the url is redirected to `https://arxiv.org/pdf/<id>.pdf`
//       we capture only the last url (the one containing `.pdf`).
//       However, if `https://arxiv.org/pdf/<id>/` is the direct link, no redirection will happen,
//       we need to capture this too.
// The direct download link such as `https://arxiv.org/pdf/<id>.pdf?download` will be checked afterwards.
const redirectPatterns = [
  "*://arxiv.org/*.pdf*", "*://export.arxiv.org/*.pdf*",
  "*://arxiv.org/*pdf*/", "*://export.arxiv.org/*pdf*/",
];
// Regular expressions for parsing target navigation URL from URLs.
// Ref: https://info.arxiv.org/help/arxiv_identifier_for_services.html#urls-for-standard-arxiv-functions
const TARGET_URL_REGEXP_REPLACE = [
  [/^.*:\/\/(?:export\.)?arxiv\.org\/abs\/(\S*?)\/*(\?.*?)?(\#.*?)?$/, "https://arxiv.org/pdf/$1.pdf"],
  [/^.*:\/\/(?:export\.)?arxiv\.org\/pdf\/(\S*?)(?:\.pdf)?\/*(\?.*?)?(\#.*?)?$/, "https://arxiv.org/abs/$1"],
  [/^.*:\/\/(?:export\.)?arxiv\.org\/ftp\/(?:arxiv\/|([^\/]*\/))papers\/.*?([^\/]*?)\.pdf(\?.*?)?(\#.*?)?$/, "https://arxiv.org/abs/$1$2"],
  [/^.*:\/\/ar5iv\.labs\.arxiv\.org\/html\/(\S*?)\/*(\?.*?)?(\#.*?)?$/, "https://arxiv.org/abs/$1"],
];
// All console logs should start with this prefix.
const LOG_PREFIX = "[arXiv-utils]";

// Get PDF viewer URL prefix
async function getPDFViewerURLPrefixAsync() {
  const result = await browser.storage.sync.get({
    'pdf_viewer_url_prefix': ''
  });
  var prefix;
  if (result.pdf_viewer_url_prefix === '')
    prefix = browser.runtime.getURL(pdfViewerRelatedURL);
  else
    prefix = result.pdf_viewer_url_prefix;
  return prefix;
}
// Return the target URL parsed from the url.
async function getTargetURLAsync(url) {
  // Remove the prefix for the custom PDF page.
  const prefix = await getPDFViewerURLPrefixAsync();
  if (url.startsWith(prefix))
    url = url.substr(prefix.length);
  for (const [regexp, replacement] of TARGET_URL_REGEXP_REPLACE) {
    if (regexp.test(url))
      return url.replace(regexp, replacement);
  }
  return null;
}
// Update the state of the extension button (i.e., browser action)
async function updateActionStateAsync(tabId, url) {
  const id = await getTargetURLAsync(url);
  if (!id) {
    await browser.browserAction.disable(tabId);
    // console.log(LOG_PREFIX, `Disabled browser action for tab ${tabId} with url: ${url}.`);
  } else {
    await browser.browserAction.enable(tabId);
    // console.log(LOG_PREFIX, `Enabled browser action for tab ${tabId} with url: ${url}.`);
  }
}
// Update browser action state for the updated tab.
function onTabUpdated(tabId, changeInfo, tab) {
  updateActionStateAsync(tabId, tab.url)
}
// Open the abstract / PDF page according to the current URL.
async function onButtonClickedAsync(tab) {
  console.log(LOG_PREFIX, "Button clicked, opening abstract / PDF page.");
  const targetURL = await getTargetURLAsync(tab.url);
  if (!targetURL) {
    console.error(LOG_PREFIX, "Error: Failed to get paper ID, aborted.");
    return;
  }
  // Create the abstract / PDF page in new tab.
  await browser.tabs.create({
    url: targetURL,
    index: tab.index + 1,
  });
  console.log(LOG_PREFIX, "Opened abstract / PDF page in new tab.");
}
// Redirect to custom PDF page.
async function onBeforeWebRequestAsync(requestDetails) {
  if (requestDetails.documentUrl !== undefined) {
    // Request from this plugin itself (the embedded PDF).
    return;
  }
  if (requestDetails.url.endsWith("?download")) {
    // Request from this plugin itself (download PDF).
    return;
  }
  const redirectPDF = (await browser.storage.sync.get({
    'redirect_pdf': true
  })).redirect_pdf;
  if (!redirectPDF) {
    // Redirection of PDF is disabled.
    return;
  }
  // Force HTTPS to avoid CSP (Content Security Policy) violation.
  const url = requestDetails.url.replace("http:", "https:");
  // Redirect to custom PDF viewer or a external PDF viewer.
  const targetURL = await getPDFViewerURLPrefixAsync() + url;
  console.log(`${LOG_PREFIX} Redirecting: ${requestDetails.url} to ${targetURL}`);
  return {
    redirectUrl: targetURL
  };
}
// If the custom PDF page is bookmarked, bookmark the original PDF link instead.
async function onCreateBookmarkAsync(id, bookmarkInfo) {
  const prefix = await getPDFViewerURLPrefixAsync();
  if (!bookmarkInfo.url.startsWith(prefix)) {
    return;
  }
  console.log(LOG_PREFIX, "Updating bookmark with id: " + id + ", url: " + bookmarkInfo.url);
  const url = bookmarkInfo.url.substr(prefix.length);
  browser.bookmarks.update(id, {
    url
  }, () => {
    console.log(LOG_PREFIX, "Updated bookmark with id: " + id + " to URL: " + url);
  });
}

// Update browser action state upon start (e.g., installation, enable).
browser.tabs.query({}, function(tabs) {
  if (!tabs) return;
  for (const tab of tabs)
    updateActionStateAsync(tab.id, tab.url)
});
// Disable the extension button by default. (Manifest v2)
browser.browserAction.disable();
// Listen to all tab updates.
browser.tabs.onUpdated.addListener(onTabUpdated);
// Listen to extension button click.
browser.browserAction.onClicked.addListener(onButtonClickedAsync);
// Add Help menu item to extension button context menu. (Manifest v2)
browser.contextMenus.create({
  title: "Help",
  contexts: ["browser_action"],
  onclick: () => {
    browser.tabs.create({
      url: "https://github.com/j3soon/arxiv-utils",
    });
  }
});

// Redirect the PDF page to custom PDF container page.
browser.webRequest.onBeforeRequest.addListener(
  onBeforeWebRequestAsync,
  { urls: redirectPatterns },
  ["blocking"]
);
// Capture bookmarking event of custom PDF page.
browser.bookmarks.onCreated.addListener(onCreateBookmarkAsync);
