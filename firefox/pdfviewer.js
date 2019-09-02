var app = {};
app.name = "[arXiv-utils]";
// Return the id parsed from the url.
app.getId = function (url) {
  var match = url.match(/arxiv.org\/pdf\/([\S]*)\.pdf$/);
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
  var elPDF = document.createElement("object");
  elPDF.setAttribute('type', 'application/pdf');
  elPDF.setAttribute('data', url);
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
