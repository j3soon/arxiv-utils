async function saveOptionsAsync(e) {
  if (e.submitter.id === "revert-filename-format") {
    await chrome.storage.sync.remove('filename_format');
  } else if (e.submitter.id === "update-filename-format") {
    await chrome.storage.sync.set({
      'filename_format': document.querySelector("#new-filename-format").value
    });
  }
  e.preventDefault();
  await restoreOptionsAsync();
}

async function restoreOptionsAsync() {
  const result = await chrome.storage.sync.get({
    'filename_format': '${title}, ${firstAuthor} et al., ${publishedYear}, v${version}.pdf'
  });
  const filename_format = result.filename_format;
  document.querySelector("#filename-format").innerText = filename_format;
  document.querySelector("#new-filename-format").value = filename_format;
}

document.addEventListener('DOMContentLoaded', restoreOptionsAsync);
const forms = [...document.getElementsByTagName("form")]
forms.forEach(element => {
  element.addEventListener("submit", saveOptionsAsync);
})
