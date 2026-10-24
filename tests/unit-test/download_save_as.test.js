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
])('Firefox options on %s preserve the desktop save dialog preference', async (os, disabled, status, checked) => {
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
  let savedOptions;
  const removedKeys = [];
  const browser = {
    i18n: { getMessage: (key) => key === 'unavailableOnAndroid' ? 'unavailable on Android' : '' },
    runtime: { getPlatformInfo: async () => ({ os }) },
    storage: {
      sync: {
        get: async (defaults) => ({ ...defaults, ...storedOptions }),
        set: async (options) => {
          savedOptions = options;
          storedOptions = { ...storedOptions, ...options };
        },
        remove: async (key) => {
          removedKeys.push(key);
          delete storedOptions[key];
        },
      },
    },
  };
  const context = vm.createContext({ browser, document, console, alert: () => {} });
  vm.runInContext(source, context);

  await context.restoreOptionsAsync();
  expect(elements['#new-download-save-as'].disabled).toBe(disabled);
  expect(elements['#new-download-save-as'].checked).toBe(checked);
  expect(String(elements['#download-save-as'].innerText)).toBe(status);

  await context.saveOptionsAsync({ preventDefault: () => {}, submitter: { id: 'update' } });
  expect(storedOptions.download_save_as).toBe(true);
  if (os === 'android')
    expect(savedOptions).not.toHaveProperty('download_save_as');
  else
    expect(savedOptions.download_save_as).toBe(true);

  await context.saveOptionsAsync({ preventDefault: () => {}, submitter: { id: 'revert' } });
  expect(removedKeys).toContain('filename_replacement_rules');
  expect(removedKeys.includes('download_save_as')).toBe(os !== 'android');
  expect(storedOptions.download_save_as).toBe(os === 'android' ? true : undefined);
});
