const { Builder } = require('selenium-webdriver');

/*
 * Name: initializeSeleniumDriver
 *
 * Parameters:
 *   url        - URL for the selenium instance 
 *   retryCount - number of retries 
 *   interval   - retry interval
 *
 * Returns: the selenium driver instance if it's up or null if it ran
 * out of retries.
 *
 */
async function initializeSeleniumDriver(url, retryCount = 9, interval = 5000) {
  let attempt = 0;
  while (attempt < retryCount) {
    try {
      // Try to create a driver instance to check if the Selenium server is up
      const driver = await new Builder()
        .forBrowser('chrome')
        .usingServer(url)
        .build();

      return driver; // Server is up
    } catch (error) {
      console.log(`Selenium server not up yet, retrying... (${++attempt}/${retryCount})`);
      await new Promise(resolve => setTimeout(resolve, interval));
    }
  }

  // driver could not be created
  return null;
}

module.exports = { initializeSeleniumDriver };
