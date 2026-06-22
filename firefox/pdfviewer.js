// This script modifies the title of the PDF in the container once it has finished loading.

// Regular expressions for parsing arXiv IDs from URLs.
// Ref: https://info.arxiv.org/help/arxiv_identifier_for_services.html#urls-for-standard-arxiv-functions
const ID_REGEXP_REPLACE = [
  [/^.*:\/\/(?:export\.|browse\.|www\.)?arxiv\.org\/pdf\/(\S*?)(?:\.pdf)?\/*(\?.*?)?(\#.*?)?$/, "$1"],
  [/^.*:\/\/(?:export\.|browse\.|www\.)?arxiv\.org\/ftp\/(?:arxiv\/|([^\/]*\/))papers\/.*?([^\/]*?)\.pdf(\?.*?)?(\#.*?)?$/, "$1$2"],
];
// Regular expression for parsing USENIX PDF URLs.
const USENIX_PDF_REGEXP = /^.*:\/\/(?:www\.)?usenix\.org\/system\/files\/([a-z]+\d+)-(.+?)\.pdf(\?.*?)?(\#.*?)?$/;
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
// Return USENIX page info parsed from the URL.
function getUsenixInfo(url) {
  const match = url.match(USENIX_PDF_REGEXP);
  if (match) return { conference: match[1], slug: match[2] };
  return null;
}
// Get USENIX article information by scraping the presentation page.
async function getUsenixArticleInfoAsync(conference, slug, pageType) {
  const presentationURL = `https://www.usenix.org/conference/${conference}/presentation/${slug}`;
  console.log(LOG_PREFIX, `Retrieving title from USENIX page: ${presentationURL}`);
  const response = await fetch(presentationURL);
  if (!response.ok) {
    console.error(LOG_PREFIX, "Error: USENIX page request failed.");
    return null;
  }
  const html = await response.text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
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
  const escapedTitle = title.replace(/\n/g, "").replace(/\s+/g, " ").trim();
  const newTitle = `${escapedTitle} | ${pageType}`;
  return { escapedTitle, newTitle };
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
  return {
    escapedTitle,
    newTitle,
  }
}

async function mainAsync() {
  // Extract the pdf url from 'pdfviewer.html?target=<pdfURL>'.
  const url = new URL(window.location.href).searchParams.get("target");

  // Get zoom setting from storage
  const result = await browser.storage.sync.get({
    'pdf_viewer_default_zoom': 'auto'
  });
  const zoom = result.pdf_viewer_default_zoom;

  // Construct the final URL with zoom parameter
  let finalUrl = url;
  if (zoom !== 'auto') {
    finalUrl += '#zoom=' + zoom;
  }

  // Inject PDF before querying the API to load the PDF as soon as
  // possible in the case of slow response from the API.
  const elContainer = document.getElementById("container");
  elContainer.innerHTML += `<iframe src="${finalUrl}"></iframe>`;
  console.log(LOG_PREFIX, "Injected PDF: " + finalUrl);
  // Check if USENIX URL.
  const usenixInfo = getUsenixInfo(url);
  if (usenixInfo) {
    const usenixArticleInfo = await getUsenixArticleInfoAsync(usenixInfo.conference, usenixInfo.slug, "PDF");
    if (usenixArticleInfo) {
      document.title = usenixArticleInfo.newTitle;
      console.log(LOG_PREFIX, `Set document title to: ${usenixArticleInfo.newTitle}.`);
    }
    return;
  }
  // Query the arXiv API to get the title.
  const pageType = url.includes("abs") ? "Abstract" : "PDF";
  const id = getId(url);
  if (!id) {
    console.error(LOG_PREFIX, "Error: Failed to get paper ID, aborted.");
    return;
  }
  const articleInfo = await getArticleInfoAsync(id, pageType);
  document.title = articleInfo.newTitle;
  console.log(LOG_PREFIX, `Set document title to: ${articleInfo.newTitle}.`);
}

// Execute main logic.
mainAsync();
