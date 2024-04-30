const { Builder } = require('selenium-webdriver');
var Dayjs = require('dayjs');
var AdvancedFormat = require('dayjs/plugin/advancedFormat');
var localizedFormat = require('dayjs/plugin/localizedFormat');
var dayOfYear = require('dayjs/plugin/dayOfYear');
var calendarSystems = require('@calidy/dayjs-calendarsystems');
var HijriCalendarSystem = require('@calidy/dayjs-calendarsystems/calendarSystems/HijriCalendarSystem');
var PrayerTime = require('../../lib/PrayerTimes');

// Extend Dayjs
Dayjs.extend(localizedFormat);
Dayjs.extend(dayOfYear);
Dayjs.extend(AdvancedFormat);
Dayjs.extend(calendarSystems);
Dayjs.registerCalendarSystem('islamic', new HijriCalendarSystem());

const Prayers = [
  'Fajr',
  'Sunrise',
  'Dhuhr',
  'Asr',
  'Maghrib',
  'Isha',
  'Midnight'
];

const PrayerIndex = {
  'Fajr': 0,
  'Sunrise': 1,
  'Dhuhr': 2,
  'Asr': 3,
  'Maghrib': 4,
  'Isha': 5,
  'Midnight': 6
};

function isInDaylightSavingTime(date) {
  // Create a date for January 1st of the given date's year
  const januaryFirst = new Date(date.getFullYear(), 0, 1);

  // Get the timezone offset for January 1st (non-DST)
  const standardTimeOffset = januaryFirst.getTimezoneOffset();

  // Get the timezone offset for the given date
  const currentTimeOffset = date.getTimezoneOffset();

  // If the offsets are different, the given date is in DST
  return currentTimeOffset < standardTimeOffset;
}

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
async function initializeSeleniumDriver(url, retryCount = 2, interval = 5000) {
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

function convertTimeStringToDate(timestring, cdatestring, pname) {
  console.log('t: ' + timestring + ', c: ' + cdatestring + ', p: ' + pname);
  // midnight time
  var cdate = new Dayjs(cdatestring, 'YYYY-MM-DD hh:mm A');
  console.log('cdate: ' + cdate.toDate());
  const midnight = new Date(cdate.toDate().setHours(0, 0, 0, 0));
  console.log('midnight: ' + midnight);
  // midnight (12:00am) string
  const mdstr = new Dayjs(midnight).format('YYYY-MM-DD');
  console.log('mdstr: ' + mdstr);

  // noon value
  const noontime = new Dayjs(midnight).add(12, "hours");
  console.log('noon: ' + noontime.toDate());
  // midnight
  const midnighttime = new Dayjs(midnight).add( isInDaylightSavingTime(midnight) ? 0 : 1, 'day');
  console.log('convert time string to date, midnight: ' + midnighttime.toDate() + ', DST: ' + isInDaylightSavingTime(midnight));

  var cpt = new Dayjs(mdstr + ' ' + timestring, "YYYY-MM-DD hh:mm A");
  console.log('cpt 1: ' + cpt.toDate() + ', DST: ' + isInDaylightSavingTime(cpt.toDate()));

  // if midnight time is after 12:00am, consider it the next day
  if (pname === 'midnight' && cpt.valueOf() > midnight.valueOf()) {
    console.log('cpt greater than midnight... adding 1 day');
    // cpt = cpt.add(1, "day");
    cpt = cpt.subtract(isInDaylightSavingTime(cpt.toDate()) ? 1 : 0, 'hour');
  }

  console.log('cpt 2: ' + cpt.toDate());
  
  // if ((pname === 'midnight' && cpt.valueOf() < midnighttime.valueOf()) && isInDaylightSavingTime(cpt.toDate())) {
  //   console.log('DST, subtract 1 hour');
  //   cpt = cpt.subtract(1, 'hour');
  // }
  
  console.log('cpt final: ' + cpt.toDate());
  return cpt;
}

/*
 * 
 * Name: getFormattedHijriDate
 * 
 * Purpose: Get the localized hijri date string
 * 
 * Parameters:
 *   cdate  - Date object for the requested date
 *   locale - requested locale
 * 
 * Returns: localized hijri date string
 * 
 */
function getFormattedHijriDate(cdate, locale) {
  require('dayjs/locale/' + locale);

  var hdate = cdate.toCalendarSystem('islamic');

  return hdate.locale(locale).format('D MMM YYYY');
}

function durationToString(bdate, edate) {
  //console.log('bdate: ' + bdate + ', edate: ' + edate);
  let mins = Math.max(Math.floor((edate.valueOf() - bdate.valueOf()) / 60000), 0);
  let h = Math.floor(mins / 60);
  let m = mins % 60;

  if (h > 0) {
    if (m != 0) {
      return `${h}h ${m}m`;
    } else {
      return `${h}h`;
    }
  } else {
    if (m != 0) {
      return `${m}m`;
    }
  }
  return '';
}

function generateTest(rdate) {
  var result = {};
  const mtime = rdate.set('hour', 0).set('minute', 0).set('second', 0).set('millisecond', 0).add(1, 'day');
  const pt = new PrayerTime(rdate.toDate(), 37.3391931, -121.9389783, "en", 12, 'America/Los_Angeles').times;
  const prayertime = Object.keys(pt).reduce((acc, key) => (acc[key] = pt[key].stime, acc), {});
  console.log('prayer time: ' + JSON.stringify(pt));
  console.log('midnight next: ' + mtime.toDate());
  const mnnext = pt['Midnight'].time.isAfter(mtime);
  Object.entries(prayertime).forEach(([prayerName, prayerTime]) => {
  if (['Fajr'].includes(prayerName)) {
    // console.log('dobj: ' + prayerTime);
    var fakeTime = '@' + pt[prayerName].time.tz('America/Los_Angeles').subtract(2, 'minute').format('YYYY-MM-DD HH:mm:ss');
    // console.log('faketime: ' + fakeTime);
    result[prayerName] = {
      'fakeTime': fakeTime,
      'nextPrayer': Prayers[(PrayerIndex[prayerName] + 1) % Prayers.length],
      'previousPrayer': (PrayerIndex[prayerName] - 1) < 0 ? 'Midnight' : Prayers[PrayerIndex[prayerName] - 1],
      'hijri': pt[(PrayerIndex[prayerName] - 1) < 0 ? 'Midnight' : Prayers[PrayerIndex[prayerName] - 1]].hijri,
      'nextHijri': pt[prayerName].hijri,
      'midnightNextDay': mnnext
    };
  }
  });
  
  console.log('result: ' + JSON.stringify(result));
  return result;
}

module.exports = {
  initializeSeleniumDriver,
  convertTimeStringToDate,
  durationToString,
  generateTest
};
