const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { test, expect } = require('@playwright/test');

const testcases = yaml.load(fs.readFileSync(path.resolve(__dirname, '../testcases/testcases.yaml'), 'utf8'));
const basicCase = testcases.navigation.find(testcase => testcase.description === 'basic testcase');

test('background action switches between abstract and PDF URLs', async ({ page }) => {
  await page.addInitScript(() => {
    window.createdTabs = [];
    window.updatedTabs = [];
    window.openInNewTab = true;
    window.chrome = {
      action: {
        disable: async () => {},
        enable: async () => {},
        onClicked: { addListener: listener => { window.actionClick = listener; } },
      },
      tabs: {
        query: (query, callback) => callback?.([]),
        create: async options => window.createdTabs.push(options),
        update: async options => window.updatedTabs.push(options),
        onUpdated: { addListener: () => {} },
      },
      storage: { sync: { get: async defaults => ({ ...defaults, open_in_new_tab: window.openInNewTab }) } },
      contextMenus: { onClicked: { addListener: () => {} } },
      runtime: {
        getManifest: () => ({ content_scripts: [] }),
        onMessage: { addListener: () => {} },
        onInstalled: { addListener: () => {} },
      },
    };
  });
  await page.route('https://extension.test/**', route => {
    const filename = new URL(route.request().url()).pathname.slice(1);
    if (filename === '') {
      return route.fulfill({ status: 200, contentType: 'text/html', body: '<title>Navigation test</title>' });
    }
    return route.fulfill({ status: 200, contentType: 'text/javascript', path: path.resolve(__dirname, `../../chrome/${filename}`) });
  });
  await page.goto('https://extension.test/');
  await page.addScriptTag({ type: 'module', url: 'https://extension.test/background.js' });
  await page.waitForFunction(() => typeof window.actionClick === 'function');

  await page.evaluate(async ({ url, pdfUrl }) => {
    await window.actionClick({ url, index: 2 });
    await window.actionClick({ url: pdfUrl, index: 3 });
  }, { url: basicCase.url, pdfUrl: basicCase.pdf_url });
  expect(await page.evaluate(() => window.createdTabs)).toEqual([
    { url: basicCase.pdf_url, index: 3 },
    { url: basicCase.url, index: 4 },
  ]);

  await page.evaluate(async url => {
    window.openInNewTab = false;
    await window.actionClick({ url, index: 2 });
  }, basicCase.url);
  expect(await page.evaluate(() => window.updatedTabs)).toEqual([{ url: basicCase.pdf_url }]);
});
