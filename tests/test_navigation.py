import time
from operator import itemgetter

import yaml
from selenium import webdriver
from selenium.common.exceptions import TimeoutException
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

testcases_path = "/app/tests/testcases.yaml"
with open(testcases_path, "r") as f:
    testcases = yaml.safe_load(f)

command_executor = 'http://selenium-hub:4444/wd/hub'

n_success = 0

for browser in ['chrome', 'firefox', 'edge']:
    print(f"Testing with browser: {browser}")
    if browser == 'chrome':
        options = webdriver.ChromeOptions()
        options.add_argument('load-extension=/app/chrome')
        options.add_argument("--window-size=1024,768")
        meta_options = webdriver.EdgeOptions()
        meta_options.add_argument("--window-size=1024,768")
        novnc_url = "http://chrome-node:7900"
        extensions_button_pos = (913, 67)
        pin_button_pos = (866, 219)
        arxiv_utils_button_pos = (882, 67)
    elif browser == 'firefox':
        options = webdriver.FirefoxOptions()
        # Ref: https://stackoverflow.com/a/55878622
        # The `window-size` argument below doesn't seem to work for firefox
        #
        #     options.add_argument("--window-size=1024,768")
        #
        options.add_argument("--width=800")
        options.add_argument("--height=600")
        meta_options = webdriver.EdgeOptions()
        meta_options.add_argument("--window-size=1024,768")
        novnc_url = "http://firefox-node:7900"
        extensions_button_pos = None
        pin_button_pos = None
        arxiv_utils_button_pos = (741, 87)
    elif browser == 'edge':
        options = webdriver.EdgeOptions()
        options.add_argument('load-extension=/app/chrome')
        options.add_argument("--window-size=1024,768")
        meta_options = webdriver.ChromeOptions()
        meta_options.add_argument("--window-size=1024,768")
        novnc_url = "http://edge-node:7900"
        extensions_button_pos = (819, 64)
        pin_button_pos = (785, 139)
        arxiv_utils_button_pos = (774, 64)
    else:
        raise ValueError(f"Invalid browser: {browser}")

    print(f"Launching webdriver...")
    driver = webdriver.Remote(
        command_executor=command_executor,
        options=options
    )
    wait = WebDriverWait(driver, 15)

    # The webdriver includes a default tab
    wait.until(EC.number_of_windows_to_be(1))
    windows_stack = [driver.current_window_handle]

    print(f"(Meta) Launching webdriver...")
    meta_driver = webdriver.Remote(
        command_executor=command_executor,
        options=meta_options
    )
    meta_wait = WebDriverWait(meta_driver, 15)
    meta_viewport_size = (
        meta_driver.execute_script("return window.innerWidth"),
        meta_driver.execute_script("return window.innerHeight")
    )
    viewport_offset_x = -meta_viewport_size[0] // 2
    viewport_offset_y = -meta_viewport_size[1] // 2
    print(f"(Meta) Viewport size is {meta_viewport_size}")

    print("(Meta) Visiting noVNC")
    meta_driver.get(novnc_url)

    print("(Meta) Clicking the Connect button")
    xpath = '//*[@id="noVNC_connect_button"]'
    element = meta_wait.until(EC.element_to_be_clickable((By.XPATH, xpath)))
    element.click()

    print("(Meta) Entering Password")
    xpath = '//*[@id="noVNC_password_input"]'
    password = 'secret'
    element = meta_wait.until(EC.element_to_be_clickable((By.XPATH, xpath)))
    element.click()
    element.send_keys(password + Keys.ENTER)

    # The following check doesn't seem reliable
    #
    #     print("(Meta) Waiting until Connected")
    #     xpath = '//*[@id="noVNC_status"]'
    #     expected = 'Connected (unencrypted)'
    #     meta_wait.until(EC.text_to_be_present_in_element_attribute((By.XPATH, xpath), 'innerHTML', expected))
    #
    print("Waiting 1 second for VNC connection")
    time.sleep(1)

    def meta_setup_arxiv_utils(restore=False):
        global addon_id
        print("(Meta) Locating Canvas")
        xpath = '//*[@id="noVNC_container"]/div/canvas'
        element = meta_wait.until(EC.presence_of_element_located((By.XPATH, xpath)))
        if browser == 'chrome' or browser == 'edge':
            if restore:
                print("(Meta) Unpinning arxiv-utils")
            else:
                print("(Meta) Pinning arxiv-utils")
            print("(Meta) Clicking Extensions Button (Open Dropdown)")
            x, y = extensions_button_pos
            x, y = x + viewport_offset_x, y + viewport_offset_y
            ActionChains(meta_driver)\
                .move_to_element_with_offset(element, x, y)\
                .click()\
                .perform()
            print("Waiting 1 second for the dropdown to open")
            time.sleep(1)
            print("(Meta) Clicking Pin (Unpinned -> Pinned) for arxiv-utils")
            x, y = pin_button_pos
            x, y = x + viewport_offset_x, y + viewport_offset_y
            ActionChains(meta_driver)\
                .move_to_element_with_offset(element, x, y)\
                .click()\
                .perform()
            print("Waiting 1 second for the pin to take effect")
            time.sleep(1)
            print("(Meta) Clicking Extensions Button (Close Dropdown)")
            x, y = extensions_button_pos
            x, y = x + viewport_offset_x, y + viewport_offset_y
            ActionChains(meta_driver)\
                .move_to_element_with_offset(element, x, y)\
                .click()\
                .perform()
        elif browser == 'firefox':
            if not restore:
                print(f"Installing add-on...")
                addon_id = webdriver.Firefox.install_addon(driver, '/app/firefox', temporary=True)
            else:
                print(f"Uninstalling add-on...")
                webdriver.Firefox.uninstall_addon(driver, addon_id)
        else:
            raise ValueError(f"Invalid browser: {browser}")
        print("Waiting 1 second after setting up arxiv-utils")
        time.sleep(1)

    def meta_click_arxiv_utils():
        print("(Meta) Locating Canvas")
        xpath = '//*[@id="noVNC_container"]/div/canvas'
        element = meta_wait.until(EC.presence_of_element_located((By.XPATH, xpath)))
        # The center coordinate can be obtained by:
        #
        #     ActionChains(meta_driver)\
        #        .move_to_element_with_offset(element, 0, 0)\
        #        .context_click()\
        #        .perform()
        #
        # and capture a screenshot with 1:1 VNC screen. The coordinate of the
        # context menu should be the same as (viewport_offset_x, viewport_offset_y).
        # Using the same screenshot above, we can then calculate the number of
        # pixels to retrieve the button coordinates.
        print("(Meta) Clicking Open Abstract / PDF")
        x, y = arxiv_utils_button_pos
        x, y = x + viewport_offset_x, y + viewport_offset_y
        ActionChains(meta_driver)\
            .move_to_element_with_offset(element, x, y)\
            .click()\
            .perform()

    meta_setup_arxiv_utils()

    for testcase in testcases['navigation']:
        url, title, pdf_url, pdf_title, description = \
            itemgetter('url', 'title', 'pdf_url', 'pdf_title', 'description')(testcase)
        abs2pdf = testcase.get('abs2pdf', True)
        pdf2abs = testcase.get('pdf2abs', True)

        if not abs2pdf and not pdf2abs:
            raise ValueError("Both `abs2pdf` and `pdf2abs` are False.")

        print(f"Running navigation testcase:")
        print(f"- URL: {url}")
        print(f"- Title: `{title}`")
        print(f"- PDF URL: {pdf_url}")
        print(f"- PDF Title: `{pdf_title}`")
        print(f"- Description: {description}")
        print(f"- Tests")
        print(f"  - Test abs2pdf? {abs2pdf}")
        print(f"  - Test pdf2abs? {pdf2abs}")

        if abs2pdf:
            print(f"Opening (abs) webpage...")
            driver.switch_to.new_window('tab')
            windows_stack.append(driver.current_window_handle)
            assert len(windows_stack) == 2
            assert len(driver.window_handles) == 2
            driver.get(url)
            print(f"Checking (abs) title...")
            try:
                wait.until(EC.title_is(title))
            except TimeoutException as e:
                print(f"Title mismatch: `{driver.title}`; URL: `{driver.current_url}`.")
            assert driver.title == title
            meta_click_arxiv_utils()
            wait.until(EC.number_of_windows_to_be(3))
            print(f"Closing (abs) webpage...")
            driver.close()
            windows_stack.pop()
            assert len(windows_stack) == 1
            assert len(driver.window_handles) == 2
            for window_handle in driver.window_handles:
                if window_handle not in windows_stack:
                    driver.switch_to.window(window_handle)
                    break
            windows_stack.append(driver.current_window_handle)
            assert len(windows_stack) == 2
            assert len(driver.window_handles) == 2
            print(f"Checking (pdf) url...")
            try:
                if browser == 'firefox':
                    suffix = f"/pdfviewer.html?target={pdf_url}"
                    wait.until(EC.url_contains(suffix))
                else:
                    wait.until(EC.url_to_be(pdf_url))
            except TimeoutException as e:
                print(f"URL mismatch: `{driver.current_url}`.")
            if browser == 'firefox':
                assert driver.current_url.startswith("moz-extension://")
                assert driver.current_url.endswith(suffix)
                xpath = '//*[@id="container"]/iframe'
                element = wait.until(EC.presence_of_element_located((By.XPATH, xpath)))
                assert element.get_attribute('src') == pdf_url
            else:
                assert driver.current_url == pdf_url
        else:
            print(f"Opening (pdf) webpage...")
            driver.switch_to.new_window('tab')
            windows_stack.append(driver.current_window_handle)
            assert len(windows_stack) == 2
            assert len(driver.window_handles) == 2
            driver.get(pdf_url)

        print(f"Current state is an empty tab and an active pdf tab.")
        print(f"Checking (pdf) title...")
        try:
            wait.until(EC.title_is(pdf_title))
        except TimeoutException as e:
            print(f"Title mismatch: `{driver.title}`; URL: `{driver.current_url}`.")
        assert driver.title == pdf_title

        if pdf2abs:
            meta_click_arxiv_utils()
            wait.until(EC.number_of_windows_to_be(3))
            print(f"Closing (pdf) webpage...")
            driver.close()
            windows_stack.pop()
            assert len(windows_stack) == 1
            assert len(driver.window_handles) == 2
            for window_handle in driver.window_handles:
                if window_handle not in windows_stack:
                    driver.switch_to.window(window_handle)
                    break
            windows_stack.append(driver.current_window_handle)
            assert len(windows_stack) == 2
            assert len(driver.window_handles) == 2
            print(f"Checking (abs) url...")
            try:
                wait.until(EC.url_to_be(url))
            except TimeoutException as e:
                print(f"URL mismatch: `{driver.current_url}`.")
            assert driver.current_url == url
            print(f"Checking (abs) title...")
            try:
                wait.until(EC.title_is(title))
            except TimeoutException as e:
                print(f"Title mismatch: `{driver.title}`; URL: `{driver.current_url}`.")
            assert driver.title == title
            print(f"Closing (abs) webpage...")
            driver.close()
            windows_stack.pop()
        else:
            print(f"Closing (pdf) webpage...")
            driver.close()
            windows_stack.pop()

        assert len(windows_stack) == 1
        assert len(driver.window_handles) == 1
        driver.switch_to.window(windows_stack[-1])

        print("Testcase Succeeded")
        n_success += 1

    meta_setup_arxiv_utils(restore=True)
    print(f"Closing webdriver...")
    driver.quit()
    print(f"(Meta) Closing webdriver...")
    meta_driver.quit()
    print(f"{browser.capitalize()} Tests Succeeded")

print("All tests passed successfully!")
print(f"Success: {n_success}/{n_success}")
