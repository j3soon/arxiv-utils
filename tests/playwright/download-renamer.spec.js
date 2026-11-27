const { expect } = require('@playwright/test');
const { test, paperId, abstractUrl, pdfUrl } = require('./fixtures');

// Mimics the Google Scholar PDF Reader: a sandboxed (origin "null") frame saves the
// PDF from a blob: URL, named after the last part of the original URL.
function scholarReaderLikeHtml(suggestedName) {
  const frame = `<body><script>
    const blob = new Blob(['%PDF-1.4 test'], { type: 'application/pdf' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = ${JSON.stringify(suggestedName)};
    a.id = 'save';
    a.textContent = 'save';
    document.body.appendChild(a);
  <\/script>`;
  return `<!doctype html><iframe id="reader" sandbox="allow-scripts allow-downloads"
    srcdoc="${frame.replace(/"/g, '&quot;')}"></iframe>`;
}

// Waits for the latest download to finish (or fail: downloads from arxiv.org cannot
// be served by Playwright routes, but the filename is already chosen by then).
// The Direct Download request goes to the real arxiv.org, so allow time for the network.
async function lastDownload(worker, timeout = 20000) {
  await expect.poll(() => worker.evaluate(async () => {
    const items = await chrome.downloads.search({});
    return items.length > 0 && items.every(item => item.state !== 'in_progress');
  }), { timeout }).toBe(true);
  return worker.evaluate(async () =>
    (await chrome.downloads.search({ orderBy: ['-startTime'], limit: 1 }))[0]);
}

function basename(p) { return p.split(/[\\/]/).pop(); }

// Playwright normally takes over downloads and stores them under random names, which
// bypasses extensions. Hand downloads back to Chrome so onDeterminingFilename runs.
// Chrome then saves them in the per-test folder set in the fixture's profile.
async function newPageWithChromeDownloads(context) {
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Browser.setDownloadBehavior', { behavior: 'default' });
  return page;
}

test.afterEach(async ({ extension }) => {
  await extension.worker.evaluate(async () => {
    for (const item of await chrome.downloads.search({ state: 'complete' }))
      await chrome.downloads.removeFile(item.id).catch(() => {});
    await chrome.downloads.erase({});
  });
});

test.beforeEach(async ({ extension }) => {
  // The fixture can hand over the service worker before background.js has finished
  // loading; downloads started before the listener exists are not renamed.
  await expect.poll(() => extension.worker.evaluate(() =>
    chrome.downloads.onDeterminingFilename.hasListeners())).toBe(true);
  await extension.context.route('https://viewer.test/**', route =>
    route.fulfill({ status: 200, contentType: 'text/html', body: scholarReaderLikeHtml(route.request().url().split('name=')[1]) }));
});

test('renames arXiv PDFs saved from a blob: URL by another viewer', async ({ extension }) => {
  const { context, worker } = extension;
  const page = await newPageWithChromeDownloads(context);
  await page.goto(`https://viewer.test/?name=${paperId}v2.pdf`);
  await page.frameLocator('#reader').locator('#save').click();
  const item = await lastDownload(worker);
  expect(item.url).toMatch(/^blob:/);
  expect(basename(item.filename)).toBe('Sample Paper, A Test, Jane Doe et al., 2025, v2.pdf');
});

test('uses the configured filename format', async ({ extension }) => {
  const { context, worker } = extension;
  await worker.evaluate(() => chrome.storage.sync.set({ filename_format: '${title}.pdf' }));
  const page = await newPageWithChromeDownloads(context);
  await page.goto(`https://viewer.test/?name=${paperId}.pdf`);
  await page.frameLocator('#reader').locator('#save').click();
  const item = await lastDownload(worker);
  expect(basename(item.filename)).toBe('Sample Paper, A Test.pdf');
});

// The listener answers asynchronously, so it must still release the download when the
// arXiv lookup fails; otherwise the download would wait forever.
for (const [failure, respond] of [
  ['an HTTP error', route => route.fulfill({ status: 503, body: 'Service Unavailable' })],
  ['an invalid response', route => route.fulfill({ status: 200, contentType: 'application/xml', body: '<feed></feed>' })],
  ['an aborted request', route => route.abort('failed')],
]) {
  test(`keeps the original name when the arXiv lookup gets ${failure}`, async ({ extension }) => {
    const { context, worker } = extension;
    let lookups = 0;
    // Registered after the fixture's route, so it takes precedence.
    await context.route('https://export.arxiv.org/api/query**', route => { lookups++; return respond(route); });
    const page = await newPageWithChromeDownloads(context);
    await page.goto(`https://viewer.test/?name=${paperId}v2.pdf`);
    await page.frameLocator('#reader').locator('#save').click();
    // Chrome releases a download whose listener never answers after about 15 seconds,
    // so require the fallback to finish sooner; the mocked failures resolve immediately.
    const item = await lastDownload(worker, 10000);
    expect(lookups).toBe(1);
    expect(item.state).toBe('complete');
    expect(basename(item.filename)).toBe(`${paperId}v2.pdf`);
  });
}

test('leaves non-arXiv blob downloads alone', async ({ extension }) => {
  const { context, worker } = extension;
  const page = await newPageWithChromeDownloads(context);
  await page.goto('https://viewer.test/?name=document.pdf');
  await page.frameLocator('#reader').locator('#save').click();
  const item = await lastDownload(worker);
  expect(basename(item.filename)).toBe('document.pdf');
});

test('real Direct Download still uses its own filename', async ({ extension }) => {
  const { context, worker } = extension;
  const page = await newPageWithChromeDownloads(context);
  await page.goto(abstractUrl);
  await expect(page.locator('#arxiv-utils-direct-download-a')).toHaveAttribute('href', '#');
  await page.locator('#arxiv-utils-direct-download-a').click();
  await lastDownload(worker);
  // Right after installation the content script can be injected twice (by the manifest
  // and by onInstalled), so one click may start two downloads. Chrome then adds " (1)"
  // to the second name. Every download must still use the extension's filename.
  const items = await worker.evaluate(() => chrome.downloads.search({}));
  expect(items.length).toBeGreaterThan(0);
  for (const item of items)
    expect(basename(item.filename)).toMatch(/^Sample Paper, A Test, Jane Doe et al\., 2025, v2(?: \(\d+\))?\.pdf$/);
});
