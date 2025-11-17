// This content script modifies the title of the abstract / PDF page once it has finished loading.

// Regular expressions for parsing arXiv IDs from URLs.
// Ref: https://info.arxiv.org/help/arxiv_identifier_for_services.html#urls-for-standard-arxiv-functions
var ID_REGEXP_REPLACE = [
  [/^.*:\/\/(?:export\.|browse\.|www\.)?arxiv\.org\/abs\/(\S*?)\/*(\?.*?)?(\#.*?)?$/, "$1", "Abstract"],
  [/^.*:\/\/(?:export\.|browse\.|www\.)?arxiv\.org\/pdf\/(\S*?)(?:\.pdf)?\/*(\?.*?)?(\#.*?)?$/, "$1", "PDF"],
  [/^.*:\/\/(?:export\.|browse\.|www\.)?arxiv\.org\/ftp\/(?:arxiv\/|([^\/]*\/))papers\/.*?([^\/]*?)\.pdf(\?.*?)?(\#.*?)?$/, "$1$2", "PDF"],
  [/^.*:\/\/ar5iv\.labs\.arxiv\.org\/html\/(\S*?)\/*(\?.*?)?(\#.*?)?$/, "$1", "HTML5"],
];
// Store new title for onMessage to deal with Chrome PDF viewer bug.
var newTitle = undefined;
// Define onMessage countdown for Chrome PDF viewer bug.
var messageCallbackCountdown = 3;
// All console logs should start with this prefix.
var LOG_PREFIX = "[arXiv-utils]";
// Element IDs for injected links
var DIRECT_DOWNLOAD_LI_ID = "arxiv-utils-direct-download-li";
var DIRECT_DOWNLOAD_A_ID = "arxiv-utils-direct-download-a";
var EXTRA_SERVICES_DIV_ID = "arxiv-utils-extra-services-div";

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
  console.log(LOG_PREFIX, "Retrieving title through ArXiv API request (via background)...");

  // get information via background.
  const resp = await chrome.runtime.sendMessage({
    type: "GET_ARXIV_INFO",
    id: id,
  });

  if (!resp || !resp.ok) {
    console.error(LOG_PREFIX, "Error: ArXiv API request failed in background.", resp && resp.error);
    return;
  }

  const xmlDoc = resp.text;
  const parsedXML = new DOMParser().parseFromString(xmlDoc, "text/xml");
  const entry = parsedXML.getElementsByTagName("entry")[0];
  // title[0] is query string, title[1] is paper name.
  const title = entry.getElementsByTagName("title")[0].textContent;
  // Long titles will be split into multiple lines, with all lines except the first one starting with two spaces.
  const escapedTitle = title.replace("\n", "").replace("  ", " ");
  // TODO: May need to escape special characters in title?
  const newTitle = `${escapedTitle} | ${pageType}`;
  const firstAuthor = entry.getElementsByTagName("name")[0].textContent;
  const firstAuthorFamilyName = firstAuthor.split(" ").pop();
  const firstAuthorFamilyNameLowerCase = firstAuthorFamilyName.toLowerCase();
  const authors = [...entry.getElementsByTagName("name")].map((el) => el.textContent).join(", ");
  const publishedDateSplit = entry.getElementsByTagName("published")[0].textContent.split("-");
  const updatedDateSplit = entry.getElementsByTagName("updated")[0].textContent.split("-");
  const publishedYear = publishedDateSplit[0];
  const updatedYear = updatedDateSplit[0];
  const publishedYear2Digits = publishedYear.slice(-2);
  const updatedYear2Digits = updatedYear.slice(-2);
  const publishedMonth = publishedDateSplit[1];
  const updatedMonth = updatedDateSplit[1];
  const publishedDay = publishedDateSplit[2].split("T")[0];
  const updatedDay = updatedDateSplit[2].split("T")[0];
  const versionRegexp = /^.*:\/\/(?:export\.|browse\.|www\.)?arxiv\.org\/abs\/.*v([0-9]*)$/;
  var version = "";
  for (const el of entry.getElementsByTagName("link")) {
    const match = el.getAttribute("href").match(versionRegexp);
    if (match && match[1]) {
      version = match[1];
      break;
    }
  }

  return {
    escapedTitle,
    newTitle,
    firstAuthor,
    firstAuthorFamilyName,
    firstAuthorFamilyNameLowerCase,
    authors,
    publishedYear,
    updatedYear,
    publishedYear2Digits,
    updatedYear2Digits,
    publishedMonth,
    updatedMonth,
    publishedDay,
    updatedDay,
    version,
  };
}

// Add custom links in abstract page.
function addCustomLinksAsync(id) {
  document.getElementById(DIRECT_DOWNLOAD_LI_ID)?.remove();
  const directDownloadHTML = ` \
    <li id="${DIRECT_DOWNLOAD_LI_ID}"> \
      <a id="${DIRECT_DOWNLOAD_A_ID}">Direct Download</a> \
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
  document.getElementById(EXTRA_SERVICES_DIV_ID)?.remove();
  const extraServicesDiv = document.createElement("div");
  extraServicesDiv.classList.add('extra-ref-cite');
  extraServicesDiv.id = EXTRA_SERVICES_DIV_ID;
  extraServicesDiv.innerHTML = ` \
    <h3>Extra Services</h3> \
    <ul> \
      <li><a href="https://ar5iv.labs.arxiv.org/html/${id}">ar5iv (HTML 5)</a></li> \
      <li><a href="https://alphaxiv.org/abs/${id}">alphaXiv</a></li> \
      <li><a href="https://export.arxiv.org/api/query/id_list/${id}">RSS feed</a></li> \
    </ul>`;
  elExtraRefCite.after(extraServicesDiv);
  console.log(LOG_PREFIX, "Added extra services links.")
}

async function enableDirectDownload(id, articleInfo) {
  // Add direct download link.
  const result = await chrome.storage.sync.get({
    'filename_format': '${title}, ${firstAuthor} et al., ${publishedYear}, v${version}.pdf'
  });
  const fileName = result.filename_format
    .replace('${title}', articleInfo.escapedTitle)
    .replace('${firstAuthor}', articleInfo.firstAuthor)
    .replace('${firstAuthorFamilyName}', articleInfo.firstAuthorFamilyName)
    .replace('${firstAuthorFamilyNameLowerCase}', articleInfo.firstAuthorFamilyNameLowerCase)
    .replace('${authors}', articleInfo.authors)
    .replace('${publishedYear}', articleInfo.publishedYear)
    .replace('${updatedYear}', articleInfo.updatedYear)
    .replace('${publishedYear2Digits}', articleInfo.publishedYear2Digits)
    .replace('${updatedYear2Digits}', articleInfo.updatedYear2Digits)
    .replace('${publishedMonth}', articleInfo.publishedMonth)
    .replace('${updatedMonth}', articleInfo.updatedMonth)
    .replace('${publishedDay}', articleInfo.publishedDay)
    .replace('${updatedDay}', articleInfo.updatedDay)
    .replace('${version}', articleInfo.version)
    .replace('${paperid}', id)
    // Replace invalid characters.
    // Ref: https://en.wikipedia.org/wiki/Filename#Reserved_characters_and_words
    // Ref: https://stackoverflow.com/a/42210346
    .replace(/[/:]/g, ',')
    .replace(/[/\\?*|"<>]/g, '_')
    .replace(/\n/g, '') // Replace newline, which exists in some titles that are too long.
  ;
  const directURL = `https://arxiv.org/pdf/${id}.pdf`;
  const downloadA = document.getElementById(DIRECT_DOWNLOAD_A_ID)
  downloadA.addEventListener('click', function (e) {
    chrome.runtime.sendMessage({
      url: directURL,
      filename: fileName,
    });
    e.preventDefault();
    console.log(LOG_PREFIX, `Sending download message to download: ${fileName} from ${directURL}.`)
  });
  downloadA.href = "#";
  console.log(LOG_PREFIX, "Enabled direct download.")
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
  const pageType = getPageType(url);
  const id = getId(url);
  if (!id) {
    console.error(LOG_PREFIX, "Error: Failed to get paper ID, aborted.");
    return;
  }
  if (pageType === "Abstract")
    addCustomLinksAsync(id);
  const articleInfo = await getArticleInfoAsync(id, pageType);
  document.title = articleInfo.newTitle;
  console.log(LOG_PREFIX, `Set document title to: ${articleInfo.newTitle}.`);
  if (pageType === "Abstract")
    await enableDirectDownload(id, articleInfo);
  // Store new title for onMessage.
  newTitle = articleInfo.newTitle
}

// Execute main logic.
mainAsync();
// Listen for title-change messages from the background script.
chrome.runtime.onMessage.addListener(onMessageAsync);
