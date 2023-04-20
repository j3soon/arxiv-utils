// TODO: Refactor
var app = {};
app.name = "[arXiv-utils]";
// Regular expressions for parsing arXiv URLs.
// Ref: https://info.arxiv.org/help/arxiv_identifier_for_services.html#urls-for-standard-arxiv-functions
const ABS_REGEXP = /arxiv\.org\/abs\/(\S*?)\/*$/;
const PDF_REGEXP = /arxiv\.org\/pdf\/(\S*?)(?:\.pdf)?\/*$/;
const FTP_REGEXP = /arxiv\.org\/ftp\/(?:arxiv\/)?((?!arxiv\/)[^\/]*\/)?papers\/.*?([^\/]*?)\.pdf$/;
// All console logs should start with this prefix.
const LOG_PREFIX = "[arXiv-utils]";
// Return the id parsed from the url.
function getId(url) {
  const match_abs = url.match(ABS_REGEXP);
  const match_pdf = url.match(PDF_REGEXP);
  const match_ftp = url.match(FTP_REGEXP);
  // string.match() returns null if no match found.
  return match_abs && match_abs[1] ||
         match_pdf && match_pdf[1] ||
         match_ftp && match_ftp[2] && [match_ftp[1], match_ftp[2]].join('');
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
  var id = getId(pdfURL);
  app.getTitleAsync(id, "PDF", app.insertTitle);
  app.injectPDF(pdfURL);
}

app.run();
