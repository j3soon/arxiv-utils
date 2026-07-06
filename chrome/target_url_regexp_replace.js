// Regular expressions for parsing target navigation URL from URLs.
// Ref: https://info.arxiv.org/help/arxiv_identifier_for_services.html#urls-for-standard-arxiv-functions
// Note: `https://arxiv.org/pdf/<id>.pdf` will be redirected to `https://arxiv.org/pdf/<id>` by arXiv.
// Regexp info:
// - Leading `^.*:\/\/` matches the protocol part of the URL such as `http://` or `https://`.
// - Trailing `(\?.*?)?(\#.*?)?$` matches the query string and fragment
// - Trailing `\?(?:.*?&)?` matches the leading extra query strings
// - Trailing `(&.*?)?` matches the extra query strings
export default [
  [/^.*:\/\/(?:export\.|browse\.|www\.)?arxiv\.org\/abs\/(\S*?)\/*(\?.*?)?(\#.*?)?$/, "https://arxiv.org/pdf/$1"],
  [/^.*:\/\/(?:export\.|browse\.|www\.)?arxiv\.org\/pdf\/(\S*?)(?:\.pdf)?\/*(\?.*?)?(\#.*?)?$/, "https://arxiv.org/abs/$1"],
  [/^.*:\/\/(?:export\.|browse\.|www\.)?arxiv\.org\/ftp\/(?:arxiv\/|([^\/]*\/))papers\/.*?([^\/]*?)\.pdf(\?.*?)?(\#.*?)?$/, "https://arxiv.org/abs/$1$2"],
  [/^.*:\/\/(?:browse\.|www\.)?arxiv\.org\/html\/(\S*?)\/*(\?.*?)?(\#.*?)?$/, "https://arxiv.org/abs/$1"],
  [/^.*:\/\/ar5iv\.labs\.arxiv\.org\/html\/(\S*?)\/*(\?.*?)?(\#.*?)?$/, "https://arxiv.org/abs/$1"],
  [/^.*:\/\/huggingface\.co\/papers\/(\S*?)(\?.*?)?(\#.*?)?$/, "https://arxiv.org/abs/$1"],
  [/^.*:\/\/(?:www\.)?alphaxiv\.org\/abs\/(\S*?)\/*(\?.*?)?(\#.*?)?$/, "https://arxiv.org/abs/$1"],
  [/^.*:\/\/openreview\.net\/forum\?(?:.*?&)?id=(\S*?)(&.*?)?(\#.*?)?$/, "https://openreview.net/pdf?id=$1"],
  [/^.*:\/\/openreview\.net\/pdf\?(?:.*?&)?id=(\S*?)(&.*?)?(\#.*?)?$/, "https://openreview.net/forum?id=$1"],
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
  [/^.*:\/\/ieeexplore\.ieee\.org\/document\/(\d+)(\?.*?)?(\#.*?)?$/, "https://ieeexplore.ieee.org/stamp/stamp.jsp?arnumber=$1"],
  [/^.*:\/\/ieeexplore\.ieee\.org\/stamp\/stamp\.jsp\?(?:.*?&)?arnumber=(\d+)(&.*?)?(\#.*?)?$/, "https://ieeexplore.ieee.org/document/$1"],
  [/^.*:\/\/aclanthology\.org\/([^\/]+)\.pdf(\?.*?)?(\#.*?)?$/, "https://aclanthology.org/$1/"],
  [/^.*:\/\/aclanthology\.org\/([^\/]+)\/(\?.*?)?(\#.*?)?$/, "https://aclanthology.org/$1.pdf"],
  // USENIX Security legacy technical-sessions PDFs use a `sec<NN>` file prefix, not the
  // `usenixsecurity<NN>` path code; rewrite to that prefix. Must precede the generic legacy
  // rule below (first-match-wins) so Security pages do not get the wrong prefix.
  [/^.*:\/\/(?:www\.)?usenix\.org\/conference\/usenixsecurity(\d+)\/technical-sessions\/presentation\/([^\/?#]+)\/*(?:\?.*?)?(?:\#.*?)?$/,
    "https://www.usenix.org/system/files/conference/usenixsecurity$1/sec$1-$2.pdf"],
  // USENIX legacy technical-sessions format (subdir PDFs, ~2012-2018), listed before the
  // flat format so these more specific patterns match first.
  // presentation -> PDF is calibrated to the NSDI-style `-paper-` infix (e.g. nsdi14).
  [/^.*:\/\/(?:www\.)?usenix\.org\/conference\/([^\/]+)\/technical-sessions\/presentation\/([^\/?#]+)\/*(?:\?.*?)?(?:\#.*?)?$/,
    "https://www.usenix.org/system/files/conference/$1/$1-paper-$2.pdf"],
  // PDF -> presentation: the conference code comes from the subdir, so a differing file
  // prefix (e.g. `sec<NN>` for USENIX Security) is irrelevant; tolerate an optional
  // paper-/papers- infix.
  [/^.*:\/\/(?:www\.)?usenix\.org\/system\/files\/conference\/([^\/]+)\/[^\/]+?-(?:papers?-)?([^\/]+?)\.pdf(?:\?.*?)?(?:\#.*?)?$/,
    "https://www.usenix.org/conference/$1/technical-sessions/presentation/$2"],
  // USENIX Security flat PDFs use a `sec<NN>` prefix (~2019-2022) while the conference path
  // code is `usenixsecurity<NN>`. Map it explicitly; must precede the generic flat rule.
  [/^.*:\/\/(?:www\.)?usenix\.org\/system\/files\/sec(\d+)-([^\/]+?)\.pdf(?:\?.*?)?(?:\#.*?)?$/,
    "https://www.usenix.org/conference/usenixsecurity$1/presentation/$2"],
  // USENIX Security flat PDFs used the `sec<NN>` prefix through 2022 before switching to
  // `usenixsecurity<NN>` in 2023; rewrite those years explicitly. Must precede the generic
  // flat rule below. 2023+ falls through to it (path code already matches the file prefix).
  [/^.*:\/\/(?:www\.)?usenix\.org\/conference\/usenixsecurity(19|20|21|22)\/presentation\/([^\/?#]+)\/*(?:\?.*?)?(?:\#.*?)?$/,
    "https://www.usenix.org/system/files/sec$1-$2.pdf"],
  // USENIX flat format (~2018+, e.g. nsdi26, fast26, usenixsecurity24):
  // `/conference/<conf>/presentation/<slug>` <-> `/system/files/<conf>-<slug>.pdf`.
  [/^.*:\/\/(?:www\.)?usenix\.org\/conference\/([^\/]+)\/presentation\/([^\/?#]+)\/*(?:\?.*?)?(?:\#.*?)?$/,
    "https://www.usenix.org/system/files/$1-$2.pdf"],
  // PDF -> presentation: tolerate an optional `paper-` infix some flat files carry (e.g. nsdi20).
  [/^.*:\/\/(?:www\.)?usenix\.org\/system\/files\/([^\/]+?)-(?:paper-)?([^\/]+?)\.pdf(?:\?.*?)?(?:\#.*?)?$/,
    "https://www.usenix.org/conference/$1/presentation/$2"],
];
