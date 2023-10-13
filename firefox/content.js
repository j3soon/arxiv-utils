// This content script modifies the title of the abstract page once it has finished loading.
// The PDF page title is not modified here due to the limitations of Firefox.
// Ref: https://bugzilla.mozilla.org/show_bug.cgi?id=1457500

// Regular expressions for parsing arXiv IDs from URLs.
// Ref: https://info.arxiv.org/help/arxiv_identifier_for_services.html#urls-for-standard-arxiv-functions
const ID_REGEXP_REPLACE = [
  [/^.*:\/\/(?:export\.|browse\.)?arxiv\.org\/abs\/(\S*?)\/*(\?.*?)?(\#.*?)?$/, "$1", "Abstract"],
  [/^.*:\/\/(?:export\.|browse\.)?arxiv\.org\/pdf\/(\S*?)(?:\.pdf)?\/*(\?.*?)?(\#.*?)?$/, "$1", "PDF"],
  [/^.*:\/\/(?:export\.|browse\.)?arxiv\.org\/ftp\/(?:arxiv\/|([^\/]*\/))papers\/.*?([^\/]*?)\.pdf(\?.*?)?(\#.*?)?$/, "$1$2", "PDF"],
  [/^.*:\/\/ar5iv\.labs\.arxiv\.org\/html\/(\S*?)\/*(\?.*?)?(\#.*?)?$/, "$1", "HTML5"],
  // For external PDF viewer
  [/^.*:\/\/mozilla\.github\.io\/pdf\.js\/web\/viewer\.html\?file=https:\/\/(?:export\.|browse\.)?arxiv\.org\/pdf\/(\S*?)(?:\.pdf)?\/*$/, "$1"],
];
// All console logs should start with this prefix.
const LOG_PREFIX = "[arXiv-utils]";

// Return the id parsed from the url.
function getId(url) {
  for (const [regexp, replacement, pageType] of ID_REGEXP_REPLACE) {
    if (regexp.test(url))
      return url.replace(regexp, replacement);
  }
  return null;
}
// Return the page type according to the URL.
function getPageType(url) {
  for (const [regexp, replacement, pageType] of ID_REGEXP_REPLACE) {
    if (regexp.test(url))
      return pageType;
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
  const entry = parsedXML.getElementsByTagName("entry")[0];
  // title[0] is query string, title[1] is paper name.
  const title = entry.getElementsByTagName("title")[0].textContent;
  // Long titles will be split into multiple lines, with all lines except the first one starting with two spaces.
  const escapedTitle = title.replace("\n", "").replace("  ", " ");
  // TODO: May need to escape special characters in title?
  const newTitle = `${escapedTitle} | ${pageType}`;
  const firstAuthor = entry.getElementsByTagName("name")[0].textContent;
  const authors = [...entry.getElementsByTagName("name")].map((el) => el.textContent).join(", ");
  const publishedYear = entry.getElementsByTagName("published")[0].textContent.split('-')[0];
  const updatedYear = entry.getElementsByTagName("updated")[0].textContent.split('-')[0];
  const versionRegexp = /^.*:\/\/(?:export\.|browse\.)?arxiv\.org\/abs\/.*v([0-9]*)$/;
  var version = '';
  for (const el of entry.getElementsByTagName("link")) {
    const match = el.getAttribute("href").match(versionRegexp);
    if (match && match[1])
      version = match[1];
  }
  return {
    escapedTitle,
    newTitle,
    firstAuthor,
    authors,
    publishedYear,
    updatedYear,
    version,
  }
}
// Add a custom links in abstract page.
async function addCustomLinksAsync(id, articleInfo) {
  // Add direct download link.
  const result = await browser.storage.sync.get({
    'filename_format': '${title}, ${firstAuthor} et al., ${publishedYear}, v${version}.pdf'
  });
  const fileName = result.filename_format
    .replace('${title}', articleInfo.escapedTitle)
    .replace('${firstAuthor}', articleInfo.firstAuthor)
    .replace('${authors}', articleInfo.authors)
    .replace('${publishedYear}', articleInfo.publishedYear)
    .replace('${updatedYear}', articleInfo.updatedYear)
    .replace('${version}', articleInfo.version)
    .replace('${paperid}', id)
    // Ref: https://en.wikipedia.org/wiki/Filename#Reserved_characters_and_words
    // Ref: https://stackoverflow.com/a/42210346
    .replace(/[/\\?*:|"<>]/g, '_'); // Replace invalid characters.
    ;
  const directURL = `https://arxiv.org/pdf/${id}.pdf`;
  const directDownloadLiId = "arxiv-utils-direct-download-li";
  const directDownloadAId = "arxiv-utils-direct-download-a";
  document.getElementById(directDownloadLiId)?.remove();
  const directDownloadHTML = ` \
    <li id="${directDownloadLiId}"> \
      <a id="${directDownloadAId}" href="#">Direct Download</a> \
    </li>`;
  const downloadUL = document.querySelector(".full-text > ul");
  if (!downloadUL) {
    console.error(LOG_PREFIX, "Error: Cannot find the unordered list inside the Download section at the right side of the abstract page.");
    return;
  }
  downloadUL.innerHTML += directDownloadHTML;
  console.log(LOG_PREFIX, "Added direct download link.")
  document.getElementById(directDownloadAId).addEventListener('click', function(e) {
    browser.runtime.sendMessage({
      url: directURL,
      filename: fileName,
    });
    e.preventDefault();
    console.log(LOG_PREFIX, `Sending download message to download: ${fileName} from ${directURL}.`)
  });
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
      <li><a href="https://export.arxiv.org/api/query/id_list/${id}">RSS feed</a></li> \
    </ul>`;
  elExtraRefCite.after(extraServicesDiv);
}

async function mainAsync() {
  console.log(LOG_PREFIX, "Extension initialized.");
  const url = location.href;
  const pageType = getPageType(url);
  const id = getId(url);
  if (!id) {
    console.error(LOG_PREFIX, "Error: Failed to get paper ID, aborted.");
    return;
  }
  const articleInfo = await getArticleInfoAsync(id, pageType);
  document.title = articleInfo.newTitle;
  console.log(LOG_PREFIX, `Set document title to: ${articleInfo.newTitle}.`);
  if (pageType === "Abstract")
    addCustomLinksAsync(id, articleInfo);
}

// Execute main logic.
mainAsync();
