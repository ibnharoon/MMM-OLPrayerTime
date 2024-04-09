// Import necessary modules from selenium-webdriver for browser manipulation
const { Builder, By, until } = require('selenium-webdriver');

// Import exec and util for executing shell commands and util.promisify
const { exec } = require('child_process');
const util = require('util');

// Convert exec to a promise-based function for async/await usage
const execAsync = util.promisify(exec);

// Non-prayer time that needs to be filter out
const nonPrayer = ['Sunrise', 'Midnight'];

let expect;

/*
 * Name: test01
 *
 * Purpose:
 * This test suite is designed to validate the functionality of a prayer time application
 * running in a Dockerized environment. The application displays current, previous, and next
 * prayer times along with the Hijri date. The goals are to ensure that:
 *   - The application correctly calculates and displays the prayer times and Hijri date.
 *   - The prayer time transitions happen accurately according to the specified times.
 *   - The application's front-end elements reflect the expected state changes at given times.
 * Each test simulates the system time to check the application's behavior at specific prayer
 * intervals, ensuring the application's reliability and accuracy throughout the day.
 * 
 * Steps:
 * - before: Sets up the testing environment by dynamically importing the Chai library for assertions,
 *   building Docker images with a specified 'fakeTime' to simulate the system time at different prayer times,
 *   and initializing the Selenium WebDriver for browser automation. This setup prepares the application
 *   in a controlled state for testing.
 * - after: Tears down the testing environment by quitting the Selenium WebDriver, shutting down the Docker
 *   environment, and removing the Docker images. This cleanup ensures that each test run starts with a fresh
 *   environment and prevents resource leaks.
 */

/* Example of prayer timings for DOY: 92
    {
      "date": "2024-04-01T07:00:00.000Z",
      "hijri": "22 Ram 1445",
      "day": 92,
      "times": {
        "fajr": "5:39 am",
        "sunrise": "6:52 am",
        "dhuhr": "1:11 pm",
        "asr": "4:46 pm",
        "maghrib": "7:31 pm",
        "isha": "8:44 pm",
        "midnight": "1:12 am"
      }
    },
*/

// Define the test scenarios and expected values for each prayer time
const tests = {
  'Fajr': {
    'fakeTime': '@2024-04-01 05:37:00', // Time to set the system under test (2m before current prayer)
    'previousPrayer': 'Midnight',       // Expected previous prayer
    'hijri': '22 Ram 1445',             // expected Hijri date
    'nextPrayer': 'Sunrise'             // Expected next prayer
  },
  'Sunrise': {
    'fakeTime': '@2024-04-01 06:50:00',
    'previousPrayer': 'Fajr',
    'hijri': '22 Ram 1445',
    'nextPrayer': 'Dhuhr'
  },
  'Dhuhr': {
    'fakeTime': '@2024-04-01 13:09:00',
    'previousPrayer': 'Sunrise',
    'hijri': '22 Ram 1445',
    'nextPrayer': 'Asr'
  },
  'Asr': {
    'fakeTime': '@2024-04-01 16:44:00',
    'previousPrayer': 'Dhuhr',
    'hijri': '22 Ram 1445',
    'nextPrayer': 'Maghrib'
  },
  'Maghrib': {
    'fakeTime': '@2024-04-01 19:29:00',
    'previousPrayer': 'Asr',
    'hijri': '22 Ram 1445',
    'nextPrayer': 'Isha'
  },
  'Isha': {
    'fakeTime': '@2024-04-01 20:42:00',
    'previousPrayer': 'Maghrib',
    'hijri': '23 Ram 1445',
    'nextPrayer': 'Midnight'
  },
  'Midnight': {
    'fakeTime': '@2024-04-02 01:10:00',
    'previousPrayer': 'Isha',
    'hijri': '23 Ram 1445',
    'nextPrayer': 'Fajr'
  }
};

// Iterate over each test scenario to define Mocha tests
Object.entries(tests).forEach((test) => {
  const [currentPrayer, estr] = test;
  const fakeTime = estr['fakeTime'];
  const previousPrayer = estr['previousPrayer'];
  const expectedDate = estr['hijri'];

  describe('Muslim Prayer Times Docker-Selenium Test', function () {
    this.timeout(3600000);

    let driver; // Declare Selenium WebDriver

    before(async () => {
      // Setup actions before each test suite
      const chai = await import('chai');  // Dynamically import Chai for assertions
      expect = chai.expect;               // Assign expect for assertions
      console.log(`Building Docker images with time 2m before ${currentPrayer}`);

      // Build and start Docker containers configured to 2m before the current prayer starts
      await execAsync(`docker build --build-arg "FAKETIME=${fakeTime}" -t mm-magicmirror . --file Dockerfile-mm`);
      await execAsync(`docker build --build-arg "FAKETIME=${fakeTime}" -t mm-selenium . --file Dockerfile-selenium`);
      await execAsync('docker compose up -d');  // Start the Docker environment

      await new Promise(resolve => setTimeout(resolve, 10000)); // Wait for the containers to be fully up and running

      // Initialize Selenium WebDriver for chrome browser automation
      driver = await new Builder()
        .forBrowser('chrome')
        .usingServer('http://172.20.5.2:4444/wd/hub')
        .build();
    });

    after(async () => {
      // Cleanup actions after each test suite
      await driver.quit();  // Quit the Selenium WebDriver
      await execAsync('docker compose down'); // Stop the Docker environment

      console.log(`Cleaning up Docker images`);
      await execAsync(`docker rmi mm-magicmirror`); // Remove Docker images
      await execAsync(`docker rmi mm-selenium`);
    });

    describe('Validate times 2m before ' + currentPrayer + ' prayer', function () {
      it('The duration value should exist', async () => {
        await driver.get('http://172.20.5.1:8080');

        // Wait for the element to be present in the DOM and assert its presence
        spanElement = await driver.wait(until.elementLocated(By.id('ptimeDOM-premain')), 10000);
        expect(spanElement, 'Span element with id "ptimeDOM-premain" should be present').to.exist;
      });

      it('The duration field should be blinking', async () => {
        const spanElement = await driver.findElement(By.id('ptimeDOM-premain'));
        const actualClasses = await spanElement.getAttribute('class');
        const expectedClasses = 'tickercontent blink';

        expect(actualClasses, `Expected class '${expectedClasses}' but found '${actualClasses}'`).to.include(expectedClasses);
      });

      it('The hijri date should be correct', async () => {
        const tdElement = await driver.findElement(By.id('ptimeDOM-table-td-date'));
        const actualDate = await tdElement.getText();
        expect(actualDate, `Expected date '${expectedDate}' but found '${actualDate}'`).to.include(expectedDate);
      });

      it('The next prayer message should be "' + currentPrayer + ' in 2m"', async () => {
        const spanElement = await driver.findElement(By.id('ptimeDOM-premain'));
        var actualDur = await spanElement.getText();
        expectedDur = currentPrayer + ' 2m';
        expect(actualDur, `Expected duration '${expectedDur}' but found '${actualDur}'`).to.include(expectedDur);
      });

      it('The ' + currentPrayer + ' prayer time should change to 1m', async () => {
        const spanElement = await driver.findElement(By.id('ptimeDOM-premain'));
        const expectedDur = currentPrayer + ' 1m';
        await driver.wait(async () => {
          const currentText = await spanElement.getText();
          return currentText === expectedDur;
        }, 60000); // wait for 1m
      });

      // Skip current prayer switching test if the current prayer is a non-prayer
      if (! nonPrayer.includes(currentPrayer)) {
        it('The ' + previousPrayer + ' prayer time should change to ' + currentPrayer, async () => {
          const tdElement = await driver.findElement(By.id('ptimeDOM-table-td-ptime-' + currentPrayer.toLowerCase()));
          const expectedPrayerClass = "prayer-time bright light highlight";
          await driver.wait(async () => {
            const currentClass = await tdElement.getAttribute('class');
            return currentClass === expectedPrayerClass;
          }, 70000); // wait for 70s
        });
      } else {
        it('Skip switching to current prayer test for non-prayer: ' + currentPrayer, function () {this.skip();});
      }
    });
  });
});