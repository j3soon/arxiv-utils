// This content script modifies the title of the abstract / PDF page once it has finished loading.

// Store new title for onMessage.
var newTitle = undefined;
// Regular expressions for parsing arXiv URLs.
// Ref: https://info.arxiv.org/help/arxiv_identifier_for_services.html#urls-for-standard-arxiv-functions
const ABS_REGEXP = /arxiv\.org\/abs\/([\S]*)$/;
const PDF_REGEXP = /arxiv\.org\/[\S]*\/([^\/]*)$/;
// TODO: May deal with `.pdf` and trailing slash in regexp.
// TODO: Change `[\S]*` to `(?:pdf|ftp)`.
// TODO: The above changes also need to be applied to background script.
// Define onMessage countdown for Chrome PDF viewer bug.
var messageCallbackCountdown = 3;
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
// Get article information through arXiv API asynchronously.
// Ref: https://info.arxiv.org/help/api/user-manual.html#31-calling-the-api
async function getArticleInfoAsync(id, pageType) {
  console.log(LOG_PREFIX, "Retrieving title through ArXiv API request...");
  const response = await fetch(`https://export.arxiv.org/api/query?id_list=${id}`);
  if (!response.ok) {
    console.error(LOG_PREFIX, "Error: ArXiv API request failed.");
    return;
  }
  const xmlDoc = await response.text();
  const parsedXML = new DOMParser().parseFromString(xmlDoc, 'text/xml');
  // title[0] is query string, title[1] is paper name.
  const title = parsedXML.getElementsByTagName("title")[1].textContent;
  // Long titles will be split into multiple lines, with all lines except the first one starting with two spaces.
  const escapedTitle = title.replace("\n", "").replace("  ", " ");
  // TODO: May need to escape special characters in title?
  const newTitle = `${escapedTitle} | ${pageType}`;
  const firstAuthor = parsedXML.getElementsByTagName("name")[0].textContent;
  const publishedYear = parsedXML.getElementsByTagName("published")[0].textContent.split('-')[0];
  return {
    escapedTitle,
    newTitle,
    firstAuthor,
    publishedYear,
  }
}
// Add a direct download link in abstract page.
function addDownloadLinkAsync(id, articleInfo) {
  chrome.storage.sync.get({
    'filename_format': '${title}, ${firstAuthor} et al., ${publishedYear}.pdf'
  }, (result) => {
    const fileNameFormat = result.filename_format;
    const fileName = fileNameFormat
      .replace('${title}', articleInfo.escapedTitle)
      .replace('${firstAuthor}', articleInfo.firstAuthor)
      .replace('${publishedYear}', articleInfo.publishedYear);
    const directURL = `https://arxiv.org/pdf/${id}.pdf`;
    const htmlInsert = `<li><a href="${directURL}" download="${fileName}" type="application/pdf">Direct Download</a></li>`;
    const elUL = document.querySelector(".full-text > ul");
    if (!elUL) {
      console.error(LOG_PREFIX, "Error: Cannot find the unordered list inside the Download section at the right side of the abstract page.");
      return;
    }
    elUL.innerHTML += htmlInsert;
    console.log(LOG_PREFIX, "Added direct download link.")
  });
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
  // const elHtml = document.querySelector("html");
  // if (elHtml) {
  //   const htmlInsert = `<head><title>${newTitle}</title></head>`;
  //   elHtml.insertAdjacentHTML('afterbegin', htmlInsert);
  //   console.log(`${LOG_PREFIX} Modify <html> tag by inserting before first child.`);
  //   return;
  // }
  console.error(LOG_PREFIX, "Error: Cannot insert title");
}

async function mainAsync() {
  console.log(LOG_PREFIX, "Extension initialized.");
  const url = location.href;
  const pageType = url.includes("pdf") ? "PDF" : "Abstract";
  const id = getId(url, pageType);
  if (id === null) {
    console.error(LOG_PREFIX, "Error: Failed to get paper ID, aborted.");
    return;
  }
  const articleInfo = await getArticleInfoAsync(id, pageType);
  document.title = articleInfo.newTitle;
  console.log(LOG_PREFIX, `Set document title to: ${articleInfo.newTitle}.`);
  if (pageType === "Abstract")
    addDownloadLinkAsync(id, articleInfo);
  // Store new title for onMessage.
  newTitle = articleInfo.newTitle
}

// Execute main logic.
mainAsync();
// Listen for title-change messages from the background script.
chrome.runtime.onMessage.addListener(onMessageAsync);
