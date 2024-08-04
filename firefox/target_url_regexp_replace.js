// Regular expressions for parsing target navigation URL from URLs.
// Ref: https://info.arxiv.org/help/arxiv_identifier_for_services.html#urls-for-standard-arxiv-functions
// Note: `https://arxiv.org/pdf/<id>.pdf` will be redirected to `https://arxiv.org/pdf/<id>` by arXiv.
export default [
  [/^.*:\/\/(?:export\.|browse\.|www\.)?arxiv\.org\/abs\/(\S*?)\/*(\?.*?)?(\#.*?)?$/, "https://arxiv.org/pdf/$1"],
  [/^.*:\/\/(?:export\.|browse\.|www\.)?arxiv\.org\/pdf\/(\S*?)(?:\.pdf)?\/*(\?.*?)?(\#.*?)?$/, "https://arxiv.org/abs/$1"],
  [/^.*:\/\/(?:export\.|browse\.|www\.)?arxiv\.org\/ftp\/(?:arxiv\/|([^\/]*\/))papers\/.*?([^\/]*?)\.pdf(\?.*?)?(\#.*?)?$/, "https://arxiv.org/abs/$1$2"],
  [/^.*:\/\/(?:browse\.|www\.)?arxiv\.org\/html\/(\S*?)\/*(\?.*?)?(\#.*?)?$/, "https://arxiv.org/abs/$1"],
  [/^.*:\/\/ar5iv\.labs\.arxiv\.org\/html\/(\S*?)\/*(\?.*?)?(\#.*?)?$/, "https://arxiv.org/abs/$1"],
  [/^.*:\/\/openreview\.net\/forum\?id=(\S*?)(&.*?)?(\#.*?)?$/, "https://openreview.net/pdf?id=$1"],
  [/^.*:\/\/openreview\.net\/pdf\?id=(\S*?)(&.*?)?(\#.*?)?$/, "https://openreview.net/forum?id=$1"],
  // Starting from 2022, NIPS urls may end with a `-Conference` suffix
  [/^.*:\/\/(papers|proceedings)\.(nips|neurips)\.cc\/paper_files\/paper\/(\d*)\/(?:[^\/]*)\/(.*?)-Abstract(-Conference)?\.html(\?.*?)?(\#.*?)?$/,
    "https://$1.$2.cc/paper_files/paper/$3/file/$4-Paper$5.pdf"],
  [/^.*:\/\/(papers|proceedings)\.(nips|neurips)\.cc\/paper_files\/paper\/(\d*)\/(?:[^\/]*)\/(.*?)-.*?(-Conference)?\..*?(\?.*?)?(\#.*?)?$/,
    "https://$1.$2.cc/paper_files/paper/$3/hash/$4-Abstract$5.html"],
  [/^.*:\/\/proceedings\.mlr\.press\/(.*?)\/(.*?)(?:\/.*?)?(?:-supp)?\.pdf$/, "https://proceedings.mlr.press/$1/$2.html"],
  [/^.*:\/\/proceedings\.mlr\.press\/(.*?)\/(.*?)(?:\.html)?(\?.*?)?(\#.*?)?$/, "https://proceedings.mlr.press/$1/$2/$2.pdf"],
  [/^.*:\/\/openaccess\.thecvf\.com\/(.*?)\/html\/(.*?)\.html(\?.*?)?(\#.*?)?$/, "https://openaccess.thecvf.com/$1/papers/$2.pdf"],
  [/^.*:\/\/openaccess\.thecvf\.com\/(.*?)\/papers\/(.*?)\.pdf(\?.*?)?(\#.*?)?$/, "https://openaccess.thecvf.com/$1/html/$2.html"],
  [/^.*:\/\/www\.jmlr\.org\/papers\/v(\d+)\/(.*?)\.html(\?.*?)?(\#.*?)?$/, "https://www.jmlr.org/papers/volume$1/$2/$2.pdf"],
  [/^.*:\/\/www\.jmlr\.org\/papers\/volume(\d+)\/(.*?)\/(.*?)\.pdf(\?.*?)?(\#.*?)?$/, "https://www.jmlr.org/papers/v$1/$2.html"],
];
