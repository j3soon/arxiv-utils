const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { TextEncoder } = require('util');

function loadFilenameFormatter(browserName) {
  const source = fs.readFileSync(
    path.join(__dirname, '..', '..', browserName, 'content.js'),
    'utf8'
  );
  const context = vm.createContext({
    console: { log: () => {}, error: () => {} },
    location: { href: 'https://example.org/' },
    TextEncoder,
    [browserName]: { runtime: { onMessage: { addListener: () => {} } } },
  });
  vm.runInContext(source, context);
  return context.applyFilenameReplacementRules;
}

test.each(['chrome', 'firefox'])(
  '%s direct download keeps the PDF extension when replacing periods',
  async (browserName) => {
    const source = fs.readFileSync(
      path.join(__dirname, '..', '..', browserName, 'content.js'),
      'utf8'
    );
    let clickHandler;
    let downloadMessage;
    const downloadLink = {
      addEventListener: (event, handler) => {
        if (event === 'click') clickHandler = handler;
      },
    };
    const browserAPI = {
      storage: {
        sync: {
          get: async (defaults) => ({
            ...defaults,
            filename_replacement_rules: JSON.stringify([{ from: '.', to: '_' }]),
          }),
        },
      },
      runtime: {
        sendMessage: (message) => { downloadMessage = message; },
        onMessage: { addListener: () => {} },
      },
    };
    const context = vm.createContext({
      console: { log: () => {}, error: () => {} },
      location: { href: 'https://example.org/' },
      TextEncoder,
      document: { getElementById: () => downloadLink },
      [browserName === 'firefox' ? 'browser' : 'chrome']: browserAPI,
    });

    vm.runInContext(source, context);
    await context.enableDirectDownload('2609.12345', {
      escapedTitle: 'A.B',
      firstAuthor: 'Smith',
      publishedYear: '2026',
      version: '1',
    });
    clickHandler({ preventDefault: () => {} });

    expect(downloadMessage.filename).toBe('A_B, Smith et al_, 2026, v1.pdf');
  }
);

test.each(['chrome', 'firefox'])(
  '%s direct download keeps a PDF extension followed by whitespace',
  (browserName) => {
    const format = loadFilenameFormatter(browserName);
    expect(format('A.B.pdf ', [{ from: '.', to: '_' }]))
      .toBe('A_B.pdf');
  }
);

test.each(['chrome', 'firefox'])(
  '%s applies rules once and truncates the finished filename',
  (browserName) => {
    const format = loadFilenameFormatter(browserName);
    const doublingRules = Array.from({ length: 12 }, () => ({ from: 'a', to: 'aa' }));
    expect(format('a.pdf', doublingRules)).toBe('aa.pdf');
    expect(format(`${'a'.repeat(1000)}.pdf`, []))
      .toBe(`${'a'.repeat(251)}.pdf`);
    expect(format('a/b.pdf', [{ from: 'a', to: 'x'.repeat(8192) }]))
      .toBe(`${'x'.repeat(251)}.pdf`);
    expect(format(`${'é'.repeat(200)}.pdf`, []))
      .toBe(`${'é'.repeat(125)}.pdf`);
  }
);

test.each(['chrome', 'firefox'])(
  '%s uses literal, independent rules with first-match precedence',
  (browserName) => {
    const format = loadFilenameFormatter(browserName);
    expect(format('ab.pdf', [{ from: 'a', to: 'bb' }, { from: 'b', to: 'c' }]))
      .toBe('bbc.pdf');
    expect(format('abc.pdf', [{ from: 'ab', to: 'X' }, { from: 'a', to: 'Y' }]))
      .toBe('Xc.pdf');
    expect(format('abc.pdf', [{ from: 'a', to: 'Y' }, { from: 'ab', to: 'X' }]))
      .toBe('Ybc.pdf');
    expect(format('a+b.pdf', [{ from: '+', to: '_plus_' }]))
      .toBe('a_plus_b.pdf');
  }
);

test.each(['chrome', 'firefox'])(
  '%s produces a valid filename when a rule adds a leading dot',
  (browserName) => {
    const format = loadFilenameFormatter(browserName);
    expect(format('Survey.pdf', [{ from: 'S', to: '.S' }]))
      .toBe('_Survey.pdf');
    expect(format('.pdf', []))
      .toBe('download.pdf');
    expect(format('.draft.', []))
      .toBe('_draft_');
  }
);
