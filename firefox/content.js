// This content script modifies the title of the abstract page once it has finished loading.
// The PDF page title is not modified here due to the limitations of Firefox.
// Ref: https://bugzilla.mozilla.org/show_bug.cgi?id=1457500

// Regular expressions for parsing arXiv IDs from URLs.
// Ref: https://info.arxiv.org/help/arxiv_identifier_for_services.html#urls-for-standard-arxiv-functions
const ID_REGEXP_REPLACE = [
  [/^.*:\/\/(?:export\.)?arxiv\.org\/abs\/(\S*?)\/*$/, "$1"],
  [/^.*:\/\/(?:export\.)?arxiv\.org\/pdf\/(\S*?)(?:\.pdf)?\/*$/, "$1"],
  [/^.*:\/\/(?:export\.)?arxiv\.org\/ftp\/(?:arxiv\/|([^\/]*\/))papers\/.*?([^\/]*?)\.pdf$/, "$1$2"],
];
// All console logs should start with this prefix.
const LOG_PREFIX = "[arXiv-utils]";

// Return the id parsed from the url.
function getId(url) {
  for (const [regexp, replacement] of ID_REGEXP_REPLACE) {
    if (regexp.test(url))
      return url.replace(regexp, replacement);
  }
  return null;
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
  const result = await browser.storage.sync.get({
    'filename_format': '${title}, ${firstAuthor} et al., ${publishedYear}.pdf'
  });
  const fileNameFormat = result.filename_format;
  const fileName = fileNameFormat
    .replace('${title}', articleInfo.escapedTitle)
    .replace('${firstAuthor}', articleInfo.firstAuthor)
    .replace('${publishedYear}', articleInfo.publishedYear);
  const directURL = `https://arxiv.org/pdf/${id}.pdf?download`;
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

async function mainAsync() {
  console.log(LOG_PREFIX, "Extension initialized.");
  const url = location.href;
  const id = getId(url);
  if (!id) {
    console.error(LOG_PREFIX, "Error: Failed to get paper ID, aborted.");
    return;
  }
  const articleInfo = await getArticleInfoAsync(id, "Abstract");
  document.title = articleInfo.newTitle;
  console.log(LOG_PREFIX, `Set document title to: ${articleInfo.newTitle}.`);
  addCustomLinksAsync(id, articleInfo);
}

// Execute main logic.
mainAsync();
