#%%
from selenium import webdriver
from selenium.common.exceptions import TimeoutException
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

#%%
# ['chrome', 'firefox', 'edge']
browser = 'firefox'
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
wait = WebDriverWait(driver, 60)
# The webdriver includes a default tab
wait.until(EC.number_of_windows_to_be(1))
initial_window = driver.current_window_handle

driver.get("https://duckduckgo.com")

#%%
# Make sure to quit before starting a new webdriver!
driver.quit()

# %%
