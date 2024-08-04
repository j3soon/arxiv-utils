from operator import itemgetter

import yaml
from selenium import webdriver
from selenium.common.exceptions import TimeoutException
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

testcases_path = "/app/tests/testcases/testcases.yaml"
with open(testcases_path, "r") as f:
    testcases = yaml.safe_load(f)

n_success = 0
n_skipped = 0

for browser in ['chrome', 'firefox', 'edge']:
    print(f"Testing with browser: {browser}")
    options = {
       'chrome': webdriver.ChromeOptions(),
       'firefox': webdriver.FirefoxOptions(),
       'edge': webdriver.EdgeOptions(),
    }[browser]

    print(f"Launching webdriver...")
    driver = webdriver.Remote(
        command_executor='http://selenium-hub:4444/wd/hub',
        options=options
    )
    wait = WebDriverWait(driver, 15)
    # The webdriver includes a default tab
    wait.until(EC.number_of_windows_to_be(1))
    initial_window = driver.current_window_handle

    for testcase in testcases['default']:
        url, title, description = itemgetter('url', 'title', 'description')(testcase)
        print(f"Running testcase:")
        print(f"- URL: {url}")
        print(f"- Title: `{title}`")
        print(f"- Description: {description}")

        if 'pdf' in url:
            # The current page title is `about:blank` with `application/pdf` as the content type.
            # The pdf is stored in a embed frame `/html/body/embed`.
            # However, I don't think it's possible to switch to that frame, since the PDF viewer itself is an extension.
            # There are several potential solutions:
            # - One way forward is to somehow access the pdf frame content and retrieve the title.
            # - Another way is to somehow use JavaScript to retrieve the pdf frame title and expose it through the browser.
            # - The last way is to give up accessing the pdf title, and instead only check the html title for non-default testcases.
            # The first two solutions cannot be implmented, so we apply the third solution.
            # Ref: https://stackoverflow.com/a/29817526
            # Ref: https://stackoverflow.com/a/4693418
            # Ref: https://stackoverflow.com/a/68041520
            print("Testcase Skipped (Ends with .pdf)")
            n_skipped += 1
            continue

        print(f"Opening webpage...")
        driver.switch_to.new_window('tab')
        assert len(driver.window_handles) == 2
        driver.get(url)

        print(f"Checking title...")
        try:
            wait.until(EC.title_is(title))
        except TimeoutException as e:
            print(f"Title mismatch: `{driver.title}`; URL: `{driver.current_url}`.")
        assert driver.title == title

        print(f"Closing webpage...")
        driver.close()
        assert len(driver.window_handles) == 1
        driver.switch_to.window(initial_window)

        print("Testcase Succeeded")
        n_success += 1

    print(f"Closing webdriver...")
    driver.quit()
    print(f"{browser.capitalize()} Tests Succeeded")

print("All tests passed successfully!")
n = n_success + n_skipped
print(f"Success: {n_success}/{n}; Skipped: {n_skipped}/{n}")
