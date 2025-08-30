// This background script implements the extension button,
// and redirects PDF pages to custom PDF container.
import TARGET_URL_REGEXP_REPLACE from './target_url_regexp_replace.js';

// For our PDF container.
const pdfViewerRelatedURL = "pdfviewer.html?target=";
// The match pattern for the URLs to redirect
const redirectPatterns = [
  "*://arxiv.org/*.pdf*", "*://export.arxiv.org/*.pdf*", "*://browse.arxiv.org/*.pdf*", "*://www.arxiv.org/*.pdf*",
  "*://arxiv.org/*pdf*/*", "*://export.arxiv.org/*pdf*/*", "*://browse.arxiv.org/*pdf*/*", "*://www.arxiv.org/*pdf*/*",
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
// Construct PDF viewer URL with zoom parameter
async function constructPDFViewerURLAsync(pdfURL) {
  const result = await browser.storage.sync.get({
    'pdf_viewer_url_prefix': '',
    'pdf_viewer_default_zoom': 'auto'
  });
  var prefix;
  if (result.pdf_viewer_url_prefix === '') {
    // Using custom PDF container, no zoom parameter needed
    prefix = browser.runtime.getURL(pdfViewerRelatedURL);
    return prefix + pdfURL;
  } else {
    // Using external PDF viewer, append zoom parameter
    prefix = result.pdf_viewer_url_prefix;
    const zoom = result.pdf_viewer_default_zoom;
    if (zoom === 'auto') {
      return prefix + pdfURL;
    } else {
      return prefix + pdfURL + '#zoom=' + zoom;
    }
  }
}
// Helper function to remove zoom suffix from URL
function removeZoomSuffix(url) {
  // Remove #zoom=<value> from the end of the URL
  return url.replace(/#zoom=.*$/, '');
}

// Return the target URL parsed from the url.
async function getTargetURLAsync(url) {
  // Remove the prefix for the custom PDF page.
  const prefix = await getPDFViewerURLPrefixAsync();
  if (url.startsWith(prefix)) {
    url = url.substr(prefix.length);
    // Remove zoom suffix if present
    url = removeZoomSuffix(url);
  }
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
  // Create the abstract / PDF page in existing / new tab.
  const openInNewTab = (await browser.storage.sync.get({
    'open_in_new_tab': true
  })).open_in_new_tab;
  if (openInNewTab) {
    await browser.tabs.create({
      url: targetURL,
      index: tab.index + 1,
    });
  } else {
    await browser.tabs.update({
      url: targetURL,
    });
  }
  console.log(LOG_PREFIX, "Opened abstract / PDF page in existing / new tab.");
}
async function onMessage(message) {
  await browser.downloads.download({
    url: message.url,
    filename: message.filename,
    saveAs: false,
  });
  console.log(LOG_PREFIX, `Downloading file: ${message.filename} from ${message.url}.`)
}
// Redirect to custom PDF page.
async function onBeforeWebRequestAsync(requestDetails) {
  if (requestDetails.documentUrl !== undefined) {
    // Request from this plugin itself (the embedded PDF).
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
  const targetURL = await constructPDFViewerURLAsync(url);
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
  let url = bookmarkInfo.url.substr(prefix.length);
  // Remove zoom suffix if present
  url = removeZoomSuffix(url);
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
// Listen to download request
browser.runtime.onMessage.addListener(onMessage);

// Redirect the PDF page to custom PDF container page.
browser.webRequest.onBeforeRequest.addListener(
  onBeforeWebRequestAsync,
  { urls: redirectPatterns },
  ["blocking"]
);
// Capture bookmarking event of custom PDF page.
browser.bookmarks.onCreated.addListener(onCreateBookmarkAsync);
