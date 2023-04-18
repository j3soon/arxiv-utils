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
  // Must use `browser` instead of `chrome` here to use the return value of await.
  const result = await browser.storage.sync.get({
    'filename_format': '${title}, ${firstAuthor} et al., ${publishedYear}.pdf'
  });
  var filename_format = result.filename_format;
  document.querySelector("#filename-format").innerText = filename_format;
  document.querySelector("#new-filename-format").value = filename_format;
}

document.addEventListener('DOMContentLoaded', restoreOptionsAsync);
document.querySelector("form").addEventListener("submit", saveOptionsAsync);