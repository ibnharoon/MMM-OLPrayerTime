const { Builder } = require('selenium-webdriver');
var Dayjs = require('dayjs');
const prayertimes = require('../../prayers.json');
var AdvancedFormat = require('dayjs/plugin/advancedFormat');
var localizedFormat = require('dayjs/plugin/localizedFormat');
var dayOfYear = require('dayjs/plugin/dayOfYear');
var calendarSystems = require('@calidy/dayjs-calendarsystems');
var HijriCalendarSystem = require('@calidy/dayjs-calendarsystems/calendarSystems/HijriCalendarSystem');

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
  'fajr': 0,
  'sunrise': 1,
  'dhuhr': 2,
  'asr': 3,
  'maghrib': 4,
  'isha': 5,
  'midnight': 6
};

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

function convertTimeStringToDate(timestring, cdatestring, pname) {
  // console.log('t: ' + timestring + ', c: ' + cdatestring + ', p: ' + pname);
  // midnight time
  var cdate = new Dayjs(cdatestring, 'YYYY-MM-DD hh:mm A');
  // console.log('cdate: ' + cdate);
  const midnight = cdate.toDate().setHours(0, 0, 0, 0);
  // console.log('midnight: ' + midnight);
  // midnight (12:00am) string
  const mdstr = new Dayjs(midnight).format('YYYY-MM-DD');
  // console.log('mdstr: ' + mdstr);

  // noon value
  const noontime = new Dayjs(midnight).add(12, "hours").valueOf();
  // console.log('noon: ' + noontime);

  var cpt = new Dayjs(mdstr + ' ' + timestring, "YYYY-MM-DD hh:mm A");
  // console.log('cpt: ' + cpt);

  // if midnight time is after 12:00am, consider it the next day
  if (pname === 'midnight' && cpt.valueOf() < noontime) {
    cpt = cpt.add(1, "day");
  }
  //console.log('cpt: ' + cpt);
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
  var mtime = rdate.set('hour', 0).set('minute', 0).set('second', 0).set('millisecond', 0).add(1, 'day');
  const rdstr = rdate.format('YYYY-MM-DD');
  var doy = rdate.dayOfYear();
  result = {};
  for (var day = 0; day < prayertimes['schedule'].length; day++) {
    if (prayertimes['schedule'][day]['day'] == doy) {
      // console.log('Found doy: ' + JSON.stringify(prayertimes['schedule'][day]['day']));
      // result['times']
      Object.entries(prayertimes['schedule'][day]['times']).forEach(([prayerName, prayerTime]) => {
        var dobj = convertTimeStringToDate(prayerTime, rdstr + ' 00:00 am', prayerName);
        dobj = dobj.subtract(2, 'minute');
        // console.log('time: ' + JSON.stringify(time) + ', dstr: ' + dobj.toDate());
        fakeTime = '@' + dobj.format('YYYY-MM-DD HH:mm:ss');
        const cprayer = prayerName.charAt(0).toUpperCase() + prayerName.slice(1);
        const nextHijri = getFormattedHijriDate(
          (['maghrib', 'isha'].includes(prayerName) || 
            (['midnight'].includes(prayerName))) ? 
              rdate.add(1, 'day') : rdate, 'en');
        const hijri = getFormattedHijriDate(
          (['isha'].includes(prayerName) ||
            (['midnight'].includes(prayerName))) ?
              rdate.add(1, 'day') : rdate, 'en');
        result[cprayer] = {
          'fakeTime': fakeTime,
          'nextPrayer': Prayers[(PrayerIndex[prayerName] + 1) % Prayers.length],
          'previousPrayer': (PrayerIndex[prayerName] - 1) < 0 ? 'Midnight' : Prayers[PrayerIndex[prayerName] - 1],
          'hijri': hijri,
          'nextHijri': nextHijri,
        };
      });
      break;
    }
  }
  return result;
}

module.exports = {
  initializeSeleniumDriver,
  convertTimeStringToDate,
  durationToString,
  generateTest
};
