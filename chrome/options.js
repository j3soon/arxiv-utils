async function saveOptionsAsync(e) {
  if (e.submitter.id === "revert") {
    await chrome.storage.sync.remove('filename_format');
    await chrome.storage.sync.remove('open_in_new_tab');
  } else if (e.submitter.id === "update") {
    await chrome.storage.sync.set({
      'filename_format': document.querySelector("#new-filename-format").value,
      'open_in_new_tab': document.querySelector("#new-open-in-new-tab").checked,
    });
  }
  e.preventDefault();
  await restoreOptionsAsync();
}

async function restoreOptionsAsync() {
  const result = await chrome.storage.sync.get({
    'filename_format': '${title}, ${firstAuthor} et al., ${publishedYear}, v${version}.pdf',
    'open_in_new_tab': true,
  });
  const filename_format = result.filename_format;
  document.querySelector("#filename-format").innerText = filename_format;
  document.querySelector("#new-filename-format").value = filename_format;
  const open_in_new_tab = result.open_in_new_tab;
  document.querySelector("#new-open-in-new-tab").checked = open_in_new_tab;
  document.querySelector("#open-in-new-tab").innerText = open_in_new_tab;
}

document.addEventListener('DOMContentLoaded', restoreOptionsAsync);
const forms = [...document.getElementsByTagName("form")]
forms.forEach(element => {
  element.addEventListener("submit", saveOptionsAsync);
})
