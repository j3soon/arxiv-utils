// This content script modifies the title of the abstract page once it has finished loading.
// The PDF page title is not modified here due to the limitations of Firefox.
// Ref: https://bugzilla.mozilla.org/show_bug.cgi?id=1457500

// Regular expressions for parsing arXiv URLs.
// Ref: https://info.arxiv.org/help/arxiv_identifier_for_services.html#urls-for-standard-arxiv-functions
const ABS_REGEXP = /arxiv\.org\/abs\/([\S]*)$/;
const PDF_REGEXP = /arxiv\.org\/[\S]*\/([^\/]*)$/;
// TODO: May deal with `.pdf` and trailing slash in regexp.
// TODO: Change `[\S]*` to `(?:pdf|ftp)`.
// TODO: The above changes also need to be applied to background script.
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
    const directURL = `https://arxiv.org/pdf/${id}.pdf?download`;
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

async function mainAsync() {
  console.log(LOG_PREFIX, "Extension initialized.");
  const url = location.href;
  const id = getId(url);
  if (id === null) {
    console.error(LOG_PREFIX, "Error: Failed to get paper ID, aborted.");
    return;
  }
  const articleInfo = await getArticleInfoAsync(id, "Abstract");
  document.title = articleInfo.newTitle;
  console.log(LOG_PREFIX, `Set document title to: ${articleInfo.newTitle}.`);
  addDownloadLinkAsync(id, articleInfo);
}

// Execute main logic.
mainAsync();
