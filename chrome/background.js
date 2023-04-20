// This background script implements the extension button,
// and triggers the content script upon tab title change.

// Regular expressions for parsing arXiv URLs.
// Ref: https://info.arxiv.org/help/arxiv_identifier_for_services.html#urls-for-standard-arxiv-functions
const ABS_REGEXP = /arxiv\.org\/abs\/(\S*?)\/*$/;
const PDF_REGEXP = /arxiv\.org\/pdf\/(\S*?)(?:\.pdf)?\/*$/;
const FTP_REGEXP = /arxiv\.org\/ftp\/(?:arxiv\/|([^\/]*\/))papers\/.*?([^\/]*?)\.pdf$/;
// All console logs should start with this prefix.
const LOG_PREFIX = "[arXiv-utils]";

// Return the id parsed from the url.
function getId(url) {
  const match_abs = url.match(ABS_REGEXP);
  const match_pdf = url.match(PDF_REGEXP);
  const match_ftp = url.match(FTP_REGEXP);
  // string.match() returns null if no match found.
  return match_abs && match_abs[1] ||
         match_pdf && match_pdf[1] ||
         match_ftp && match_ftp[2] && [match_ftp[1], match_ftp[2]].join('');
}
// Update the state of the extension button (i.e., browser action)
async function updateActionStateAsync(tabId, url) {
  const id = getId(url);
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
  const id = getId(tab.url);
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
  const pageType = tab.url.includes("abs") ? "Abstract" : "PDF";
  const id = getId(tab.url);
  if (!id) {
    console.error(LOG_PREFIX, "Error: Failed to get paper ID, aborted.");
    return;
  }
  // Construct the target URL.
  const targetURL = (pageType === "Abstract") ? `https://arxiv.org/pdf/${id}.pdf` : `https://arxiv.org/abs/${id}`;
  // Create the abstract / PDF page in new tab.
  await chrome.tabs.create({
    url: targetURL,
    index: tab.index + 1,
  });
  console.log(LOG_PREFIX, "Opened abstract / PDF page in new tab.");
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

// Listen to on extension install event.
chrome.runtime.onInstalled.addListener(onInstalled);
injectContentScriptsAsync();
