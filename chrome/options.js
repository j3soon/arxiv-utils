function saveOptions(e) {
  if (e.submitter.id === "revert") {
    chrome.storage.sync.remove('filename_format');
  } else {
    chrome.storage.sync.set({
      'filename_format': document.querySelector("#new-filename-format").value
    });
  }
  e.preventDefault();
  restoreOptions();
}

function restoreOptions() {
  chrome.storage.sync.get(
    {'filename_format': '${title}, ${firstAuthor} et al., ${publishedYear}.pdf'},
    function(res) {
      var filename_format = res.filename_format;
      document.querySelector("#filename-format").innerText = filename_format;
      document.querySelector("#new-filename-format").value = filename_format;
  });
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.querySelector("form").addEventListener("submit", saveOptions);