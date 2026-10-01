const { expect } = require('@playwright/test');
const { test, paperId, abstractUrl, pdfUrl, ar5ivUrl, articleXml } = require('./fixtures');

async function openAbstract(context) {
  const page = await context.newPage();
  await page.goto(abstractUrl);
  await expect(page).toHaveTitle('Sample Paper: A Test | Abstract');
  return page;
}

test('renames abstract, PDF, and ar5iv page titles', async ({ extension }) => {
  const { context } = extension;
  const page = await openAbstract(context);
  await page.goto(pdfUrl);
  await expect(page).toHaveTitle('Sample Paper: A Test | PDF');
  await page.goto(ar5ivUrl);
  await expect(page).toHaveTitle('Sample Paper: A Test | HTML5');
});

test('enables the toolbar action only on supported pages', async ({ extension }) => {
  const { context, worker } = extension;
  const page = await openAbstract(context);
  const actionEnabled = () => worker.evaluate(async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return chrome.action.isEnabled(tab.id);
  });
  await expect.poll(actionEnabled).toBe(true);
  await context.route('https://example.com/**', route =>
    route.fulfill({ status: 200, contentType: 'text/html', body: '<title>Other site</title>' }));
  await page.goto('https://example.com/');
  await expect.poll(actionEnabled).toBe(false);
});

test('adds paper links once with the paper ID', async ({ extension }) => {
  const page = await openAbstract(extension.context);
  await expect(page.locator('#arxiv-utils-direct-download-a')).toHaveCount(1);
  await expect(page.locator('#arxiv-utils-mobile-direct-download-a')).toHaveCount(1);
  await expect(page.locator('#arxiv-utils-extra-services-div a')).toHaveCount(4);
  await expect(page.locator('#arxiv-utils-extra-services-div a').first()).toHaveAttribute('href', `https://ar5iv.labs.arxiv.org/html/${paperId}`);
  await expect(page.locator('#arxiv-utils-extra-services-div a').nth(2)).toHaveAttribute('href', `https://huggingface.co/papers/${paperId}`);
  await page.reload();
  await expect(page.locator('#arxiv-utils-direct-download-a')).toHaveCount(1);
  await expect(page.locator('#arxiv-utils-mobile-direct-download-a')).toHaveCount(1);
});

test('places the mobile download button beside arXiv links without overflow', async ({ extension }) => {
  const page = await extension.context.newPage();
  for (const width of [320, 390, 600, 768]) {
    await page.setViewportSize({ width, height: 780 });
    await page.goto(abstractUrl);
    const mobileLink = page.locator('#arxiv-utils-mobile-direct-download-a');
    await expect(mobileLink).toBeVisible();
    await expect(mobileLink).toHaveClass('mobile-submission-download');
    await expect(page.locator('#arxiv-utils-direct-download-a')).toHaveClass('abs-button');
    await expect(page.locator('#arxiv-utils-extra-services-div a').first()).toHaveClass('abs-button abs-button-small');
    expect(await mobileLink.evaluate(el => el.previousElementSibling.textContent)).toBe('HTML (experimental)');
    const styles = await page.locator('#abs > a.mobile-submission-download').evaluateAll(links =>
      links.map(link => {
        const style = getComputedStyle(link);
        const rect = link.getBoundingClientRect();
        return { display: style.display, background: style.backgroundColor, padding: style.padding,
          fontSize: style.fontSize, borderRadius: style.borderRadius, left: rect.left, width: rect.width };
      }));
    expect(styles[2]).toEqual(styles[0]);
    expect(styles[2].display).toBe('flex');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  for (const width of [769, 1280]) {
    await page.setViewportSize({ width, height: 780 });
    await expect(page.locator('#arxiv-utils-mobile-direct-download-a')).toBeHidden();
    await expect(page.locator('#arxiv-utils-direct-download-a')).toBeVisible();
  }
});

test('both download links request the same PDF and default filename', async ({ extension }) => {
  const { context, worker } = extension;
  await worker.evaluate(() => {
    globalThis.testDownloads = [];
    chrome.downloads.download = async options => globalThis.testDownloads.push(options);
  });
  const page = await context.newPage();
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto(abstractUrl);
  await expect(page.locator('#arxiv-utils-mobile-direct-download-a')).toHaveAttribute('href', '#');
  await page.locator('#arxiv-utils-mobile-direct-download-a').click();
  await page.locator('#arxiv-utils-direct-download-a').click();
  await expect.poll(() => worker.evaluate(() => globalThis.testDownloads.length)).toBe(2);
  expect(await worker.evaluate(() => globalThis.testDownloads)).toEqual([
    { url: `${pdfUrl}.pdf`, filename: 'Sample Paper, A Test, Jane Doe et al., 2025, v2.pdf', saveAs: false },
    { url: `${pdfUrl}.pdf`, filename: 'Sample Paper, A Test, Jane Doe et al., 2025, v2.pdf', saveAs: false },
  ]);
});

test('removes characters that are invalid in download filenames', async ({ extension }) => {
  const { context, worker } = extension;
  await context.route('https://export.arxiv.org/api/query**', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/xml',
      body: articleXml.replace('Sample Paper: A Test', 'A/B: C?'),
    }));
  await worker.evaluate(() => {
    globalThis.testDownloads = [];
    chrome.downloads.download = async options => globalThis.testDownloads.push(options);
  });
  const page = await context.newPage();
  await page.goto(abstractUrl);
  await expect(page).toHaveTitle('A/B: C? | Abstract');
  await expect(page.locator('#arxiv-utils-direct-download-a')).toHaveAttribute('href', '#');
  await page.locator('#arxiv-utils-direct-download-a').click();
  await expect.poll(() => worker.evaluate(() => globalThis.testDownloads.length)).toBe(1);
  expect(await worker.evaluate(() => globalThis.testDownloads[0].filename)).toBe('A,B, C_, Jane Doe et al., 2025, v2.pdf');
});

test('options save, reload, affect downloads, and reset', async ({ extension }) => {
  const { context, worker, id } = extension;
  const options = await context.newPage();
  await options.goto(`chrome-extension://${id}/options.html`);
  await expect(options.locator('#new-filename-format')).toHaveValue('${title}, ${firstAuthor} et al., ${publishedYear}, v${version}.pdf');
  await options.locator('#new-filename-format').fill('${paperid} - ${firstAuthorFamilyName}.pdf');
  await options.locator('#new-open-in-new-tab').uncheck();
  await options.locator('#update').click();
  await options.reload();
  await expect(options.locator('#new-filename-format')).toHaveValue('${paperid} - ${firstAuthorFamilyName}.pdf');
  await expect(options.locator('#new-open-in-new-tab')).not.toBeChecked();

  await worker.evaluate(() => {
    globalThis.testDownloads = [];
    chrome.downloads.download = async options => globalThis.testDownloads.push(options);
  });
  const page = await openAbstract(context);
  await expect(page.locator('#arxiv-utils-direct-download-a')).toHaveAttribute('href', '#');
  await page.locator('#arxiv-utils-direct-download-a').click();
  await expect.poll(() => worker.evaluate(() => globalThis.testDownloads.length)).toBe(1);
  expect(await worker.evaluate(() => globalThis.testDownloads[0].filename)).toBe(`${paperId} - Doe.pdf`);

  await options.locator('#revert').click();
  await options.reload();
  await expect(options.locator('#new-filename-format')).toHaveValue('${title}, ${firstAuthor} et al., ${publishedYear}, v${version}.pdf');
  await expect(options.locator('#new-open-in-new-tab')).toBeChecked();
});
