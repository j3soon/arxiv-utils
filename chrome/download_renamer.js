// Renames arXiv PDFs that were saved by something other than this extension's
// "Direct Download" link, e.g. the download button of the Google Scholar PDF Reader
// or Chrome's built-in PDF viewer.
//
// The Scholar PDF Reader saves the PDF from a `blob:` URL and names it after the last
// part of the original URL, so an arXiv paper arrives as e.g. `2401.02524v2.pdf`.
// We recognise that name, look the paper up in the arXiv API and suggest the
// filename built from the user's filename format.
//
// The filename helpers below mirror the ones in content.js (which is a classic
// content script and cannot be imported from this module).

const LOG_PREFIX = "[arXiv-utils]";
const DEFAULT_FILENAME_FORMAT = '${title}, ${firstAuthor} et al., ${publishedYear}, v${version}.pdf';
const DEFAULT_FILENAME_REPLACEMENT_RULES = '[]';
const API_TIMEOUT_MS = 8000;

// New-style arXiv ids (0704.0001 onwards), optionally with a version and .pdf suffix.
const ARXIV_FILENAME_REGEXP = /^(\d{4}\.\d{4,5}(?:v\d+)?)(?:\.pdf)?$/i;
const ARXIV_URL_REGEXP = /^https?:\/\/(?:export\.|browse\.|www\.)?arxiv\.org\/pdf\//i;

// Filenames this extension already chose for its own downloads, keyed by URL. Each URL
// keeps a queue, because the same PDF can be requested again before the first
// download reaches onDeterminingFilename (e.g., a double click, or the content script
// being injected twice right after installation).
const ownDownloadFilenames = new Map();

// Returns a function that removes this entry again, for when the download fails to
// start and onDeterminingFilename will never consume it.
export function rememberOwnDownload(url, filename) {
  const entry = { filename };
  const queue = ownDownloadFilenames.get(url) || [];
  queue.push(entry);
  ownDownloadFilenames.set(url, queue);
  return () => {
    const current = ownDownloadFilenames.get(url);
    const index = current ? current.indexOf(entry) : -1;
    if (index === -1)
      return;
    current.splice(index, 1);
    if (!current.length)
      ownDownloadFilenames.delete(url);
  };
}

function takeOwnDownloadFilename(url) {
  const queue = ownDownloadFilenames.get(url);
  if (!queue)
    return undefined;
  const entry = queue.shift();
  if (!queue.length)
    ownDownloadFilenames.delete(url);
  return entry.filename;
}

function basename(path) {
  return (path || '').split(/[\\/]/).pop();
}

// Return the arXiv id if this download looks like an arXiv PDF, otherwise null.
export function getArxivIdFromDownload(item) {
  const url = item.finalUrl || item.url || '';
  const fromBlob = url.startsWith('blob:');
  const fromArxiv = ARXIV_URL_REGEXP.test(url);
  if (!fromBlob && !fromArxiv)
    return null;
  const match = basename(item.filename).match(ARXIV_FILENAME_REGEXP);
  return match ? match[1] : null;
}

function decodeXmlEntities(text) {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function getTagText(xml, tag) {
  const match = xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`));
  return match ? decodeXmlEntities(match[1]).trim() : '';
}

// Service workers have no DOMParser, so the Atom response is read with regular expressions.
export function parseArticleInfo(xml) {
  const entryMatch = xml.match(/<entry>([\s\S]*?)<\/entry>/);
  if (!entryMatch)
    return null;
  const entry = entryMatch[1];
  const escapedTitle = getTagText(entry, 'title').replace(/\s+/g, ' ');
  if (!escapedTitle || escapedTitle === 'Error')
    return null;
  const names = [...entry.matchAll(/<name>([\s\S]*?)<\/name>/g)].map(m => decodeXmlEntities(m[1]).trim());
  const firstAuthor = names[0] || '';
  const firstAuthorFamilyName = firstAuthor.split(' ').pop();
  const published = getTagText(entry, 'published').split('-');
  const updated = getTagText(entry, 'updated').split('-');
  const versionMatch = entry.match(/href="[^"]*arxiv\.org\/abs\/[^"]*v(\d+)"/);
  return {
    escapedTitle,
    firstAuthor,
    firstAuthorFamilyName,
    firstAuthorFamilyNameLowerCase: firstAuthorFamilyName.toLowerCase(),
    authors: names.join(', '),
    publishedYear: published[0] || '',
    updatedYear: updated[0] || '',
    publishedYear2Digits: (published[0] || '').slice(-2),
    updatedYear2Digits: (updated[0] || '').slice(-2),
    publishedMonth: published[1] || '',
    updatedMonth: updated[1] || '',
    publishedDay: (published[2] || '').split('T')[0],
    updatedDay: (updated[2] || '').split('T')[0],
    version: versionMatch ? versionMatch[1] : '',
  };
}

function formatFileName(filenameFormat, id, articleInfo) {
  return filenameFormat
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
  ;
}

function parseFilenameReplacementRules(rulesText) {
  try {
    const rules = JSON.parse(rulesText);
    if (Array.isArray(rules) && rules.every(r => r && typeof r.from === 'string' && r.from !== '' && typeof r.to === 'string'))
      return rules;
  } catch (error) { /* fall through */ }
  console.error(LOG_PREFIX, "Error: Invalid filename replacement rules. Falling back to default rules.");
  return [];
}

function applyFilenameReplacementRules(fileName, rules) {
  const MAX_FILENAME_BYTES = 255;
  const pdfSuffix = fileName.match(/(\.pdf)\s*$/i);
  if (pdfSuffix)
    fileName = fileName.slice(0, -pdfSuffix[0].length);
  const suffix = pdfSuffix?.[1] || '';
  if (rules.length) {
    const replacements = new Map();
    for (const rule of rules)
      if (!replacements.has(rule.from)) replacements.set(rule.from, rule.to);
    const pattern = new RegExp(rules.map(rule => rule.from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'gu');
    fileName = fileName.replace(pattern, match => replacements.get(match));
  }
  fileName = fileName
    .replace(/[/:]/g, ',')
    .replace(/[\\?*|"<>]/g, '_')
    .replace(/\n/g, '');
  const encoder = new TextEncoder();
  const maxBaseBytes = MAX_FILENAME_BYTES - encoder.encode(suffix).length;
  let base = '';
  let bytes = 0;
  for (const char of fileName) {
    const charBytes = encoder.encode(char).length;
    if (bytes + charBytes > maxBaseBytes) break;
    base += char;
    bytes += charBytes;
  }
  base = base.replace(/^\.+|\.+$/g, '_');
  return (base || 'download') + suffix;
}

export async function buildFilenameAsync(id, fetchImpl = fetch, storage = chrome.storage.sync) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  let xml;
  try {
    const response = await fetchImpl(`https://export.arxiv.org/api/query?id_list=${id}`, { signal: controller.signal });
    if (!response.ok)
      throw new Error(`HTTP ${response.status}`);
    xml = await response.text();
  } finally {
    clearTimeout(timer);
  }
  const articleInfo = parseArticleInfo(xml);
  if (!articleInfo)
    throw new Error('No article found in arXiv API response');
  const options = await storage.get({
    'filename_format': DEFAULT_FILENAME_FORMAT,
    'filename_replacement_rules': DEFAULT_FILENAME_REPLACEMENT_RULES,
  });
  return applyFilenameReplacementRules(
    formatFileName(options.filename_format, id, articleInfo),
    parseFilenameReplacementRules(options.filename_replacement_rules)
  );
}

// Listener for chrome.downloads.onDeterminingFilename.
export function onDeterminingFilename(item, suggest) {
  // Keep the name this extension chose for its own "Direct Download" link.
  if (item.byExtensionId === chrome.runtime.id) {
    const ownFilename = takeOwnDownloadFilename(item.url);
    if (ownFilename) {
      suggest({ filename: ownFilename, conflictAction: 'uniquify' });
      return;
    }
    suggest();
    return;
  }
  const id = getArxivIdFromDownload(item);
  if (!id) {
    suggest();
    return;
  }
  buildFilenameAsync(id).then(filename => {
    console.log(LOG_PREFIX, `Renaming downloaded ${basename(item.filename)} to: ${filename}`);
    suggest({ filename, conflictAction: 'uniquify' });
  }).catch(error => {
    console.error(LOG_PREFIX, `Could not rename download of ${id}, keeping original name.`, error);
    suggest();
  });
  // Tell Chrome we will call suggest asynchronously.
  return true;
}
