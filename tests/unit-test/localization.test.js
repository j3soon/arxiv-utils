const fs = require('fs');
const path = require('path');
const vm = require('vm');

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
    ...collectMatches(sources.optionsJs, /(?:chrome|browser)\.i18n\.getMessage\(["']([^"']+)["']/g),
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

describe.each([
  ['chrome', 'en'],
  ['chrome', 'ko'],
  ['firefox', 'en'],
  ['firefox', 'ko'],
])('%s options alerts in %s', (browser, locale) => {
  const source = read(browser, 'options.js');
  const messages = JSON.parse(read(browser, `_locales/${locale}/messages.json`));
  const invalidRulesMessage = messages.invalidFilenameReplacementRules.message;

  function getMessage(key, substitutions = []) {
    const { message, placeholders = {} } = messages[key];
    const values = [].concat(substitutions);
    return message.replace(/\$(\w+)\$/g, (_, name) => {
      const content = placeholders[name.toLowerCase()]?.content ?? '';
      return content.replace(/\$(\d+)/g, (_, position) => values[Number(position) - 1] ?? '');
    });
  }

  async function submitOptions(rulesText, setOptions) {
    const document = {
      addEventListener: () => {},
      getElementsByTagName: () => [],
      querySelector: (selector) => ({
        value: selector === '#new-filename-replacement-rules' ? rulesText : '',
        checked: false,
        disabled: false,
      }),
    };
    const alert = jest.fn();
    const api = { i18n: { getMessage }, storage: { sync: { set: setOptions } } };
    const context = vm.createContext({
      [browser === 'chrome' ? 'chrome' : 'browser']: api,
      document,
      alert,
      console: { error: () => {} },
    });
    vm.runInContext(source, context);
    await context.saveOptionsAsync({ preventDefault: () => {}, submitter: { id: 'update' } });
    return alert;
  }

  test('includes the JSON parser diagnostic for malformed rules', async () => {
    const rulesText = '[';
    let parseError;
    try {
      JSON.parse(rulesText);
    } catch (error) {
      parseError = error;
    }

    const setOptions = jest.fn();
    const alert = await submitOptions(rulesText, setOptions);
    expect(alert.mock.calls).toEqual([[`${invalidRulesMessage}\n${parseError.message}`]]);
    expect(setOptions).not.toHaveBeenCalled();
  });

  test.each([
    ['a non-array', '{}', 'filenameRulesMustBeArray', null],
    ['a non-object rule', '[{"from":"a","to":"b"},null]', 'filenameRuleMustBeObject', '2'],
    ['a non-string field', '[{"from":"a","to":"b"},{"from":"b","to":1}]', 'filenameRuleMustHaveStringFields', '2'],
    ['an empty from field', '[{"from":"","to":"b"}]', 'filenameRuleFromCannotBeEmpty', '1'],
  ])('shows the validation error for %s', async (_, rulesText, key, ruleNumber) => {
    const setOptions = jest.fn();
    const alert = await submitOptions(rulesText, setOptions);
    const template = messages[key].message;
    if (ruleNumber)
      expect(template).toContain('$NUMBER$');
    const detail = ruleNumber ? template.replace('$NUMBER$', ruleNumber) : template;

    expect(alert.mock.calls).toEqual([[`${invalidRulesMessage}\n${detail}`]]);
    expect(setOptions).not.toHaveBeenCalled();
  });

  test('shows the save error and sync storage warning when saving fails', async () => {
    const setOptions = jest.fn().mockRejectedValue(new Error('Storage quota exceeded'));
    const alert = await submitOptions('[]', setOptions);
    const { unableToSaveOptions, filenameRulesMayExceedSyncStorage } = messages;

    expect(setOptions).toHaveBeenCalledTimes(1);
    expect(alert.mock.calls).toEqual([[`${unableToSaveOptions.message} ${filenameRulesMayExceedSyncStorage.message}`]]);
  });
});
