// This content_script is for changing the title after page loaded. (Abstract retitle only)
var app = {};
// All logs should start with this.
app.name = "[arXiv-utils]";
// These 2 below are for inserting download link.
app.firstAuthor = undefined;
app.publishedYear = undefined;
// These 2 below is for regex matching.
app.abs_regexp = /arxiv.org\/abs\/([\S]*)$/;
app.pdf_regexp = /arxiv.org\/[\S]*\/([^\/]*)$/;
// Return the type parsed from the url. (Returns "PDF" or "Abstract")
app.getType = function (url) {
  if (url.indexOf("pdf") !== -1) {
    return "PDF";
  }
  return "Abstract";
}
// Return the id parsed from the url.
app.getId = function (url, type) {
  url = url.replace(".pdf", "");
  if (url.endsWith("/")) url = url.slice(0, -1);
  var match;
  if (type === "PDF") {
    // match = url.match(/arxiv.org\/pdf\/([\S]*)\2pdf$/);
    match = url.match(app.pdf_regexp);
    // The first match is the matched string, the second one is the captured group.
    if (match === null || match.length !== 2) {
      return null;
    }
  } else {
    match = url.match(app.abs_regexp);
    // The first match is the matched string, the second one is the captured group.
    if (match === null || match.length !== 2) {
      return null;
    }
  }
  return match[1];
}
// Get the title asynchronously, call the callbacks with the id, the type, and the queried title as argument when request done (`callback(id, type, title, newTitle)`).
// Updates `app`'s 4 variables: `title`, `type`, `id`, `newTitle` before callback.
app.getTitleAsync = function (id, type, callback, callback2) {
  console.log(app.name, "Retrieving title through ArXiv API request...");
  var request = new XMLHttpRequest();
  request.open("GET", "https://export.arxiv.org/api/query?id_list=" + id);
  request.onload = function () {
    if (request.status === 200) {
      var resp = request.responseText;
      var parser = new DOMParser();
      var xmlDoc = parser.parseFromString(resp, "text/xml");
      // The first title is query string, second one is paper name.
      var title = xmlDoc.getElementsByTagName("title")[1].innerHTML;
      title = title.replace("\n", "").replace("  ", " ");
      // Store paper info
      app.firstAuthor = xmlDoc.getElementsByTagName("name")[0].innerHTML;
      app.publishedYear = xmlDoc.getElementsByTagName("published")[0].innerHTML.split('-')[0];
      // Modify the title to differentiate from abstract pages.
      app.id = id;
      app.type = type;
      app.title = title;
      app.newTitle = title + " | " + type;
      callback(app.id, app.type, app.title, app.newTitle);
      callback2(app.id, app.type, app.title, app.newTitle);
    } else {
      console.log(app.name, "Error: ArXiv API request failed.");
    }
  };
  request.send();
}
// Insert the title into the active tab.
app.insertTitle = function (id, title, newTitle) {
  console.log(app.name, "Trying to change title to: " + newTitle)
  var elTitles = document.getElementsByTagName("title");
  if (elTitles.length !== 0) {
    // Modify directly if <title> exists.
    var elTitle = elTitles[0];
    elTitle.innerText = newTitle;
    console.log(app.name, "Modify <title> tag directly.");
    return;
  }
  var elHeads = document.getElementsByTagName("head");
  if (elHeads.length !== 0) {
    // Modify <head> if <title> doesn't exist.
    var elHead = elHeads[0];
    var elTitle = document.createElement("title");
    elTitle.innerText = newTitle;
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
    elTitle.innerText = newTitle;
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
// Add a direct download link if is abstract page.
app.addDownloadLink = function (id, title, newTitle) {
  var fileName = `${title}, ${app.firstAuthor} et al., ${app.publishedYear}.pdf`;
  var elULs = document.querySelectorAll(".full-text > ul");
  if (elULs.length === 0) {
    console.log(app.name, "Error: Items selected by '.full-text > ul' not found");
    return;
  }
  var elUL = elULs[0];
  var elLI = document.createElement("li");
  var elA = document.createElement("a");
  var directURL = "https://arxiv.org/pdf/" + id + ".pdf?download";
  elA.innerText = "Direct Download";
  elA.setAttribute("href", directURL);
  elA.setAttribute("download", fileName);
  elA.setAttribute("type", "application/pdf");
  elLI.appendChild(elA);
  elUL.appendChild(elLI)
  console.log(app.name, "Added direct download link.")
  // For Firefox, add meta tag to force download.
  // var elHeads = document.getElementsByTagName("head");
  // if (elHeads.length === 0) {
  //   console.log(app.name, "Error: head tag not found");
  //   return;
  // }
  // var elHead = elHeads[0];
  // var elMeta = document.createElement("meta");
  // elMeta.setAttribute("name", "content-disposition");
  // elMeta.setAttribute("content", "attachment; filename=" + fileName + ".pdf");
  // elHead.appendChild(elMeta);
  // console.log(app.name, "Added meta tag to force firefox download.");
}
// Run this after the page has finish loading.
app.run = function () {
  var url = location.href;
  var id = app.getId(url);
  if (id === null) {
    console.log(app.name, "Error: Not in ArXiv pdf or abstract page, aborted.");
    return;
  }
  app.getTitleAsync(id, "Abstract", app.insertTitle, app.addDownloadLink);
}
app.run();
