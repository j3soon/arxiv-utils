async function saveOptionsAsync(e) {
  if (e.submitter.id === "revert") {
    await chrome.storage.sync.remove('filename_format');
  } else {
    await chrome.storage.sync.set({
      'filename_format': document.querySelector("#new-filename-format").value
    });
  }
  e.preventDefault();
  await restoreOptionsAsync();
}

async function restoreOptionsAsync() {
  const result = await chrome.storage.sync.get({
    'filename_format': '${title}, ${firstAuthor} et al., ${publishedYear}.pdf'
  });
  const filename_format = result.filename_format;
  document.querySelector("#filename-format").innerText = filename_format;
  document.querySelector("#new-filename-format").value = filename_format;
}

document.addEventListener('DOMContentLoaded', restoreOptionsAsync);
document.querySelector("form").addEventListener("submit", saveOptionsAsync);