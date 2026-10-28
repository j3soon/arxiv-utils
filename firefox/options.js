const DEFAULT_FILENAME_FORMAT = '${title}, ${firstAuthor} et al., ${publishedYear}, v${version}.pdf';
const DEFAULT_FILENAME_REPLACEMENT_RULES = '[]';

function getFilenameReplacementRules(rulesText) {
  let rules;
  try {
    rules = JSON.parse(rulesText);
  } catch {
    throw new Error();
  }
  if (!Array.isArray(rules))
    throw new Error(browser.i18n.getMessage("filenameRulesMustBeArray"));
  for (const [index, rule] of rules.entries()) {
    if (rule === null || typeof rule !== 'object' || Array.isArray(rule))
      throw new Error(browser.i18n.getMessage("filenameRuleMustBeObject", String(index + 1)));
    if (typeof rule.from !== 'string' || typeof rule.to !== 'string')
      throw new Error(browser.i18n.getMessage("filenameRuleMustHaveStringFields", String(index + 1)));
    if (rule.from === '')
      throw new Error(browser.i18n.getMessage("filenameRuleFromCannotBeEmpty", String(index + 1)));
  }
  return rules;
}

function getBooleanText(value) {
  return value
    ? browser.i18n.getMessage("yes")
    : browser.i18n.getMessage("no");
}

function getZoomText(value) {
  if (value === 'auto')
    return browser.i18n.getMessage("zoomAuto");
  if (value === 'page-fit')
    return browser.i18n.getMessage("zoomPageFit");
  if (value === 'page-width')
    return browser.i18n.getMessage("zoomPageWidth");
  return value + (!['25', '50', '75', '100', '125', '150', '200'].includes(value) ? '%' : '');
}

function localizePage() {
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const message = browser.i18n.getMessage(element.dataset.i18n);
    if (message)
      element.textContent = message;
  });
}

async function saveOptionsAsync(e) {
  e.preventDefault();
  if (e.submitter.id === "revert") {
    await browser.storage.sync.remove('filename_format');
    await browser.storage.sync.remove('filename_replacement_rules');
    await browser.storage.sync.remove('open_in_new_tab');
    if ((await browser.runtime.getPlatformInfo()).os !== 'android')
      await browser.storage.sync.remove('download_save_as');
    await browser.storage.sync.remove('redirect_pdf');
  } else if (e.submitter.id === "update") {
    var filenameReplacementRules;
    try {
      filenameReplacementRules = JSON.stringify(
        getFilenameReplacementRules(document.querySelector("#new-filename-replacement-rules").value),
        null,
        2
      );
    } catch (error) {
      const detail = error.message ? `\n${error.message}` : '';
      alert(`${browser.i18n.getMessage("invalidFilenameReplacementRules")}${detail}`);
      return;
    }
    const downloadSaveAsCheckbox = document.querySelector("#new-download-save-as");
    const options = {
      'filename_format': document.querySelector("#new-filename-format").value,
      'filename_replacement_rules': filenameReplacementRules,
      'open_in_new_tab': document.querySelector("#new-open-in-new-tab").checked,
      'redirect_pdf': document.querySelector("#new-redirect-pdf").checked,
    };
    if (!downloadSaveAsCheckbox.disabled)
      options.download_save_as = downloadSaveAsCheckbox.checked;
    try {
      await browser.storage.sync.set(options);
    } catch (error) {
      console.error("Failed to save options.", error);
      alert(`${browser.i18n.getMessage("unableToSaveOptions")} ${browser.i18n.getMessage("filenameRulesMayExceedSyncStorage")}`);
      return;
    }
  } else if (e.submitter.id === "revert-pdf-viewer-url-prefix") {
    await browser.storage.sync.remove('pdf_viewer_url_prefix');
  } else if (e.submitter.id === "update-pdf-viewer-url-prefix") {
    await browser.storage.sync.set({
      'pdf_viewer_url_prefix': document.querySelector("#new-pdf-viewer-url-prefix").value,
    });
  } else if (e.submitter.id === "revert-pdf-viewer-default-zoom") {
    await browser.storage.sync.remove('pdf_viewer_default_zoom');
  } else if (e.submitter.id === "update-pdf-viewer-default-zoom") {
    const zoomSelect = document.querySelector("#new-pdf-viewer-default-zoom");
    let zoomValue = zoomSelect.value;

    if (zoomValue === "custom") {
      const customZoomInput = document.querySelector("#custom-pdf-viewer-zoom");
      const customZoomValue = customZoomInput.value;
      if (customZoomValue && !isNaN(customZoomValue)) {
        zoomValue = customZoomValue;
      } else {
        // If invalid, fallback to 'auto'
        zoomValue = 'auto';
      }
    }

    await browser.storage.sync.set({
      'pdf_viewer_default_zoom': zoomValue,
    });
  }
  await restoreOptionsAsync();
}

async function restoreOptionsAsync() {
  const result = await browser.storage.sync.get({
    'filename_format': DEFAULT_FILENAME_FORMAT,
    'filename_replacement_rules': DEFAULT_FILENAME_REPLACEMENT_RULES,
    'open_in_new_tab': true,
    'download_save_as': false,
    'redirect_pdf': true,
    'pdf_viewer_url_prefix': '',
    'pdf_viewer_default_zoom': 'auto',
  });
  const filename_format = result.filename_format;
  document.querySelector("#filename-format").innerText = filename_format;
  document.querySelector("#new-filename-format").value = filename_format;
  const filename_replacement_rules = result.filename_replacement_rules;
  document.querySelector("#filename-replacement-rules").innerText = filename_replacement_rules;
  document.querySelector("#new-filename-replacement-rules").value = filename_replacement_rules;
  const open_in_new_tab = result.open_in_new_tab;
  document.querySelector("#new-open-in-new-tab").checked = open_in_new_tab;
  document.querySelector("#open-in-new-tab").innerText = getBooleanText(open_in_new_tab);
  const download_save_as = result.download_save_as;
  const isAndroid = (await browser.runtime.getPlatformInfo()).os === 'android';
  const downloadSaveAsCheckbox = document.querySelector("#new-download-save-as");
  downloadSaveAsCheckbox.disabled = isAndroid;
  downloadSaveAsCheckbox.checked = !isAndroid && download_save_as;
  document.querySelector("#download-save-as").innerText = isAndroid ? browser.i18n.getMessage('unavailableOnAndroid') : getBooleanText(download_save_as);
  const redirect_pdf = result.redirect_pdf;
  document.querySelector("#new-redirect-pdf").checked = redirect_pdf;
  document.querySelector("#redirect-pdf").innerText = getBooleanText(redirect_pdf);
  const pdf_viewer_url_prefix = result.pdf_viewer_url_prefix;
  document.querySelector("#pdf-viewer-url-prefix").innerText = pdf_viewer_url_prefix;
  if (pdf_viewer_url_prefix !== '')
    document.querySelector("#new-pdf-viewer-url-prefix").value = pdf_viewer_url_prefix;
  else
    document.querySelector("#new-pdf-viewer-url-prefix").value = "https://mozilla.github.io/pdf.js/web/viewer.html?file=";
  const pdf_viewer_default_zoom = result.pdf_viewer_default_zoom;
  document.querySelector("#pdf-viewer-default-zoom").innerText = getZoomText(pdf_viewer_default_zoom);

  // Check if it's a predefined value or custom
  const predefinedValues = ['auto', 'page-fit', 'page-width', '50', '75', '100', '125', '150', '200', '300', '400'];
  if (predefinedValues.includes(pdf_viewer_default_zoom)) {
    document.querySelector("#new-pdf-viewer-default-zoom").value = pdf_viewer_default_zoom;
    toggleCustomZoomInput('hide');
  } else {
    // It's a custom value
    document.querySelector("#new-pdf-viewer-default-zoom").value = 'custom';
    document.querySelector("#custom-pdf-viewer-zoom").value = pdf_viewer_default_zoom;
    toggleCustomZoomInput('show');
  }
}

function toggleCustomZoomInput(action) {
  const customZoomContainer = document.querySelector("#custom-zoom-container");
  if (action === 'show') {
    customZoomContainer.style.display = 'block';
  } else {
    customZoomContainer.style.display = 'none';
  }
}

function handleZoomSelectChange() {
  const zoomSelect = document.querySelector("#new-pdf-viewer-default-zoom");
  if (zoomSelect.value === 'custom') {
    toggleCustomZoomInput('show');
  } else {
    toggleCustomZoomInput('hide');
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  localizePage();
  await restoreOptionsAsync();
  
  // Add event listener for zoom dropdown change
  const zoomSelect = document.querySelector("#new-pdf-viewer-default-zoom");
  if (zoomSelect) {
    zoomSelect.addEventListener('change', handleZoomSelectChange);
  }
});

const forms = [...document.getElementsByTagName("form")]
forms.forEach(element => {
  element.addEventListener("submit", saveOptionsAsync);
})
