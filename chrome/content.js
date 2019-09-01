// This content_script is for changing the title after page loaded.
var app = {};
app.name = "[arXiv-utils]";
// For checking if tab title has been updated.
app.title = null;
// Return the type parsed from the url.
app.getType = function (url) {
  if (url.endsWith(".pdf")) {
    return "PDF";
  }
  return "Abstract";
}
// Return the id parsed from the url.
app.getId = function (url, type) {
  var match;
  if (type === "PDF") {
    match = url.match(/arxiv.org\/pdf\/([\S]*)\.pdf$/);
    // The first match is the matched string, the second one is the captured group.
    if (match === null || match.length !== 2) {
      return null;
    }
  } else {
    match = url.match(/arxiv.org\/abs\/([\S]*)$/);
    // The first match is the matched string, the second one is the captured group.
    if (match === null || match.length !== 2) {
      return null;
    }
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
      app.title = title;
      callback(title);
    }
  };
  request.send();
}
// Insert the title into the active tab.
// After the insertion, the title might be overwritten after the PDF has been loaded.
app.insertTitle = function (title) {
  console.log("Trying to change title to: " + title)
  var elTitles = document.getElementsByTagName("title");
  if (elTitles.length !== 0) {
    // Modify directly if <title> exists.
    var elTitle = elTitles[0];
    elTitle.innerHTML = title;
    console.log(app.name, "Modify <title> tag directly.");
    return;
  }
  var elHeads = document.getElementsByTagName("head");
  if (elHeads.length !== 0) {
    // Modify <head> if <title> doesn't exist.
    var elHead = elHeads[0];
    var elTitle = document.createElement("title");
    elTitle.innerHTML = title;
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
    elTitle.innerHTML = title;
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
  var type = app.getType(url);
  var id = app.getId(url, type);
  if (id === null) {
    console.log(app.name, "Error: Not in ArXiv pdf or abstract page, aborted.");
    return;
  }
  app.getTitleAsync(id, type, app.insertTitle);
}
app.run();

// Change the title again if it has been overwritten.
app.onMessage = function (tab, sender, sendResponse) {
  console.log(app.name, "onMessage / tab changed: " + tab.title + ".");
  if (tab.title === null || app.title === null) {
    // Didn't changed title or are trying to change.
    return;
  }
  if (tab.title === app.title || tab.title === tab.url) {
    // Changed by content_script itself.
    return;
  }
  console.log(app.name, "Tab title has been changed!");
  app.insertTitle(app.title);
}
// Listen for background script's message, since the title might be changed when PDF is loaded.
chrome.runtime.onMessage.addListener(app.onMessage);
