function saveOptions(e) {
  if (e.submitter.id === "revert") {
    browser.storage.sync.remove('filename_format');
  } else {
    browser.storage.sync.set({'filename_format': document.querySelector("#new-filename-format").value});
  }
  e.preventDefault();
  restoreOptions();
}

function restoreOptions() {
  var gettingItem = browser.storage.sync.get('filename_format');
  if (!gettingItem) {
    var filename_format = '${title}, ${firstAuthor} et al., ${publishedYear}.pdf';
    document.querySelector("#filename-format").innerHTML = filename_format;
    document.querySelector("#new-filename-format").value = filename_format;
  } else {
    gettingItem.then((res) => {
      var filename_format = res.filename_format || '${title}, ${firstAuthor} et al., ${publishedYear}.pdf';
      document.querySelector("#filename-format").innerHTML = filename_format;
      document.querySelector("#new-filename-format").value = filename_format;
    });
  }
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.querySelector("form").addEventListener("submit", saveOptions);