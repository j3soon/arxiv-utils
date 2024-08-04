const yaml = require('js-yaml');
const fs = require('fs');

import TARGET_URL_REGEXP_REPLACE from '../../firefox/target_url_regexp_replace.js';

function getTargetURL(url) {
  for (const [regexp, replacement] of TARGET_URL_REGEXP_REPLACE) {
    if (regexp.test(url))
      return url.replace(regexp, replacement);
  }
  return null;
}

test('navigation rules', () => {
  const testcases_path = "/app/tests/testcases/testcases.yaml";
  const testcases = yaml.load(fs.readFileSync(testcases_path, 'utf8'));
  let n_success = 0
  for (const testcase of testcases.navigation) {
    const { url, title, pdf_url, pdf_title, url2, title2, description, abs2pdf = true, pdf2abs = true } = testcase;
    if (!abs2pdf && !pdf2abs) {
      throw new Error("Both `abs2pdf` and `pdf2abs` are False.");
    }
    console.log(`Running navigation testcase:
- URL: ${url}
- Title: \`${title}\`
- PDF URL: ${pdf_url}
- PDF Title: \`${pdf_title}\`
- URL2: ${url2}
- Title2: \`${title2}\`
- Description: ${description}
- Tests
  - Test abs2pdf? ${abs2pdf}
  - Test pdf2abs? ${pdf2abs}`
);
    if (abs2pdf) {
      if (pdf_url) {
        console.log("Checking (abs) url -> pdf_url...")
        expect(getTargetURL(url)).toBe(pdf_url);
      } else if (url2) {
        console.log("Checking url -> url2...")
        expect(getTargetURL(url)).toBe(url2);
      }
    }
    if (pdf2abs) {
      if (pdf_url) {
        console.log("Checking pdf_url -> (abs) url...")
        expect(getTargetURL(pdf_url)).toBe(url);
      }
    }
    console.log("Testcase Succeeded")
    n_success += 1
  }
  console.log("All tests passed successfully!\n" +
              `Success: ${n_success}/${n_success}`);
});
