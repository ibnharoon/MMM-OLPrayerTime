// Import necessary modules from selenium-webdriver for browser manipulation
const { Builder, By, until } = require('selenium-webdriver');

// Import exec and util for executing shell commands and util.promisify
const { exec } = require('child_process');
const util = require('util');
const Dayjs = require('dayjs');
const {
  initializeSeleniumDriver,
  generateTest
} = require('../lib/utils');
const {
  calculateExpectedDate,
  validatePrayerTime
} = require('../lib/ui');
const {
  ValidateCurrentDate
} = require('../lib/ValidateCurrentDate');
const {
  ValidateDuration
} = require('../lib/ValidateDuration');
const {
  ValidateCurrentHijriDate
} = require('../lib/ValidateCurrentHijriDate');
const {
  ValidateNextPrayerMsg
} = require('../lib/ValidateNextPrayerMsg');
const {
  ValidateNextHijriDate
} = require('../lib/ValidateNextHijriDate');
const {
  ValidateNextPrayerDuration
} = require('../lib/ValidateNextPrayerDuration');
const {
  ValidateCurrentPrayerHighlighted
} = require('../lib/ValidateCurrentPrayerHighlighted');
const {
  ValidateNextPrayerHighlighted
} = require('../lib/ValidateNextPrayerHighlighted');
const {
  ValidatePreviousPrayerHighlighted
} = require('../lib/ValidatePreviousPrayerHighlighted');

// Convert exec to a promise-based function for async/await usage
const execAsync = util.promisify(exec);

// Non-prayer time that needs to be filter out
const nonPrayer = ['Sunrise', 'Midnight'];

global.expect = null;

/*
 * Name: test02
 *
 * Purpose:
 * This test suite is designed to validate the functionality of a prayer time application
 * running in a Dockerized environment. The application displays 
 * prayer times along with the Hijri date. The goals are to ensure that:
 *   - The application correctly calculates and displays the prayer times and Hijri date.
 *   - The prayer time transitions happen accurately according to the specified times.
 *   - The application's front-end elements reflect the expected state changes at given times.
 * Each test simulates the system time to check the application's behavior at specific prayer
 * intervals, ensuring the application's reliability and accuracy throughout the day.
 * 
 * Strategy:
 * 2 docker container will be created for the prayer time application and selenium standalone instance.
 * The two docker instances will be started with system time set to 2 minutes before the prayer starts.
 * If the 2 instances are not up within a specified time, the tests will be skipped, otherwise for each prayer
 * it will test for existence of the time duration element with the duration string of 2m and the blinking
 * attribute is on. It will then wait until the next minute and check if the duration changes to 1m. It will 
 * then wait for the next minute where the current prayer changes to the next prayer, and the hijri date changes to the next day. In some cases where the 
 * are not actual prayer times (sunrise, midnight) the next prayer check will be skipped. The hijri date 
 * changes when the maghrib prayer starts.
 *
 * Steps:
 * - before: Sets up the testing environment by dynamically importing the Chai library for assertions,
 *   building Docker images with a specified 'fakeTime' to simulate the system time at different prayer times,
 *   and initializing the Selenium WebDriver for browser automation. This setup prepares the application
 *   in a controlled state for testing.
 * - after: Tears down the testing environment by quitting the Selenium WebDriver, shutting down the Docker
 *   environment, and removing the Docker images. This cleanup ensures that each test run starts with a fresh
 *   environment and prevents resource leaks.
 *
 */

const stages = [
  {
    min: 2,
    delay: 0,
    blink: true,
    msg: '2m before'
  },
  {
    min: 1,
    delay: 60000,
    blink: true,
    msg: '1m before'
  },
  {
    min: 0,
    delay: 70000,
    blink: false,
    msg: 'on'
  }
];

// Last day on non-leap year
const date = '2025-12-31';
const rdate = new Dayjs(date, 'YYYY-MM-DD');
const testscenarios = generateTest(rdate);
// const testscenarios = {};

Object.entries(testscenarios).forEach(([currentPrayer, testscenario]) => {
  // console.log(JSON.stringify(testscenario) + ', currentPrayer: ' + JSON.stringify(currentPrayer));
  const fakeTime = testscenario['fakeTime'];
  const previousPrayer = testscenario['previousPrayer'];
  const expectedHijriDate = testscenario['hijri'];
  const nextHijri = testscenario['nextHijri'];
  const nextPrayer = testscenario['nextPrayer'];

  describe('Test scenario for last day on a non-leap year', function () {
    this.timeout(3600000);

    global.driver = null; // Declare Selenium WebDriver
    before(async () => {
      // Setup actions before each test suite
      const chai = await import('chai');  // Dynamically import Chai for assertions
      expect = chai.expect;               // Assign expect for assertions
      console.log(`Building Docker images with time 2m before ${currentPrayer}`);

      // Build and start Docker containers configured to 2m before the current prayer starts
      await execAsync(`docker build --build-arg "FAKETIME=${fakeTime}" -t mm-magicmirror . --file Dockerfile-mm`);
      await execAsync(`docker build --build-arg "FAKETIME=${fakeTime}" -t mm-selenium . --file Dockerfile-selenium`);
      await execAsync('docker compose up -d');  // Start the Docker environment

      const seleniumServerUrl = 'http://172.20.5.2:4444/wd/hub';
      driver = await initializeSeleniumDriver(seleniumServerUrl);  // Wait for the selenium server to be fully up and running
      // Assert that driver is initialized successfully
      expect(driver, 'Selenium server did not start within the expected time.').to.not.be.null;

      await driver.get('http://172.20.5.1:8080');

      // Wait for the element to be present in the DOM and assert its presence
      var durationElement = await driver.wait(until.elementLocated(By.id('ptimeDOM-premain')), 10000);
      expect(durationElement, 'Span element with id "ptimeDOM-premain" should be present').to.exist;
    });

    after(async () => {
      // Cleanup actions after each test suite
      if (driver !== null) {
        await driver.quit();  // Quit the Selenium WebDriver
      }

      await execAsync('docker compose down'); // Stop the Docker environment

      console.log(`Cleaning up Docker images`);
      await execAsync(`docker rmi mm-magicmirror`); // Remove Docker images
      await execAsync(`docker rmi mm-selenium`);
    });

    Object.entries(stages).forEach(([addMinStr, stage]) => {
      //console.log('stage: ' + JSON.stringify(stage));
      var addMin = parseInt(addMinStr);
      const config = {
        msg: stage.msg,
        currentPrayer: currentPrayer,
        fakeTime: fakeTime,
        addMin: addMin,
        delay: stage.delay,
        blink: stage.blink,
        min: stage.min,
        nonPrayer: nonPrayer,
        nextPrayer: nextPrayer,
        previousPrayer: previousPrayer,
        expectedHijriDate: expectedHijriDate,
        nextHijri: nextHijri
      };

      describe('Validate times ' + stage.msg + ' ' + currentPrayer + ' prayer', function () {
        before(function (done) {
          // console.log('before: stage: ' + JSON.stringify(stage));
          setTimeout(function () {
            config.expectedDate = calculateExpectedDate(fakeTime, addMin);
            // console.log('expected date: ' + expectedDate);
            done();
          }, stage.delay);
        });

        ValidateCurrentDate(config);
        ValidateDuration(config);

        if (stage.min > 0) {
          ValidateCurrentHijriDate(config);
          ValidateNextPrayerMsg(config);

          if (!nonPrayer.includes(currentPrayer)) {
            ValidateCurrentPrayerHighlighted(config, false);
          }

          if (!nonPrayer.includes(previousPrayer)) {
            ValidatePreviousPrayerHighlighted(config, true);
          }

          if (!nonPrayer.includes(nextPrayer)) {
            ValidateNextPrayerHighlighted(config, false);
          }
        } else {
          ValidateNextHijriDate(config);

          if (!nonPrayer.includes(nextPrayer)) {
            ValidateNextPrayerHighlighted(config);
          }

          if (!nonPrayer.includes(currentPrayer)) {
            ValidateCurrentPrayerHighlighted(config, true);
          }

          if (!nonPrayer.includes(previousPrayer)) {
            ValidatePreviousPrayerHighlighted(config, false);
          }

          if (!nonPrayer.includes(nextPrayer)) {
            ValidateNextPrayerDuration(config);
            ValidateNextPrayerHighlighted(config, false);
          }
        }
      });
    });
  });
});
