// Regular expressions and replacements for navigating between USENIX
// presentation pages and their corresponding PDFs.
const TARGET_URL_REGEXP_REPLACE = [
  // USENIX presentation page -> PDF
  [/^.*:\/\/(?:www\.)?usenix\.org\/conference\/([^\/]+)\/presentation\/([^\/\?#]+)\/*(\?.*?)?(\#.*?)?$/, 'https://www.usenix.org/system/files/$1-$2.pdf'],
  // USENIX PDF -> presentation page
  [/^.*:\/\/(?:www\.)?usenix\.org\/system\/files\/([a-z]+\d+)-(.+?)\.pdf(\?.*?)?(\#.*?)?$/, 'https://www.usenix.org/conference/$1/presentation/$2'],
];

export default TARGET_URL_REGEXP_REPLACE;
