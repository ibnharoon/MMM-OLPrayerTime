// Import necessary modules from selenium-webdriver for browser manipulation
const { Builder, By, until } = require('selenium-webdriver');

// Import exec and util for executing shell commands and util.promisify
const { exec } = require('child_process');
const util = require('util');
const Dayjs = require('dayjs');
Dayjs.extend(require('dayjs/plugin/utc'));
Dayjs.extend(require('dayjs/plugin/timezone'));
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
  ValidateDurationBlink
} = require('../lib/ValidateDurationBlink');
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
const {
  ShowValues
} = require('../lib/ShowValues');

// Convert exec to a promise-based function for async/await usage
const execAsync = util.promisify(exec);

// Non-prayer time that needs to be filter out
const nonPrayer = ['Sunrise', 'Midnight'];

global.expect = null;

/*
 * Name: EdgeCases
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

const dates = [
  {
    'day': 'begin of daylight saving',
    'period': 'before',
    'date': '2024-03-09'
  },
  /*
  {
    'day': 'begin of daylight saving',
    'period': 'after',
    'date': '2024-03-10'
  },
  {
    'day': 'end of daylight saving',
    'period': 'before',
    'date': '2024-11-02'
  },
  {
    'day': 'end of daylight saving',
    'period': 'after',
    'date': '2024-11-03'
  },
  {
    'day': 'end of leap year',
    'period': 'before',
    'date': '2024-12-31'
  },
  {
    'day': 'end of leap year',
    'period': 'after',
    'date': '2025-01-01'
  },
  {
    'day': 'end of leap day',
    'period': 'before',
    'date': '2024-02-29'
  },
  {
    'day': 'end of leap day',
    'period': 'after',
    'date': '2024-03-01'
  },
  {
    'day': 'end of non-leap year',
    'period': 'before',
    'date': '2025-12-31'
  },
  {
    'day': 'end of non-leap year',
    'period': 'after',
    'date': '2026-01-01'
  },
  {
    'day': 'end of non-leap day',
    'period': 'before',
    'date': '2025-02-28'
  },
  {
    'day': 'end of non-leap day',
    'period': 'after',
    'date': '2025-03-01'
  }
  */
];

// 1 day before/after daylight saving starts
for (const date of dates) {
  // console.log('date: ' + date['date']);
  const rdate = new Dayjs.tz(date['date'] + ' 00:00:00', 'America/Los_Angeles');
  // console.log('rdate: ' + rdate.toDate());
  const testscenarios = generateTest(rdate);
  // continue;

  Object.entries(testscenarios).forEach(([currentPrayer, testscenario]) => {
    // console.log(JSON.stringify(testscenario) + ', currentPrayer: ' + JSON.stringify(currentPrayer));
    const fakeTime = testscenario['fakeTime'];
    const previousPrayer = testscenario['previousPrayer'];
    const expectedHijriDate = testscenario['hijri'];
    const nextHijri = testscenario['nextHijri'];
    const nextPrayer = testscenario['nextPrayer'];
    const midnightNextDay = testscenario['midnightNextDay'];

    describe('Test scenario for the day ' + date['period'] + ' ' + date['day'], function () {
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
        
        // var mmdate = await execAsync('docker exec mm-magicmirror date');
        // console.log('mm date:');
        // console.log(JSON.stringify(mmdate));
        // var mmvars = await execAsync('docker exec mm-magicmirror env');
        // console.log('mm env:');
        // console.log(JSON.stringify(mmvars));
        
        // var seldate = await execAsync('docker exec mm-selenium date');
        // console.log('selenium date:');
        // console.log(JSON.stringify(seldate));  
        // var selvars = await execAsync('docker exec mm-selenium env');
        // console.log('selenium env:');
        // console.log(JSON.stringify(selvars));

        // var selos = await execAsync('docker exec mm-selenium lsb_release -a');
        // console.log('os version: ' + JSON.stringify(selos));
        // var selosrel = await execAsync('docker exec mm-selenium uname -a');
        // console.log('os release: ' + JSON.stringify(selosrel));

        // var javaver = await execAsync('docker exec mm-selenium java -version');
        // console.log('java version: ' + JSON.stringify(javaver));
      
        var mmip = await execAsync('docker exec mm-magicmirror hostname -i');
        mmip = mmip.stdout.replace(/(\r\n|\n|\r)/gm,"");
        console.log('mm ip: "' + mmip + '"');
        
        var selip = await execAsync('docker exec mm-selenium hostname -i');
        selip = selip.stdout.replace(/(\r\n|\n|\r)/gm,"")
        console.log('selenium ip:"' + selip + '"');
        
        const seleniumServerUrl = 'http://' + selip + ':4444/wd/hub';
        driver = await initializeSeleniumDriver(seleniumServerUrl);  // Wait for the selenium server to be fully up and running
        // Assert that driver is initialized successfully
        expect(driver, 'Selenium server did not start within the expected time.').to.not.be.null;

        await driver.get('http://' + mmip + ':8080');

        // Wait for the element to be present in the DOM and assert its presence
        var durationElement = await driver.wait(until.elementLocated(By.id('ptimeDOM-premain')), 10000);
        expect(durationElement, 'Span element with id "ptimeDOM-premain" should be present').to.exist;
      });

      after(async () => {
        // save logs from MM and selenium
        var logs = await execAsync('docker logs mm-magicmirror');
        console.log('Magic Mirror log:');
        console.log(JSON.stringify(logs));

        logs = await execAsync('docker logs mm-selenium');
        console.log('Selenium log:');
        console.log(JSON.stringify(logs));
        
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
          nextHijri: nextHijri,
          midnightNextDay: midnightNextDay
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

          // Show values for debugging
          ShowValues(config);
          
          ValidateCurrentDate(config);
          ValidateDurationBlink(config);
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
}
