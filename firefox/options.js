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
  var gettingItem = chrome.storage.sync.get('filename_format');
  gettingItem.then((res) => {
    var filename_format = res.filename_format || '${title}, ${firstAuthor} et al., ${publishedYear}.pdf';
    document.querySelector("#filename-format").innerHTML = filename_format;
    document.querySelector("#new-filename-format").value = filename_format;
  });
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.querySelector("form").addEventListener("submit", saveOptions);