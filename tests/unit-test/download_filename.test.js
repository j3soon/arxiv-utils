const fs = require('fs');
const path = require('path');
const vm = require('vm');

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
