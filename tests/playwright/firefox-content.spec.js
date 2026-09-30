const path = require('path');
const { test, expect } = require('@playwright/test');
const { abstractUrl, pdfUrl, abstractHtml, articleXml } = require('./fixtures');

test('Firefox content script adds working mobile and lower download links', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await page.addInitScript(() => {
    window.testDownloads = [];
    window.browser = {
      storage: { sync: { get: async defaults => defaults } },
      runtime: { sendMessage: message => window.testDownloads.push(message) },
    };
  });
  await page.route('https://arxiv.org/abs/**', route =>
    route.fulfill({ status: 200, contentType: 'text/html', body: abstractHtml }));
  await page.route('https://export.arxiv.org/api/query**', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/xml',
      headers: { 'access-control-allow-origin': '*' },
      body: articleXml,
    }));
  await page.goto(abstractUrl);
  await page.addScriptTag({ path: path.resolve(__dirname, '../../firefox/content.js') });
  await expect(page).toHaveTitle('Sample Paper: A Test | Abstract');
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
