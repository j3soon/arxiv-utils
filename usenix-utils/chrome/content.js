// This content script renames the USENIX presentation / PDF page title to the paper's title.

// We intentionally use global `var` instead of `const` to prevent 'Identifier already declared'
// errors when Chrome injects the content script multiple times.

// Regular expressions for parsing USENIX URLs.
var USENIX_PDF_REGEXP = /^.*:\/\/(?:www\.)?usenix\.org\/system\/files\/([a-z]+\d+)-(.+?)\.pdf(\?.*?)?(\#.*?)?$/;
var USENIX_ABS_REGEXP = /^.*:\/\/(?:www\.)?usenix\.org\/conference\/([^\/]+)\/presentation\/([^\/\?#]+)\/*(\?.*?)?(\#.*?)?$/;
// Store new title for onMessage to deal with Chrome PDF viewer bug.
var newTitle = undefined;
// Define onMessage countdown for Chrome PDF viewer bug.
var messageCallbackCountdown = 3;
// All console logs should start with this prefix.
var LOG_PREFIX = "[USENIX-utils]";

// Return USENIX page info parsed from the URL.
function getUsenixInfo(url) {
  var match = url.match(USENIX_PDF_REGEXP);
  if (match) return { conference: match[1], slug: match[2], pageType: "PDF" };
  match = url.match(USENIX_ABS_REGEXP);
  if (match) return { conference: match[1], slug: match[2], pageType: "Abstract" };
  return null;
}
// Get USENIX article information by scraping the presentation page.
async function getUsenixArticleInfoAsync(conference, slug, pageType) {
  var presentationURL = `https://www.usenix.org/conference/${conference}/presentation/${slug}`;
  console.log(LOG_PREFIX, `Retrieving title from USENIX page: ${presentationURL}`);
  var result = await chrome.runtime.sendMessage({
    type: 'fetchPageHTML',
    url: presentationURL
  });
  if (!result.success) {
    console.error(LOG_PREFIX, "Error: USENIX page request failed.", result.error);
    return null;
  }
  var parser = new DOMParser();
  var doc = parser.parseFromString(result.data, 'text/html');
  var title = "";
  var el = doc.querySelector('meta[name="citation_title"]');
  if (el) title = el.getAttribute('content') || "";
  if (!title) {
    el = doc.querySelector('.page-title');
    if (el) title = el.textContent.trim();
  }
  if (!title) {
    el = doc.querySelector('article h1');
    if (el) title = el.textContent.trim();
  }
  if (!title) {
    console.error(LOG_PREFIX, "Error: Could not extract title from USENIX page.");
    return null;
  }
  var escapedTitle = title.replace(/\n/g, "").replace(/\s+/g, " ").trim();
  var usenixNewTitle = `${escapedTitle} | ${pageType}`;
  return { escapedTitle, newTitle: usenixNewTitle };
}

// The PDF viewer in Chrome has a bug that will overwrite the title of the page after loading the PDF.
// Change the PDF page title again if the loading process is long enough for this bug to occur.
// Ref: https://stackoverflow.com/a/69408967
async function onMessageAsync(tab, sender, sendResponse) {
  console.log(LOG_PREFIX, `Tab title changed to: ${tab.title}`);
  if (!newTitle || tab.title === newTitle)
    return;
  console.log(LOG_PREFIX, "Tab title has been changed by others!");
  console.log(LOG_PREFIX, `Trying to change title to: ${newTitle} after 1 second`);
  await new Promise(r => setTimeout(r, 1000));
  if (messageCallbackCountdown <= 0) {
    console.log(LOG_PREFIX, "Title insertion stopped. Assuming the title is correct now.");
    return;
  }
  messageCallbackCountdown--;
  // Setting `document.title` does not work when this bug occur.
  const elTitle = document.querySelector("title");
  if (elTitle) {
    elTitle.innerText = newTitle;
    console.log(LOG_PREFIX, "Modify <title> tag directly.");
    return;
  }
  console.error(LOG_PREFIX, "Error: Cannot insert title");
}

async function mainAsync() {
  console.log(LOG_PREFIX, "Extension initialized.");
  const url = location.href;
  const usenixInfo = getUsenixInfo(url);
  if (!usenixInfo) {
    console.error(LOG_PREFIX, "Error: Not a recognized USENIX URL, aborted.");
    return;
  }
  const articleInfo = await getUsenixArticleInfoAsync(usenixInfo.conference, usenixInfo.slug, usenixInfo.pageType);
  if (!articleInfo) return;
  document.title = articleInfo.newTitle;
  newTitle = articleInfo.newTitle;
  console.log(LOG_PREFIX, `Set document title to: ${articleInfo.newTitle}.`);
}

// Execute main logic.
mainAsync();
// Listen for title-change messages from the background script.
chrome.runtime.onMessage.addListener(onMessageAsync);
