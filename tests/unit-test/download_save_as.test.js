const fs = require('fs');
const path = require('path');
const vm = require('vm');

test.each([
  ['android', true, false],
  ['linux', true, true],
  ['win', false, false],
])('Firefox download on %s with requested saveAs=%s uses saveAs=%s', async (os, requested, expected) => {
  const source = fs.readFileSync(path.join(__dirname, '..', '..', 'firefox', 'background.js'), 'utf8');
  const handlerSource = source.match(/async function onMessage\(message\) \{[\s\S]*?\n\}/)?.[0];
  expect(handlerSource).toBeDefined();

  let downloadOptions;
  const browser = {
    runtime: { getPlatformInfo: async () => ({ os }) },
    downloads: { download: async (options) => { downloadOptions = options; } },
  };
  const onMessage = vm.runInNewContext(
    `${handlerSource}\nonMessage`,
    { browser, LOG_PREFIX: '[arXiv-utils]', console: { log: () => {} } }
  );

  await onMessage({
    url: 'https://arxiv.org/pdf/2609.12345.pdf',
    filename: 'Paper.pdf',
    saveAs: requested,
  });

  expect(downloadOptions.saveAs).toBe(expected);
});

test.each([
  ['android', true, 'unavailable on Android', false],
  ['linux', false, 'true', true],
])('Firefox options on %s show the save dialog setting only where supported', async (os, disabled, status, saved) => {
  const source = fs.readFileSync(path.join(__dirname, '..', '..', 'firefox', 'options.js'), 'utf8');
  const elements = {};
  const document = {
    addEventListener: () => {},
    getElementsByTagName: () => [],
    querySelector: (selector) => {
      elements[selector] ||= { checked: false, disabled: false, style: {}, value: '', innerText: '' };
      return elements[selector];
    },
  };
  let storedOptions = { download_save_as: true };
  const browser = {
    runtime: { getPlatformInfo: async () => ({ os }) },
    storage: {
      sync: {
        get: async (defaults) => ({ ...defaults, ...storedOptions }),
        set: async (options) => { storedOptions = { ...storedOptions, ...options }; },
      },
    },
  };
  const context = vm.createContext({ browser, document, console, alert: () => {} });
  vm.runInContext(source, context);

  await context.restoreOptionsAsync();
  expect(elements['#new-download-save-as'].disabled).toBe(disabled);
  expect(elements['#new-download-save-as'].checked).toBe(saved);
  expect(String(elements['#download-save-as'].innerText)).toBe(status);

  await context.saveOptionsAsync({ preventDefault: () => {}, submitter: { id: 'update' } });
  expect(storedOptions.download_save_as).toBe(saved);
});
