// This content_script is for changing the title after page loaded. (Abstract retitle only)
// Note: This script is disabled in PDF.js pages in firefox.
var app = {};
app.name = "[arXiv-utils]";
// Return the id parsed from the url.
app.getId = function (url) {
  var match = url.match(/arxiv.org\/abs\/([\S]*)$/);
  // The first match is the matched string, the second one is the captured group.
  if (match === null || match.length !== 2) {
    return null;
  }
  return match[1];
}
// Get the title asynchronously, call the callback with title as argument when request done.
app.getTitleAsync = function (id, type, callback) {
  var request = new XMLHttpRequest();
  request.open("GET", "https://export.arxiv.org/api/query?id_list=" + id);
  request.onload = function () {
    if (request.status === 200) {
      var resp = request.responseText;
      var parser = new DOMParser();
      var xmlDoc = parser.parseFromString(resp, "text/xml");
      // The first title is query string, second one is paper name.
      var title = xmlDoc.getElementsByTagName("title")[1].innerHTML;
      // Modify the title to differentiate from abstract pages.
      title = title + " | " + type;
      callback(title);
    }
  };
  request.send();
}
// Insert the title into the active tab.
app.insertTitle = function (title) {
  console.log(app.name, "Trying to change title to: " + title)
  var elTitles = document.getElementsByTagName("title");
  if (elTitles.length !== 0) {
    // Modify directly if <title> exists.
    var elTitle = elTitles[0];
    elTitle.innerText = title;
    console.log(app.name, "Modify <title> tag directly.");
    return;
  }
  var elHeads = document.getElementsByTagName("head");
  if (elHeads.length !== 0) {
    // Modify <head> if <title> doesn't exist.
    var elHead = elHeads[0];
    var elTitle = document.createElement("title");
    elTitle.innerText = title;
    elHead.appendChild(elTitle);
    console.log(app.name, "Modify <head> tag.");
    return;
  }
  var elHtmls = document.getElementsByTagName("html");
  if (elHtmls.length !== 0) {
    // Modify <html> if both <title> and <head> doesn't exist.
    var elHtml = elHtmls[0];
    var elHead = document.createElement("head");
    var elTitle = document.createElement("title");
    elTitle.innerText = title;
    elHead.appendChild(elTitle);
    if (elHtml.firstChild !== null) {
      elHtml.insertBefore(elHead, elHtml.firstChild);
      console.log(app.name, "Modify <html> tag by inserting before first child.");
    } else {
      elHtml.appendChild(elHead);
      console.log(app.name, "Modify <html> tag by appending.");
    }
    return;
  }
  console.log(app.name, "Error: Cannot insert title");
}
// Run this after the page has finish loading.
app.run = function () {
  var url = location.href;
  var id = app.getId(url);
  if (id === null) {
    console.log(app.name, "Error: Not in ArXiv pdf or abstract page, aborted.");
    return;
  }
  app.getTitleAsync(id, "Abstract", app.insertTitle);
}
app.run();
