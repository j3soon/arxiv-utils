// This content script modifies the title of the abstract / PDF page once it has finished loading.

// Store new title for onMessage.
var newTitle = undefined;
// Regular expressions for parsing arXiv URLs.
// Ref: https://info.arxiv.org/help/arxiv_identifier_for_services.html#urls-for-standard-arxiv-functions
const ABS_REGEXP = /arxiv\.org\/abs\/([\S]*?)\/*$/;
const PDF_REGEXP = /arxiv\.org\/(?:pdf|ftp)\/.*?([^\/]*?)(?:\.pdf)?\/*$/;
// Define onMessage countdown for Chrome PDF viewer bug.
var messageCallbackCountdown = 3;
// All console logs should start with this prefix.
const LOG_PREFIX = "[arXiv-utils]";

// Return the id parsed from the url.
function getId(url, pageType) {
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
// Add a custom links in abstract page.
async function addCustomLinksAsync(id, articleInfo) {
  // Add direct download link.
  const result = await chrome.storage.sync.get({
    'filename_format': '${title}, ${firstAuthor} et al., ${publishedYear}.pdf'
  });
  const fileNameFormat = result.filename_format;
  const fileName = fileNameFormat
    .replace('${title}', articleInfo.escapedTitle)
    .replace('${firstAuthor}', articleInfo.firstAuthor)
    .replace('${publishedYear}', articleInfo.publishedYear);
  const directURL = `https://arxiv.org/pdf/${id}.pdf`;
  const directDownloadId = "arxiv-utils-direct-download-li";
  document.getElementById(directDownloadId)?.remove();
  const directDownloadHTML = ` \
    <li id="${directDownloadId}"> \
      <a href="${directURL}" download="${fileName}" type="application/pdf">Direct Download</a> \
    </li>`;
  const downloadUL = document.querySelector(".full-text > ul");
  if (!downloadUL) {
    console.error(LOG_PREFIX, "Error: Cannot find the unordered list inside the Download section at the right side of the abstract page.");
    return;
  }
  downloadUL.innerHTML += directDownloadHTML;
  console.log(LOG_PREFIX, "Added direct download link.")
  // Add extra services links.
  const elExtraRefCite = document.querySelector(".extra-ref-cite");
  if (!elExtraRefCite) {
    console.error(LOG_PREFIX, "Error: Cannot find the References & Citations section at the right side of the abstract page.");
    return;
  }
  const extraServicesId = "arxiv-utils-extra-services-div";
  document.getElementById(extraServicesId)?.remove();
  const extraServicesDiv = document.createElement("div");
  extraServicesDiv.classList.add('extra-ref-cite');
  extraServicesDiv.id = extraServicesId;
  extraServicesDiv.innerHTML = ` \
    <h3>Extra Services</h3> \
    <ul> \
      <li><a href="https://ar5iv.labs.arxiv.org/html/${id}">ar5iv (HTML 5)</a></li> \
      <li><a href="https://www.arxiv-vanity.com/papers/${id}">arXiv Vanity</a></li> \
    </ul>`;
  elExtraRefCite.after(extraServicesDiv);
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
    addCustomLinksAsync(id, articleInfo);
  // Store new title for onMessage.
  newTitle = articleInfo.newTitle
}

// Execute main logic.
mainAsync();
// Listen for title-change messages from the background script.
chrome.runtime.onMessage.addListener(onMessageAsync);
