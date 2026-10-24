const fs = require('fs');
const path = require('path');
const { test: base, chromium } = require('@playwright/test');

const extensionPath = path.resolve(__dirname, '../../chrome');
const paperId = '2501.00001';
const abstractUrl = `https://arxiv.org/abs/${paperId}`;
const pdfUrl = `https://arxiv.org/pdf/${paperId}`;
const ar5ivUrl = `https://ar5iv.labs.arxiv.org/html/${paperId}`;

// Preserve arXiv's layout ancestors so its responsive selectors apply.
const arxivStyles = ['arxiv.css', 'abs.css'].map(filename =>
  fs.readFileSync(path.join(__dirname, 'fixtures', filename), 'utf8')).join('\n');
const desktopLinksHtml = `
  <div class="extra-services">
    <div class="full-text"><h2>Access Paper:</h2><ul>
      <li><a class="abs-button download-pdf" href="/pdf/${paperId}">View PDF</a></li>
    </ul></div>
    <div class="extra-ref-cite"><h3>References &amp; Citations</h3><ul>
      <li><a class="abs-button abs-button-small" href="#">NASA ADS</a></li>
    </ul></div>
  </div>`;
const abstractHtml = `<!doctype html>
<html>
<head>
  <title>[${paperId}] Sample Paper</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>${arxivStyles}</style>
</head>
<body>
  <main><div id="content"><div id="abs-outer">
    <div class="leftcolumn"><div id="content-inner"><div id="abs">
      <h1 class="title">Sample Paper</h1>
      <a class="mobile-submission-download" href="/pdf/${paperId}">View PDF</a>
      <a class="mobile-submission-download" href="/html/${paperId}">HTML (experimental)</a>
      <blockquote class="abstract">Abstract text</blockquote>
    </div></div></div>
    ${desktopLinksHtml}
  </div></div></main>
</body>
</html>`;

const articleXml = `<feed><entry>
  <title>Sample Paper: A Test</title>
  <author><name>Jane Doe</name></author>
  <published>2025-01-01T00:00:00Z</published>
  <updated>2025-01-02T00:00:00Z</updated>
  <link href="${abstractUrl}v2" />
</entry></feed>`;

const test = base.extend({
  extension: async ({}, use) => {
    const context = await chromium.launchPersistentContext('', {
      channel: 'chromium',
      headless: true,
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
      ],
    });
    try {
      const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
      const id = worker.url().split('/')[2];
      await context.route('https://arxiv.org/abs/**', route =>
        route.fulfill({ status: 200, contentType: 'text/html', body: abstractHtml }));
      await context.route('https://arxiv.org/pdf/**', route =>
        route.fulfill({ status: 200, contentType: 'text/html', body: '<title>PDF fixture</title>' }));
      await context.route('https://ar5iv.labs.arxiv.org/html/**', route =>
        route.fulfill({ status: 200, contentType: 'text/html', body: '<title>HTML fixture</title>' }));
      await context.route('https://export.arxiv.org/api/query**', route =>
        route.fulfill({ status: 200, contentType: 'application/xml', body: articleXml }));
      await use({ context, worker, id });
    } finally {
      await context.close();
    }
  },
});

module.exports = { test, paperId, abstractUrl, pdfUrl, ar5ivUrl, abstractHtml, articleXml };
