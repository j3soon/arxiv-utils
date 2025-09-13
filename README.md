# arxiv-utils

[![tests](https://img.shields.io/github/actions/workflow/status/j3soon/arxiv-utils/test-with-jest.yaml?label=unit-tests)](https://github.com/j3soon/arxiv-utils/actions/workflows/test-with-jest.yaml)
[![tests](https://img.shields.io/github/actions/workflow/status/j3soon/arxiv-utils/test-with-selenium.yaml?label=end-to-end-tests)](https://github.com/j3soon/arxiv-utils/actions/workflows/test-with-selenium.yaml)
[![build](https://img.shields.io/github/actions/workflow/status/j3soon/arxiv-utils/build-and-publish.yaml)](https://github.com/j3soon/arxiv-utils/actions/workflows/build-and-publish.yaml)

[![](https://img.shields.io/chrome-web-store/v/mnhdpeipjhhkmlhlcljdjpgmilbmehij.svg)](https://chrome.google.com/webstore/detail/arxiv-utils/mnhdpeipjhhkmlhlcljdjpgmilbmehij)
[![](https://img.shields.io/chrome-web-store/rating/mnhdpeipjhhkmlhlcljdjpgmilbmehij.svg)](https://chrome.google.com/webstore/detail/arxiv-utils/mnhdpeipjhhkmlhlcljdjpgmilbmehij)
[![](https://img.shields.io/chrome-web-store/users/mnhdpeipjhhkmlhlcljdjpgmilbmehij.svg)](https://chrome.google.com/webstore/detail/arxiv-utils/mnhdpeipjhhkmlhlcljdjpgmilbmehij)

[![](https://img.shields.io/amo/v/arxiv-utils.svg)](https://addons.mozilla.org/en-US/firefox/addon/arxiv-utils/)
[![](https://img.shields.io/amo/rating/arxiv-utils.svg)](https://addons.mozilla.org/en-US/firefox/addon/arxiv-utils/)
[![](https://img.shields.io/amo/users/arxiv-utils.svg)](https://addons.mozilla.org/en-US/firefox/addon/arxiv-utils/)

[![](https://img.shields.io/badge/dynamic/json?label=edge%20add-on&prefix=v&query=%24.version&url=https%3A%2F%2Fmicrosoftedge.microsoft.com%2Faddons%2Fgetproductdetailsbycrxid%2Fngjpcfjabahdoadnajbhnikbemhmemdg)](https://microsoftedge.microsoft.com/addons/detail/arxivutils/ngjpcfjabahdoadnajbhnikbemhmemdg)
[![](https://img.shields.io/badge/dynamic/json?label=rating&suffix=/5&query=%24.averageRating&url=https%3A%2F%2Fmicrosoftedge.microsoft.com%2Faddons%2Fgetproductdetailsbycrxid%2Fngjpcfjabahdoadnajbhnikbemhmemdg)](https://microsoftedge.microsoft.com/addons/detail/arxivutils/ngjpcfjabahdoadnajbhnikbemhmemdg)
[![](https://img.shields.io/badge/dynamic/json?label=users&query=%24.activeInstallCount&url=https%3A%2F%2Fmicrosoftedge.microsoft.com%2Faddons%2Fgetproductdetailsbycrxid%2Fngjpcfjabahdoadnajbhnikbemhmemdg)](https://microsoftedge.microsoft.com/addons/detail/arxivutils/ngjpcfjabahdoadnajbhnikbemhmemdg)

![icon](icons/icon64.png)

A collection of features that enhance your reading experience on ArXiv (and some other sites):

- Renames the title of PDF page to the paper's title.
- Adds a button and hotkey (`Alt+A`) to navigate back to Abstract page for arXiv, OpenReview, and more.
- Download PDF with paper's title as filename.
- Open the paper in extra services such as [ar5iv](https://ar5iv.labs.arxiv.org/).
- Works with Native Tab Search, and other plugins! (See the [Solution Descriptions](#solution-descriptions) section for more details)
- All required permissions are documented in detail.

Please [open an issue](https://github.com/j3soon/arxiv-utils/issues) if you have any questions, feature requests, or bug reports.

## Download Links

Supports Chrome, Firefox, Edge, Firefox on Android. (Not tested on Android)

- [Chrome Web Store](https://chrome.google.com/webstore/detail/arxiv-utils/mnhdpeipjhhkmlhlcljdjpgmilbmehij)
- [Firefox Add-on](https://addons.mozilla.org/en-US/firefox/addon/arxiv-utils/)
- [Edge Add-on](https://microsoftedge.microsoft.com/addons/detail/arxivutils/ngjpcfjabahdoadnajbhnikbemhmemdg)

Alternatively, these 3 browsers can also load arxiv-utils directly from source. First, download the source code release from [Releases](https://github.com/j3soon/arxiv-utils/releases), and then load the extension as an unpacked extension following the [Development Section](#development).

## Screenshots

The paper id in the title has been removed automatically!  
A direct download link is added to download PDF with paper's title as the filename!  
Open in extra services such as ar5iv!
![](screenshots/01-abstract.png)
Finally... Meaningful paper title instead of paper id! (For Firefox, this is achieved through a custom PDF container.)
![](screenshots/02-pdf.png)
Difficult to get back to abstract page...  
Click to get back to abstract page!
![](screenshots/03-pdf2.png)
TADA~ The abstract page is shown at the right of the PDF page! Both with meaningful title!
![](screenshots/04-abstract2.png)
The button is disabled if not in ArXiv's domain.  
Meaningful bookmark titles.
![](screenshots/05-bookmarks.png)
Meaningful OneTab entries! (Chrome & Edge only)
![](screenshots/06-onetab.png)
Opened too many tabs? Search in terms of the paper title!
![](screenshots/07-search.png)
Works well with vertical tabs.
![](screenshots/08-vertical-tabs.png)
Right-click the extension icon and select `Options` to set your preference. (Chrome & Edge)
![](screenshots/09-filename-format-chrome.png)
Go to add-ons page, click the extension select `Options` to set your preference. (Firefox)
![](screenshots/10-filename-format-firefox.png)

## Solution Descriptions

For ArXiv PDF / abstract tabs:

- Renames the title to paper's title automatically in the background. (Originally is meaningless paper id, or start with paper id)
- Add an action button (or `Alt+A`) to open its corresponding abstract / PDF page. (Originally is hard to get back to abstract page from PDF page)
- Add a direct download link on abstract page, click it to download the PDF with the title as filename. (Originally is paper id as filename)
- Open the paper in extra services such as [ar5iv](https://ar5iv.labs.arxiv.org/).
- Better title even for bookmarks and the [OneTab](https://www.one-tab.com/) plugin!
- Firefox has [strict restrictions on PDF.js](https://bugzilla.mozilla.org/show_bug.cgi?id=1454760). So it doesn't work well with OneTab, the PDF renaming is achieved by intercepting requests and show the PDF in a container. The bookmark works well though.
- Works well with native tab search (credits: [@The Rooler](https://addons.mozilla.org/en-US/firefox/addon/arxiv-utils/reviews/1674567/))
  - [Tab search on Firefox](https://support.mozilla.org/en-US/kb/search-open-tabs-firefox)
  - [Enable Tab search on Chrome](https://www.howtogeek.com/722640/how-to-enable-or-disable-the-tab-search-icon-in-chrome/), [Tab search on Chrome](https://www.howtogeek.com/704212/how-to-search-open-tabs-on-google-chrome/)
  - [Enable Tab search on Edge](https://www.makeuseof.com/microsoft-edge-chrome-tab-search/)

## Options

- `filename format`:
  - Default: `${title}, ${firstAuthor} et al., ${publishedYear}, v${version}.pdf`
  - `${title}` is replaced with the paper title.
  - `${firstAuthor}` is replaced with the first author of the paper.
  - `${firstAuthorFamilyName}` is replaced with the family name of the first author.
  - `${firstAuthorFamilyNameLowerCase}` is replaced with the family name of the first author in lowercase.
  - `${authors}` is replaced with all authors separated by commas.
  - `${publishedYear}` is replaced with the published year of the paper. (e.g., "2025")
  - `${updatedYear}` is replaced with the updated year of the current paper version. (e.g., "2025")
  - `${publishedYear2Digits}` is replaced with the last two digits of the published year. (e.g., "25")
  - `${updatedYear2Digits}` is replaced with the last two digits of the updated year. (e.g., "25")
  - `${publishedMonth}` is replaced with the published month of the paper (e.g., "12").
  - `${updatedMonth}` is replaced with the updated month of the current paper version (e.g., "12").
  - `${publishedDay}` is replaced with the published day of the paper (e.g., "25").
  - `${updatedDay}` is replaced with the updated day of the current paper version (e.g., "25").
  - `${version}` is replaced with the version of the current paper.
  - `${paperid}` is replaced with the arXiv paper id.
- `Open in new tab`:
  - Default: `true`
  - Set to `false` to open in existing tab when clicking the action button.
- (Firefox) `Enable PDF redirection`:
  - Default: `true`
  - Set to `false` to disable PDF redirection. This will disallow renaming for PDF tabs.
- (Firefox, Experimental) `external PDF viewer URL prefix`:
  - Default: (empty), uses the custom PDF container.
  - Set to `https://mozilla.github.io/pdf.js/web/viewer.html?file=`, enables Screenshots and Go Back by using pdf.js as PDF viewer.
- (Firefox, Experimental) `PDF viewer default zoom`:
  - Default: `auto`
  - Set the default zoom level for PDF viewers (PDF.js).
  - Supported values: `auto`, `page-fit`, `page-width`, or percentage values like `50`, `75`, `100`, `125`, `150`, `200`, `300`, `400`, or custom values.
  - This setting only applies when `Enable PDF redirection` is set to `true`.

## Privacy Policy

We do not gather your personal data. If in doubt, please refer to the source code.

### Chrome / Edge Permissions

- `tabs`: On extension button click, open a new tab and move it to the right of the old active tab.
- `activeTab`: Read active tab's title and modify it using the tab's url.
- `storage`: Save extension configurations.
- `contextMenus`: When right-click the extension button, show a help menu item.
- `scripting`: Inject content scripts to existing tabs.
- `downloads`: Direct download PDF with paper's title as filename.
- `*://arxiv.org/*`: Inject content scripts to existing tabs.
- `*://export.arxiv.org/*`: Inject content scripts to existing tabs.
- `*://browse.arxiv.org/*`: Inject content scripts to existing tabs.
- `*://www.arxiv.org/*`: Inject content scripts to existing tabs.
- `*://ar5iv.labs.arxiv.org/*`: Inject content scripts to existing tabs.

### Firefox Permissions

- `tabs`: On extension button click, open a new tab and move it to the right of the old active tab.
- `activeTab`: Read active tab's title and modify it using the tab's url.
- `storage`: Save extension configurations.
- `contextMenus`: When right-click the extension button, show a help menu item.
- `webRequest`: Intercept ArXiv PDF request.
- `webRequestBlocking`: Redirect the ArXiv PDF page to custom PDF container page.
- `bookmarks`: When create a new bookmark of the PDF container page, bookmark the actual ArXiv PDF url instead.
- `downloads`: Direct download PDF with paper's title as filename.
- `*://arxiv.org/*pdf*`: Redirect PDF pages to custom PDF container.
- `*://export.arxiv.org/*pdf*`: Redirect PDF pages to custom PDF container.
- `*://browse.arxiv.org/*pdf*`: Redirect PDF pages to custom PDF container.
- `*://www.arxiv.org/*pdf*`: Redirect PDF pages to custom PDF container.
- `"content_security_policy": "script-src 'self'; object-src 'self' https://arxiv.org https://export.arxiv.org https://browse.arxiv.org https://www.arxiv.org;"`: For embedding PDF in container.
- `"web_accessible_resources": [ "pdfviewer.html" ]`: To redirect from HTTPS to extension custom page requires them to be visible.

## Developer Notes

### Development

- Chrome: [Debugging extensions](https://developer.chrome.com/docs/extensions/mv3/tut_debugging/)
- Firefox: [Test and debug](https://extensionworkshop.com/documentation/develop/#test-and-debug)
- Edge: [Sideload an extension](https://learn.microsoft.com/en-us/microsoft-edge/extensions-chromium/getting-started/extension-sideloading)

For viewing the content script logs, open the Inspector of the arXiv webpage (as in normal web development).

For viewing background script logs, open the Inspector of the plugin in the `Extensions` page.
- Firefox: Go to `about:debugging#/runtime/this-firefox` and click `Inspect` on the temporarily loaded extension.
- Chrome: Go to `chrome://extensions/` and click `Inspect views: background page` on the loaded (unpacked) extension.
- Edge: Go to `edge://extensions/` and click `Inspect views: service worker` on the loaded (unpacked) extension.

### Tests

The automated tests currently include the following:

- **Default tests**: Test the default title name of arXiv abstract/PDF pages.
- **Navigation tests**: Test the arxiv-utils button can switch between arXiv abstract/PDF pages, and the title is modified.

The testcases along with their description is stored in [tests/testcases/testcases.yaml](tests/testcases/testcases.yaml).

Other functions should still be tested manually:

- **Bookmark tests**: Test the bookmarked URL.
  - Try to bookmark an abstract tab, the title should be the new title.
  - Try to bookmark a PDF tab, the title should be the new title.
  - (Firefox Only) Check the PDF bookmark's URL, it should be the original ArXiv PDF link.
- **Download tests**: Test the downloaded file name.
  - Test PDF download (`Download PDF (arxiv-utils)`) in abstract. In firefox, only mouse left-click works, middle-click open up the original PDF page in a new tab.
  - Change filename format options, reload page, and download to verify the filename is changed.
  - Reset filename format option to default, reload page, and download to verify the filename format is default.
  - Test papers with long title.
  - Test papers with special characters in title.
- The extension button should be disabled outside ArXiv's domain.
- Clicking the extension button should open a new tab at the right of the current active tab (instead of open at the end of the tab list).
- (Chrome Only) If [OneTab](https://www.one-tab.com/) is installed, click its extension button, the list should show the updated titles of both abstract and PDF page.
- (Chrome Only) Clear the browser cache and reload the PDF page, the title should be the new title after PDF load.  
  Test with: https://arxiv.org/abs/1512.03385
- Verify there are no console errors in both the content script and background script logs.
- Disable and re-enabling the extension should not cause any errors.
- Installing or re-enabling the extension should immediately update the title of existing tabs.
- The help menu item in the context menu should link to this GitHub page.
- ar5iv tabs should have renamed title, and support navigation.

### Run Unit Tests Locally

Launch the docker containers:

```sh
cd tests/unit-test
docker compose up -d
```

Then run the tests:

```sh
docker exec -t unit-test-jest-tests-1 \
    /app/tests/unit-test/install-and-run.sh
```

When done, stop the containers:

```sh
cd tests/unit-test
docker compose down
```

### Run End-to-End Tests Locally

Launch the docker containers:

```sh
cd tests/end-to-end-test
docker compose up -d
```

Then run the tests:

```sh
docker exec -t end-to-end-test-selenium-tests-1 \
    python "/app/tests/end-to-end-test/test_navigation.py"
```

When adding new test cases, it is often convenient to comment out existing test cases in [tests/testcases/testcases.yaml](tests/testcases/testcases.yaml); When testing specific browsers, you can modify the `for browser in [...]` part in [tests/test_navigation.py](tests/test_navigation.py) to only run tests for the desired browser.

> If the test logs stuck at launching the webdriver, you may need to restart the containers.

View the logs or open the following URLs for more details:
- [Selenium Grid](http://localhost:4444/ui)
- [noVNC for Chrome](http://localhost:7900)
- [noVNC for Edge](http://localhost:7901)
- [noVNC for Firefox](http://localhost:7902)

> The default password for noVNC is `secret`.

When done, stop the containers:

```sh
cd tests/end-to-end-test
docker compose down
```

### Interactive End-to-End Testing

Install VSCode and [Dev Containers](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers) plugin.

```sh
tests/scripts/docker-compose.sh up -d
```

Press `Ctrl + P` and select `>Dev Container: Attach to Running Container...`,
then select `/end-to-end-test-selenium-tests-1`.

In the new VSCode window, click `Open Folders` and select `/app`.

Install the [Python](https://marketplace.visualstudio.com/items?itemName=ms-python.python) plugin inside the dev container.

Launch a Terminal inside the dev container and run:

```sh
apk add build-base linux-headers
```

Open `tests/end-to-end-test/test_interactive.py`, select the first cell and press `Shift + Enter` and click `Install` (Install the `ipykernel`).

You can now begin interactive testing!

Reference: [Developing inside a Container](https://code.visualstudio.com/docs/devcontainers/containers)

### arXiv API

```sh
curl "https://export.arxiv.org/api/query?id_list=<ARXIV_ID>"
```

Reference: [arXiv API User's Manual](https://info.arxiv.org/help/api/user-manual.html#332-entry-metadata)

### Build and Publish

Store dashboards:

- Chrome: [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
- Firefox: [Add-on Developer Hub](https://addons.mozilla.org/en-US/developers/addons)
- Edge: [Microsoft Partner Center](https://partner.microsoft.com/en-us/dashboard/microsoftedge)

May need to update description, permission details, and screenshots for Firefox and Chrome store.

Download the signed `.crx` or `.xpi` files:

- Chrome: [How to download a CRX file from the Chrome web store for a given ID?](https://stackoverflow.com/a/14099762)
  - [Download CRX](https://clients2.google.com/service/update2/crx?response=redirect&prodversion=140.0.7339.128&acceptformat=crx2,crx3&x=id%3Dmnhdpeipjhhkmlhlcljdjpgmilbmehij%26uc)
- Firefox: [How to download Firefox extensions from addons.mozilla.org without installing them?](https://superuser.com/a/441011)
  - [Download XPI](https://addons.mozilla.org/en-US/firefox/addon/arxiv-utils/) by right-clicking `Add to Firefox` button and select `Save Link As...`.
- Edge: [How to get CRX file of a published in Microsoft Edge Web Store (Chromium Based)](https://stackoverflow.com/a/76016563)
  - [Download CRX](https://edge.microsoft.com/extensionwebstorebase/v1/crx?response=redirect&x=id%3Dngjpcfjabahdoadnajbhnikbemhmemdg%26installsource%3Dondemand%26uc)

## Frequently Asked Questions (FAQ)

- Q: Why redirect PDFs to a custom viewer in Firefox?

  A: This is due to a bug in Firefox that disallows executing content scripts in the built-in pdf.js viewer, which disallows renaming for PDF tabs. See [Firefox Bug 1454760](https://bugzilla.mozilla.org/show_bug.cgi?id=1454760) for more details.

- Q: Why do the custom PDF viewer in Firefox lacks many features?

  A: Since these features cannot be enabled easily. See [#4](https://github.com/j3soon/arxiv-utils/issues/4) and [#13](https://github.com/j3soon/arxiv-utils/pull/13) for further details.

- Q: Selenium (or WebDriver) has no API to click addon/extension buttons, how do the automated tests click the arxiv-utils button?

  A: This can be achieved by any tool that can simulate mouse click. Since we use Selenium Grid, for simplicity, we apply a hacky workaround that use one meta browser to click the arxiv-utils button in another browser through VNC web viewer. I'm not sure if [other testing tools](https://learn.microsoft.com/en-us/microsoft-edge/test-and-automation/test-and-automation) can achieve this more easily.

If you have further questions, please [open an issue](https://github.com/j3soon/arxiv-utils/issues).

## Related Extensions

- [musically-ut/arXiv-title-fixer](https://github.com/musically-ut/arXiv-title-fixer)  
  This requires a button click to change the pdf title, but will be considered less intrusive than running in the background. (Chrome Only)
- [weakish/arxiv-url](https://github.com/weakish/arxiv-url)  
  This claims to add a back button, but I can't get it working.
- [imurray/redirectify](https://github.com/imurray/redirectify)  
  Automatically redirect PDF links to HTML index page for many academic paper sites. (Compatible with arxiv-utils)
- [vict0rsch/PaperMemory](https://github.com/vict0rsch/PaperMemory)  
  If you're looking for an extension with a wider range of useful features, this extension offers just that. Although its UI modifications are slightly more intrusive than arxiv-utils, it is totally acceptable considering that it has so many extra features. It's also worth noting that arxiv-utils does not automatically invoke APIs from external services, which is a difference in design philosophy.
- [AI/ML Papers with Code Everywhere - CatalyzeX](https://www.catalyzex.com/)
  [[chrome]](https://chrome.google.com/webstore/detail/aiml-papers-with-code-eve/aikkeehnlfpamidigaffhfmgbkdeheil?hl=en)
  [[firefox]](https://addons.mozilla.org/en-US/firefox/addon/code-finder-catalyzex/)  
  Find code links and inject them to a variety of websites. (Compatible with arxiv-utils)
