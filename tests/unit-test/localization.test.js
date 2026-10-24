const fs = require('fs');
const path = require('path');

const repositoryRoot = path.resolve(__dirname, '../..');

function read(browser, filename) {
  return fs.readFileSync(path.join(repositoryRoot, browser, filename), 'utf8');
}

function collectMatches(text, regexp) {
  return [...text.matchAll(regexp)].map((match) => match[1]);
}

test.each(['chrome', 'firefox'])('%s locales cover every message reference', (browser) => {
  const manifest = JSON.parse(read(browser, 'manifest.json'));
  const englishMessages = JSON.parse(read(browser, '_locales/en/messages.json'));
  const koreanMessages = JSON.parse(read(browser, '_locales/ko/messages.json'));

  expect(manifest.default_locale).toBe('en');
  expect(Object.keys(koreanMessages).sort()).toEqual(Object.keys(englishMessages).sort());

  const sources = {
    manifest: JSON.stringify(manifest),
    optionsHtml: read(browser, 'options.html'),
    optionsJs: read(browser, 'options.js'),
    backgroundJs: read(browser, 'background.js'),
  };

  const referencedKeys = new Set([
    ...collectMatches(sources.manifest, /__MSG_([A-Za-z0-9_@]+)__/g),
    ...collectMatches(sources.optionsHtml, /data-i18n="([^"]+)"/g),
    ...collectMatches(sources.optionsJs, /(?:chrome|browser)\.i18n\.getMessage\(["']([^"']+)["']\)/g),
    ...collectMatches(sources.backgroundJs, /(?:chrome|browser)\.i18n\.getMessage\(["']([^"']+)["']\)/g),
  ]);

  for (const messages of [englishMessages, koreanMessages]) {
    for (const [key, value] of Object.entries(messages)) {
      expect(value.message.trim()).not.toBe('');
      expect(value.description.trim()).not.toBe('');
      expect(referencedKeys).toContain(key);
    }
  }

  for (const key of referencedKeys)
    expect(englishMessages).toHaveProperty(key);
});
