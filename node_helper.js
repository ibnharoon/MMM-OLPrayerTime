/* 
 *
 * Node Helper for MMM-OLPrayerTime Magic Mirror module
 *
 * By Bustamam Harun/bustamam@gmail.com
 * MIT Licensed.
 * 
 */

var NodeHelper = require("node_helper");
const Log = require(__dirname + "/../../js/logger.js");
var Dayjs = require('dayjs');
var AdvancedFormat = require('dayjs/plugin/advancedFormat');
var localizedFormat = require('dayjs/plugin/localizedFormat');
var dayOfYear = require('dayjs/plugin/dayOfYear');
var calendarSystems = require('@calidy/dayjs-calendarsystems');
var PrayerTime = require(__dirname + '/lib/PrayerTimes');

// Prayers enum
const Prayers = {
  Fajr: 0,
  Sunrise: 1,
  Dhuhr: 2,
  Asr: 3,
  Maghrib: 4,
  Isha: 5,
  Midnight: 6
};

// Extend Dayjs
Dayjs.extend(localizedFormat);
Dayjs.extend(dayOfYear);
Dayjs.extend(AdvancedFormat);
Dayjs.extend(calendarSystems);

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

module.exports = NodeHelper.create({
  // Start function implementation
  start: function () {
    this.config = false;                                        // configuration parameters
    this.cptimes = null;                                        // today's prayer time
    this.yptimes = null;                                        // yesterday's prayer time
    this.tptimes = null;                                        // tomorrow's prayer time
    this.currentPrayer = { 'cprayer': null, 'nprayer': null };  // track the current and next time
    this.delta = 0;                                             // minutes until next prayer
    this.minutes = 0;                                           // system clock minutes
    this.dateString = '';                                       // hijri date string
    this.doy = 1;                                               // day of year 1..366
    this.nextDay = ['Maghrib', 'Isha'];                         // these prayers are considered as the next day
    this.mtoday = true;                                         // Today's midnight is the same day
    this.myesterday = true;                                     // Yesterday's midnight is the same day
  },

  /*
   *
   * Name: updateDuration
   * 
   * Purpose: update the delta time in minutes till the next prayer.
   * 
   * Parameters:
   *  initial - this function was called during initialization
   * 
   * Returns: None
   * 
   */
  updateDuration: function (initial) {
    Log.log("updateDuration(): next prayer: " + this.currentPrayer['nprayer']['time'].toDate() + ', current time: ' + new Date());
    if (this.currentPrayer['nprayer'] != null) {
      var ctime = new Dayjs(new Date());

      // get the next prayer time
      let nptime = new Dayjs(this.currentPrayer['nprayer']['time']);
      Log.log("Next prayer time: " + this.currentPrayer['nprayer']['time'].toDate());

      // Add 1 minute if it's initial settings
      var addinit = 0;
      if ( initial ) {
        addinit += 1;
      }

      if (ctime.isBefore(nptime)) {
        Log.log('nptime: ' + nptime.toDate() + ', ctime: ' + ctime.toDate());
        // this.delta = Math.max(Math.floor((nptime.subtract(ctime))/60000) + addinit, 0);
        this.delta = nptime.diff(ctime, 'minute') + addinit;
        Log.log("delta: " + this.delta);
      } else {
        Log.log('current time is more than next prayer time');
      }
    }
  },

  /*
   *
   * Name: socketNotificationReceived
   * 
   * Purpose: 
   *  Implements the socketNotificationReceived to process config and update duration request from frontend
   * 
   * Parameters:
   *  notification  - Notification type (CONFIG, UPDATEDURATION)
   *  payload       - payload associated with notification request
   * 
   * Returns: None
   * 
   */
  socketNotificationReceived: function (notification, payload) {
    Log.log('socket notification received: ' + ', notification: ' + notification + ', payload: ' + JSON.stringify(payload));
    Log.log('current prayer: ' + JSON.stringify(this.currentPrayer));

    switch (notification) {
      case 'CONFIG':
        this.config = payload;
        this.updatePrayerTimes(true);
        break;

      case 'UPDATEDURATION':
        this.minutes = payload['minutes']
        if (this.cptimes != null && this.currentPrayer['nprayer'] != null) {
          // update prayer times on midnight, otherwise just update the current prayer
          if (this.currentPrayer['cprayer'] != null && 
          this.currentPrayer['cprayer'].Name === 'Isha') {
            this.updatePrayerTimes(false);
          } else {
            this.updateCurrentPrayer(false, false);
          }
        }
        break;
    }
  },

  /*
   *
   * Name: getNextPrayer
   * 
   * Purpose: Get the next prayer
   * 
   * Parameters:
   *  cpr     - current prayer times
   *  pn      - current prayer index
   *  npr     - next prayer index
   *  initial - called during initialization
   * 
   * Returns: None
   * 
   */
  getNextPrayer: function (cpr, pn, npr, initial) {
    Log.log("getNextPrayer(): current prayer: " + cpr[pn].Name + ", next prayer: " + cpr[npr].Name);
    // date object for midnight hour on the next day
    const mtime = cpr[pn].Value.set('hour', 0).set('minute', 0).set('second', 0).set('millisecond', 0);
    this.currentPrayer['cprayer'] = cpr[pn];
    this.currentPrayer['nprayer'] = 
      {
        'time': cpr[npr].Value, 
        'name': cpr[npr].Name, 
        'index': npr
      };
  
    this.updateDuration(initial);

    Log.log("current prayer: " + JSON.stringify(this.currentPrayer['cprayer']) + ", next prayer: " + cpr[npr].Name + " : " + cpr[npr].Value.toDate());
    Log.log('mtime: ' + mtime.toDate());
    if ((cpr[pn].Name === 'Midnight') && (this.cptimes[cpr[pn].Name]['time'].isAfter(mtime))) {
      Log.log('prayer is for next day, use yesterday\'s hijri');
      cpr[pn].hijri = this.cptimes['Midnight'].yhijri;
    }

    this.sendSocketNotification('UPDATECURRENTPRAYER', 
      {
        'cprayer': this.currentPrayer['cprayer'].Name, 
        'nprayer': this.currentPrayer['nprayer']['name'], 
        'duration': this.delta, 
        'dateString': cpr[pn].hijri
      });
  },

  /*
   *
   * Name: findNextPrayer
   * 
   * Purpose: Find the next prayer after the current prayer ends.
   * 
   * Parameters:
   *  nowv    - The current date and time
   *  pt      - prayer time object
   *  reverse - search in reverse order
   *  initial - called during initialization
   * 
   * Returns: The current and the next prayer index
   * 
   */
  findNextPrayer: function(nowv, pt, reverse, initial) {
    Log.log('findNextPrayer(): now: ' + nowv.toDate() + ', pt: ' + JSON.stringify(pt) + ', reverse: ' + reverse);
    var thisPrayer = Prayers.Fajr;
    var nextPrayer = Prayers.Sunrise;
    var startPrayer = Prayers.Fajr;
    var endPrayers = Prayers.Midnight;
    var di = 1;

    if (reverse) {
      thisPrayer = Prayers.Midnight;
      nextPrayer = Prayers.Fajr;
      startPrayer = Prayers.Midnight;
      endPrayers = Prayers.Fajr;
      di = -1;
    }

    for (var i = startPrayer; i >= endPrayers; i += di) {
      Log.log("Name: " + pt[i].Name + ", time: " + pt[i].Value.toDate() + ', i: ' + i);

      // get the current prayer name
      let cpr = pt[i].Name;

      // create Dayjs for time of next prayer
      const topv = pt[i].Value;

      // if time of prayer is less than now, it becomes the current prayer
      Log.log("update current prayer topv: " + topv.valueOf() + ", nowv: " + nowv.toDate() + ", cpr: " + cpr);
      if (nowv.isAfter(topv)) {
        Log.log('topv: ' + topv.toDate() + ', nowv: ' + nowv.toDate());
        nextPrayer = ((i - di) >= 0) ? ((i - di) % (Prayers.Midnight + 1)) : Prayers.Fajr;
        Log.log('i: ' + i + ', ni: ' + nextPrayer);
        Log.log("found next prayer at: " + pt[nextPrayer].Value.toDate() + ", current prayer: " + cpr);
        Log.log("updating prayer after " + cpr + ', next: ' + pt[nextPrayer].Name);
        thisPrayer = i;
        break;
      }
    }
    return [thisPrayer, nextPrayer];
  },

  /*
   *
   * Name: updateCurrentPrayer
   * 
   * Purpose: Update the current prayer on frontend
   * 
   * Parameters:
   *  initial - called during initialization
   *  
   * Returns: None
   * 
   */
  updateCurrentPrayer: function (initial) {
    Log.log('updating current prayer: init:' + initial);
    // get time now
    const nowv = new Dayjs();
    Log.log('current time: ' + nowv.toDate());

    // handle special case when current time between midnight and fajr, force next prayer to fajr
    let ffajr = this.cptimes['Fajr']['time'];
    Log.log('fajr: ' + ffajr.toDate() + ', now: ' + nowv.toDate());
    if (nowv.isBefore(ffajr)) {
      // check if we need yesterday's prayer times
      let ymdval = this.cptimes['Midnight']['ymidnight'];
      Log.log("Update current prayer: fajr: " + ffajr.toDate() + ", now: " + nowv.toDate() + ", ymdval: " + ymdval.toDate());
      // If MM was restarted between before midnight and fajr
      if (initial && ymdval.isAfter(nowv)) {
        Log.log("App started between midnight and fajr, get yesterday's prayer times");
        this.getTodayPrayerTimes(nowv.subtract(1, 'day').toDate());
      }
    }

    var thisPrayer = Prayers.Midnight;
    var nextPrayer = Prayers.Fajr;
    // const cpr = Object.keys(this.cptimes).map(key => [{'Name': key, 'Value': this.cptimes[key]['time']}]).sort((a, b) => a['Value'].isBefore(b['Value']));
    const cpr = Object.keys(this.cptimes).map(key => ({'Name': key, 'Value': this.cptimes[key]['time'], 'hijri': this.cptimes[key]['hijri']}));
    if (initial) {
      [thisPrayer, nextPrayer] = this.findNextPrayer(nowv, cpr, true, initial);
    } else {
      // use modulus to move to next prayer
      thisPrayer = this.currentPrayer['nprayer']['index'];
      nextPrayer = (this.currentPrayer['nprayer']['index'] + 1) % (Prayers.Midnight + 1);
    }

    this.getNextPrayer(cpr, thisPrayer, nextPrayer, initial);
  },

  /*
   *
   * Name: getTodayPrayerTimes
   * 
   * Purpose: Get today's prayer times
   * 
   * Parameters:
   *  rdate - current date
   * 
   * Returns: None
   * 
   */
  getTodayPrayerTimes: function(rdate) {
    this.cptimes = new PrayerTime(rdate, this.config.latitude, this.config.longitude, this.config.language, this.config.timeFormat).times;
    console.log('ptimes: ' + JSON.stringify(this.cptimes));
  },

  /*
   *
   * Name: updatePrayerTimes
   * 
   * Purpose: Update the prayer times for today and send it to frontend
   * 
   * Parameters:
   *  initial - called during initialization
   * 
   * Returns: None
   * 
   */
  updatePrayerTimes: function (initial) {
    Log.log("updatePrayerTimes() initial: " + initial);

    let rdate = new Date();

    Log.log("updating prayer times rdate: " + rdate);

    this.getTodayPrayerTimes(rdate, initial);
    Log.log('ptimes: ' + JSON.stringify(this.cptimes));

    // update the current prayer
    this.updateCurrentPrayer(initial, true);

    var ptimesret = {
      'dateString': this.currentPrayer['cprayer'].hijri,
      'date': rdate,
      'timings': Object.keys(this.cptimes).reduce((acc, key) => (acc[key] = this.cptimes[key].stime, acc), {}),
      'cprayer': this.currentPrayer['cprayer'].Name,
      'nprayer': this.currentPrayer['nprayer']['name'],
      'duration': this.delta
    };

    Log.log("update prayer times on UI: " + JSON.stringify(ptimesret));
    // update the prayer times on UI
    this.sendSocketNotification('UPDATEPRAYERTIMES', ptimesret);
  }
});
