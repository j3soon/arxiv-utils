const fs = require('fs');
const path = require('path');
const { test, expect } = require('@playwright/test');
const { abstractUrl, pdfUrl, abstractHtml, articleXml } = require('./fixtures');

async function openFirefoxAbstract(page, html = abstractHtml) {
  await page.setViewportSize({ width: 360, height: 780 });
  await page.addInitScript(() => {
    window.testDownloads = [];
    window.browser = {
      storage: { sync: { get: async defaults => defaults } },
      downloads: { download: async () => 1 },
      i18n: { getMessage: key => key },
      runtime: {
        getURL: resource => `https://extension.test/${resource}`,
        sendMessage: async message => {
          window.testDownloads.push(message);
          return window.downloadMessage(message);
        },
        onMessage: { addListener: listener => { window.downloadMessage = listener; } },
      },
      tabs: { query: (query, callback) => callback([]), onUpdated: { addListener: () => {} } },
      browserAction: { disable: () => {}, onClicked: { addListener: () => {} } },
      contextMenus: { create: () => {} },
      webRequest: { onBeforeRequest: { addListener: () => {} } },
      bookmarks: { onCreated: { addListener: () => {} } },
    };
  });
  await page.route('https://arxiv.org/abs/**', route =>
    route.fulfill({ status: 200, contentType: 'text/html', body: html }));
  await page.route('https://export.arxiv.org/api/query**', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/xml',
      headers: { 'access-control-allow-origin': '*' },
      body: articleXml,
    }));
  await page.route('https://extension.test/**', route =>
    route.fulfill({
      status: 200,
      contentType: 'text/javascript',
      headers: { 'access-control-allow-origin': '*' },
      path: path.resolve(__dirname, '../../firefox', new URL(route.request().url()).pathname.slice(1)),
    }));
  await page.goto(abstractUrl);
  await page.addScriptTag({ type: 'module', url: 'https://extension.test/background.js' });
  await page.waitForFunction(() => typeof window.downloadMessage === 'function');
  await page.addScriptTag({ path: path.resolve(__dirname, '../../firefox/content.js') });
  await expect(page).toHaveTitle('Sample Paper: A Test | Abstract');
  await expect(page.locator('#arxiv-utils-mobile-direct-download-a')).toHaveAttribute('href', '#');
}

test('Firefox content script adds working mobile and lower download links', async ({ page }) => {
  await openFirefoxAbstract(page);
  const mobileLink = page.locator('#arxiv-utils-mobile-direct-download-a');
  await expect(mobileLink).toBeVisible();
  await expect(mobileLink).toHaveAttribute('href', '#');
  await mobileLink.click();
  await page.locator('#arxiv-utils-direct-download-a').click();
  expect(await page.evaluate(() => window.testDownloads)).toEqual([
    { url: `${pdfUrl}.pdf`, filename: 'Sample Paper, A Test, Jane Doe et al., 2025, v2.pdf' },
    { url: `${pdfUrl}.pdf`, filename: 'Sample Paper, A Test, Jane Doe et al., 2025, v2.pdf' },
  ]);
});

for (const failure of ['unavailable', 'rejected']) {
  test(`Firefox downloads a PDF with the formatted filename when the API is ${failure}`, async ({ page }) => {
    await openFirefoxAbstract(page);
    await page.evaluate(failure => {
      if (failure === 'unavailable') {
        delete window.browser.downloads;
      } else {
        window.browser.downloads.download = async () => { throw new Error('Download delegate unavailable'); };
      }
    }, failure);
    await page.route('https://arxiv.org/pdf/**', route =>
      route.fulfill({ status: 200, contentType: 'application/pdf', body: '%PDF-1.4\nfixture PDF' }));
    for (const id of ['arxiv-utils-mobile-direct-download-a', 'arxiv-utils-direct-download-a']) {
      const downloadPromise = page.waitForEvent('download');
      await page.locator(`#${id}`).click();
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toBe('Sample Paper, A Test, Jane Doe et al., 2025, v2.pdf');
      expect(await download.failure()).toBeNull();
      expect(fs.readFileSync(await download.path(), 'utf8')).toBe('%PDF-1.4\nfixture PDF');
      await expect(page).toHaveURL(abstractUrl);
    }
  });
}

test('Firefox fallback does not save an HTTP error page as a PDF', async ({ page }) => {
  await openFirefoxAbstract(page);
  await page.evaluate(() => {
    delete window.browser.downloads;
  });
  await page.route('https://arxiv.org/pdf/**', route =>
    route.fulfill({ status: 404, body: 'No paper found' }));
  const downloads = [];
  page.on('download', download => downloads.push(download));
  const error = page.waitForEvent('console', message =>
    message.type() === 'error' && message.text().includes('PDF download failed.'));
  await page.locator('#arxiv-utils-mobile-direct-download-a').click();
  await error;
  expect(downloads).toHaveLength(0);
  await expect(page).toHaveURL(abstractUrl);
});
