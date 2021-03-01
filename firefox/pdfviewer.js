var app = {};
app.name = "[arXiv-utils]";
// These 2 below is for regex matching.
app.abs_regexp = /arxiv.org\/abs\/([\S]*)$/;
app.pdf_regexp = /arxiv.org\/[\S]*\/([^\/]*)$/;
// Return the id parsed from the url.
app.getId = function (url) {
  url = url.replace(".pdf", "");
  if (url.endsWith("/")) url = url.slice(0, -1);
  match = url.match(app.pdf_regexp);
  // The first match is the matched string, the second one is the captured group.
  if (match === null || match.length !== 2) {
    return null;
  }
  return match[1];
}
// Get the title asynchronously, call the callbacks with the id, the type, and the queried title as argument when request done (`callback(id, type, title, newTitle)`).
app.getTitleAsync = function (id, type, callback) {
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
      // Modify the title to differentiate from abstract pages.
      title = title + " | " + type;
      callback(title);
    } else {
      console.log(app.name, "Error: ArXiv API request failed.");
    }
  };
  request.send();
}
// Insert the title into the active tab.
app.insertTitle = function (title) {
  var elTitle = document.getElementById("title");
  elTitle.innerText = title;
}
// Extract the pdf url from 'pdfviewer.html?target=<pdfURL>'.
app.extractURL = function () {
  var url = new URL(window.location.href);
  return url.searchParams.get("target");
}
// Inject embedded PDF.
app.injectPDF = function (url) {
  console.log(app.name, "Injecting PDF: " + url);
  var elPDF = document.createElement("iframe");
  elPDF.setAttribute("src", url);
  var elContainer = document.getElementById("container");
  elContainer.appendChild(elPDF);
}
// Run this once.
app.run = function () {
  var pdfURL = app.extractURL();
  var id = app.getId(pdfURL);
  app.getTitleAsync(id, "PDF", app.insertTitle);
  app.injectPDF(pdfURL);
}

app.run();
