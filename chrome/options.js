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
    throw new Error(chrome.i18n.getMessage("filenameRulesMustBeArray"));
  for (const [index, rule] of rules.entries()) {
    if (rule === null || typeof rule !== 'object' || Array.isArray(rule))
      throw new Error(chrome.i18n.getMessage("filenameRuleMustBeObject", String(index + 1)));
    if (typeof rule.from !== 'string' || typeof rule.to !== 'string')
      throw new Error(chrome.i18n.getMessage("filenameRuleMustHaveStringFields", String(index + 1)));
    if (rule.from === '')
      throw new Error(chrome.i18n.getMessage("filenameRuleFromCannotBeEmpty", String(index + 1)));
  }
  return rules;
}

function getBooleanText(value) {
  return value
    ? chrome.i18n.getMessage("yes")
    : chrome.i18n.getMessage("no");
}

function localizePage() {
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const message = chrome.i18n.getMessage(element.dataset.i18n);
    if (message)
      element.textContent = message;
  });
}

async function saveOptionsAsync(e) {
  e.preventDefault();
  if (e.submitter.id === "revert") {
    await chrome.storage.sync.remove('filename_format');
    await chrome.storage.sync.remove('filename_replacement_rules');
    await chrome.storage.sync.remove('open_in_new_tab');
    await chrome.storage.sync.remove('download_save_as');
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
      alert(`${chrome.i18n.getMessage("invalidFilenameReplacementRules")}${detail}`);
      return;
    }
    try {
      await chrome.storage.sync.set({
        'filename_format': document.querySelector("#new-filename-format").value,
        'filename_replacement_rules': filenameReplacementRules,
        'open_in_new_tab': document.querySelector("#new-open-in-new-tab").checked,
        'download_save_as': document.querySelector("#new-download-save-as").checked,
      });
    } catch (error) {
      console.error("Failed to save options.", error);
      alert(`${chrome.i18n.getMessage("unableToSaveOptions")} ${chrome.i18n.getMessage("filenameRulesMayExceedSyncStorage")}`);
      return;
    }
  }
  await restoreOptionsAsync();
}

async function restoreOptionsAsync() {
  const result = await chrome.storage.sync.get({
    'filename_format': DEFAULT_FILENAME_FORMAT,
    'filename_replacement_rules': DEFAULT_FILENAME_REPLACEMENT_RULES,
    'open_in_new_tab': true,
    'download_save_as': false,
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
  document.querySelector("#new-download-save-as").checked = download_save_as;
  document.querySelector("#download-save-as").innerText = getBooleanText(download_save_as);
}

document.addEventListener('DOMContentLoaded', async () => {
  localizePage();
  await restoreOptionsAsync();
});
const forms = [...document.getElementsByTagName("form")]
forms.forEach(element => {
  element.addEventListener("submit", saveOptionsAsync);
})
