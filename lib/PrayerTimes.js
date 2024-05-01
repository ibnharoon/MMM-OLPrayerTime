const fs = require('fs');
const PrayerTimes = require('prayer-times');
var Dayjs = require('dayjs');
var isLeapYear = require('dayjs/plugin/isLeapYear');
var dayOfYear = require('dayjs/plugin/dayOfYear');
var localizedFormat = require('dayjs/plugin/localizedFormat');
var AdvancedFormat = require('dayjs/plugin/advancedFormat');
var calendarSystems = require('@calidy/dayjs-calendarsystems');
var HijriCalendarSystem = require('@calidy/dayjs-calendarsystems/calendarSystems/HijriCalendarSystem');
Dayjs.extend(localizedFormat);
Dayjs.extend(calendarSystems);
Dayjs.extend(AdvancedFormat);
Dayjs.extend(isLeapYear);
Dayjs.extend(dayOfYear);
Dayjs.extend(require('dayjs/plugin/utc'));
Dayjs.extend(require('dayjs/plugin/timezone'));
Dayjs.registerCalendarSystem('hijri', new HijriCalendarSystem());

const nextHijri = ['Maghrib', 'Isha', 'Midnight'];
const Prayers = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha', 'Midnight'];

class PrayerTime {
  constructor(date, latitude, longitude, language, timeFormat, timezone) {
    this.date = new Dayjs(date);
    console.log('constructor: date: ' + this.date.toDate() + ', lat: ' + latitude + ', long: ' + longitude + ', tz: ' + timezone);
    this.previous = null;
    this.current = null;
    this.next = null;
    this.doy = 1;
    this.latitude = latitude;
    this.longitude = longitude;
    this.language = language;
    this.timeFormat = timeFormat;
    this.timezone = timezone || Dayjs.tz.guess();
    this.prayertime = new PrayerTimes();
    this.prayertime.setMethod('ISNA');
    this.prayertime.adjust({ asr: 'Standard' });
    console.log('current date: ' + this.date.toDate());
    this.times = this.getPrayerTimes(this.date);
    this.calculateDelta();
  }

  getDaylightSavingTime() {
    // Function to find the nth Sunday of a given month
    function findNthSunday(month, nth) {
      let date = this.date.set(month, 'month').set(nth, 'day');
      let day = this.date.day();
      let offset = (7 - day + 1) % 7;
      return date.add(offset + 7 * (nth - 1), 'day');
    }

    // Get DST start: Second Sunday of March at 2:00 AM
    const startDST = findNthSunday(2, 2).set('hour', 2).set('minute', 0).set('second', 0);

    // Get DST end: First Sunday of November at 2:00 AM
    const endDST = findNthSunday(10, 1).set('hour', 2).set('minute', 0).set('second', 0);

    return {
      start: startDST,
      end: endDST
    };
  }

  isInDaylightSavingTime(date) {
    // Create a date for January 1st of the given date's year
    const januaryFirst = new Date(date.getFullYear(), 0, 1);

    // Get the timezone offset for January 1st (non-DST)
    const standardTimeOffset = januaryFirst.getTimezoneOffset();

    // Get the timezone offset for the given date
    const currentTimeOffset = date.getTimezoneOffset();

    // If the offsets are different, the given date is in DST
    return currentTimeOffset < standardTimeOffset;
  }

  calculateDelta() {
    Prayers.forEach((prayer, index) => {
      let currentPrayerTime = this.times[prayer];
      let nextPrayerIndex = (index + 1) % Prayers.length;
      let nextPrayerTime = this.times[Prayers[nextPrayerIndex]];

      // Special case for Midnight: use next day's Fajr for delta calculations 
      if (prayer === 'Midnight') {
        this.times[prayer]['delta'] = this.getPrayerTimes(this.date.add(1, 'day'))['Fajr']['time'].diff(currentPrayerTime['time'], 'minute');

        // Save yesterday's midnight for special case if the app is started between midnight and fajr
        console.log('getting prayer time for yesterday: ' + this.date.set('hour', 0).set('minute', 0).set('second', 0).set('millisecond', 0).subtract(1, 'day').toDate());
        this.times[prayer]['ymidnight'] = this.getPrayerTimes(this.date.set('hour', 0).set('minute', 0).set('second', 0).set('millisecond', 0).subtract(1, 'day'))[prayer]['time'];
        console.log('calculateDelta() yesterday\'s midnight time: ' + this.times[prayer]['ymidnight'].toDate());
        var addday = 0;
        console.log('yesterday midnight:' + this.times[prayer]['ymidnight'].toDate());
        // if yesterday's midnight prayer time is before today's midnight, add 1 day for hijri date
        if (this.times[prayer]['ymidnight'].isBefore(currentPrayerTime['time'].set('hour', 0).set('minute', 0).set('second', 0).set('millisecond', 0))) {
          console.log,('midnight prayer is less than midnight, add 1');
          addday = 1;
        }
        this.times[prayer]['yhijri'] = this.times[prayer]['ymidnight'].add(addday, 'day').toCalendarSystem('hijri').locale(this.language).format('D MMM YYYY');
      } else {
        this.times[prayer]['delta'] = nextPrayerTime['time'].diff(currentPrayerTime['time'], 'minute');
        this.times[prayer]['ymidnight'] = null;
        this.times[prayer]['yhijri'] = null;
      }
    });
    // console.log('calculateDelta() times: ' + JSON.stringify(this.times));
  }

  getPrayerTimes(date) {
    require('dayjs/locale/' + this.language);
    console.log('getPrayerTimes() date: ' + date.toDate());
    const midnight = date.set('hour', 0).set('minute', 0).set('second', 0).set('millisecond', 0);
    const fstring = (this.timeFormat == 12) ? 'hh:mm A' : 'HH:mm';
    const dstdate = date.set('hour', 0).set('minute', 0).set('second', 0).set('millisecond', 0).add(3, 'hour');  // add 3 hour from midnight to account for dst
    const dst = this.isInDaylightSavingTime(dstdate.toDate());
    console.log('getting prayer time for date: ' + dstdate.toDate() + ', dst: ' + dst);
    let dayTimes = this.prayertime.getTimes(dstdate.toDate(), [this.latitude, this.longitude], dst ? -7 : -8, dst);
    console.log('daytimes: ' + JSON.stringify(dayTimes));
    return Prayers.reduce((acc, prayer) => {
      acc[prayer] = {};
      acc[prayer]['time'] = new Dayjs(`${date.format('YYYY-MM-DD')} ${dayTimes[prayer.toLowerCase()]}`, 'YYYY-MM-DD HH:mm a');
      const noon = acc[prayer]['time'].set('hour', 12).set('minute', 0).set('second', 0).set('millisecond', 0);
      // handle cases where midnight time is after real midnight
      console.log('prayer: ' + prayer + ', before: ' + acc[prayer]['time'].toDate() + ', noon: ' + noon.toDate());
      acc[prayer]['time'] = acc[prayer]['time'].add((['Midnight'].includes(prayer) && acc[prayer]['time'].isBefore(noon)) ? 24 : 0, 'hour');
      acc[prayer]['time'].locale(this.language);
      acc[prayer]['stime'] = acc[prayer]['time'].format(fstring);
      console.log('prayer: ' + prayer + ', after: ' + acc[prayer]['time'].toDate());
      var hdate = date.add((nextHijri.includes(prayer)? 1 : 0), 'day').toCalendarSystem('hijri');
      acc[prayer]['hijri'] = hdate.format('D MMM YYYY');
      return acc;
    }, {});
  }
}

module.exports = PrayerTime;
