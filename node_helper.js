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
const prayertimes = require(__dirname + '/prayers.json');
var calendarSystems = require('@calidy/dayjs-calendarsystems');
var HijriCalendarSystem = require('@calidy/dayjs-calendarsystems/calendarSystems/HijriCalendarSystem');

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

// Prayer array index
const PrayerIndex = {
  Name: 0,  // Name of prayer
  Value: 1  // Prayer time
};

// Extend Dayjs
Dayjs.extend(localizedFormat);
Dayjs.extend(dayOfYear);
Dayjs.extend(AdvancedFormat);
Dayjs.extend(calendarSystems);
Dayjs.registerCalendarSystem('islamic', new HijriCalendarSystem());

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
  
  var hdate = new Dayjs(cdate).toCalendarSystem('islamic');

  return hdate.locale(locale).format('D MMM YYYY');
}

module.exports = NodeHelper.create({
  // Start function implementation
  start: function () {
    this.config = false;                                        // configuration parameters
    this.ptimes = null;                                         // today's prayer time
    this.ytimes = null;                                         // yesterday's prayer time
    this.ttimes = null;                                         // tomorrow's prayer time
    this.currentPrayer = { 'cprayer': null, 'nprayer': null };  // track the current and next time
    this.delta = 0;                                             // minutes until next prayer
    this.minutes = 0;                                           // system clock minutes
    this.dateString = '';                                       // hijri date string
    this.doy = 1;                                               // day of year 1..366
    this.nextDay = ['maghrib', 'isha'];                         // these prayers are considered as the next day
    this.mtoday = true;                                         // Midnight is the same day
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
    Log.log("updateDuration(): next prayer: " + this.currentPrayer['nprayer']['time'] + ', current time: ' + new Date());
    if (this.currentPrayer['nprayer'] != null) {
      var ctime = new Dayjs(new Date()).valueOf();

      // get the next prayer time
      let nptime = new Dayjs(this.currentPrayer['nprayer']['time']).valueOf();
      Log.log("Next prayer time: " + this.currentPrayer['nprayer']['time']);

      // Add 1 minute if it's initial settings
      var addinit = 0;
      if ( initial ) {
        addinit += 1;
      }

      if (nptime >= ctime) {
        Log.log('nptime: ' + nptime + ', ctime: ' + ctime);
        this.delta = Math.max(Math.floor((nptime - ctime)/60000) + addinit, 0);
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
        if (this.ptimes != null && this.currentPrayer['nprayer'] != null) {
          // update prayer times on midnight, otherwise just update the current prayer
          if (this.currentPrayer['cprayer'] != null && 
          this.currentPrayer['cprayer'][PrayerIndex.Name] === 'isha') {
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
   *  cdate   - current date
   *  pn      - current prayer index
   *  npr     - next prayer index
   *  initial - called during initialization
   * 
   * Returns: None
   * 
   */
  getNextPrayer: function (cdate, pn, npr, initial) {
    Log.log("getNextPrayer(): current prayer: " + this.ptimes[pn][PrayerIndex.Name] + ", next prayer: " + this.ptimes[npr][PrayerIndex.Name]);
    // date object for midnight hour on the next day
    const mtime = new Dayjs(new Date(this.ptimes[pn][PrayerIndex.Value])).add(1, 'day').toDate().setHours(0, 0, 0, 0);
    this.currentPrayer['cprayer'] = this.ptimes[pn];
    this.currentPrayer['nprayer'] = 
      {
        'time': this.ptimes[npr][PrayerIndex.Value], 
        'name': this.ptimes[npr][PrayerIndex.Name], 
        'index': npr 
      };
  
    this.updateDuration(initial);

    Log.log("current prayer: " + JSON.stringify(this.currentPrayer['cprayer']) + ", next prayer: " + this.ptimes[npr][PrayerIndex.Name] + " : " + this.ptimes[npr][PrayerIndex.Value]);
    var dch = cdate;
    Log.log('cdate: ' + cdate.toDate() + ', mtime: ' + mtime);
    // if prayer is on the next day or midnight time is greater than tomorrow's midnight hour
    if ((this.nextDay.includes(this.ptimes[pn][PrayerIndex.Name]) && ( initial && (cdate.toDate() < mtime )) ) || 
    ( this.ptimes[pn][PrayerIndex.Name] === 'midnight' && this.mtoday )) {
      Log.log('prayer is on next day, adding 1 day for hijri date: ' + this.mtoday);
      dch = cdate.add(1, 'day');
    }

    this.dateString = getFormattedHijriDate(dch.toDate(), this.config.language);

    this.sendSocketNotification('UPDATECURRENTPRAYER', 
      {
        'cprayer': this.currentPrayer['cprayer'][PrayerIndex.Name], 
        'nprayer': this.currentPrayer['nprayer']['name'], 
        duration: this.delta, 
        'dateString': this.dateString
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
    Log.log('findNextPrayer(): now: ' + nowv + ', pt: ' + JSON.stringify(pt) + ', reverse: ' + reverse);
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
      Log.log("Name: " + pt[i][PrayerIndex.Name] + ", time: " + pt[i][PrayerIndex.Value] + ', i: ' + i);

      // get the current prayer name
      let cpr = pt[i][PrayerIndex.Name];

      // create Dayjs for time of next prayer
      const topv = new Dayjs(pt[i][PrayerIndex.Value]);

      // if time of prayer is less than now, it becomes the current prayer
      Log.log("update current prayer topv: " + topv.valueOf() + ", nowv: " + nowv.valueOf() + ", cpr: " + cpr);
      if (nowv.valueOf() > topv.valueOf()) {
        Log.log("found next prayer at: " + pt[i - di][PrayerIndex.Value] + ", current prayer: " + cpr);
        Log.log("updating prayer after " + cpr + ', next: ' + pt[i - di][PrayerIndex.Name]);
        nextPrayer = i - di;
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
   *  udelta  - update the current delta
   *  
   * Returns: None
   * 
   */
  updateCurrentPrayer: function (initial, udelta) {
    Log.log('updating current prayer: init:' + initial);
    // get time now
    const nowv = new Dayjs(new Date());
    Log.log('current time: ' + nowv.toDate());

    // handle special case when current time between midnight and fajr, force next prayer to fajr
    let ffajr = new Dayjs(this.ptimes[Prayers.Fajr][PrayerIndex.Value]);
    Log.log('fajr: ' + ffajr.valueOf() + ', now: ' + nowv.valueOf());
    if (nowv.valueOf() < ffajr.valueOf()) {
      // check if we need yesterday's prayer times
      let ymdval = new Dayjs(this.ytimes[Prayers.Midnight][PrayerIndex.Value]);
      Log.log("Update current prayer: fajr: " + ffajr.toDate() + ", now: " + nowv.toDate() + ", ymdval: " + ymdval.toDate());
      // If MM was restarted between before midnight and fajr
      if (initial && ymdval.valueOf() > nowv.valueOf()) {
        Log.log('setting back date to yesterday');
        this.getTodayPrayerTimes(nowv.subtract(1, 'day').toDate());
      }
    }

    var thisPrayer = Prayers.Midnight;
    var nextPrayer = Prayers.Fajr;
    if (initial) {
      [thisPrayer, nextPrayer] = this.findNextPrayer(nowv, this.ptimes, true, initial);
    } else {
      // use modulus to move to next prayer
      thisPrayer = this.currentPrayer['nprayer']['index'];
      nextPrayer = (this.currentPrayer['nprayer']['index'] + 1) % Prayers.Midnight;
    }

    this.getNextPrayer(nowv, thisPrayer, nextPrayer, initial);
  },

  /*
   *
   * Name: convertTimeStringToDate
   * 
   * Purpose: Convert the time string to date object
   * 
   * Parameters:
   *  tstrarr - the string prayer time array
   *  cdate   - the current date
   * 
   * Returns: The array of date objects representing the prayer times
   * 
   */
  convertTimeStringToDate: function (tstrarr, cdate) {
    parr = [];
        
    // midnight time
    const midnight = cdate.setHours(0, 0, 0, 0);
    
    // midnight (12:00am) string
    const mdstr = new Dayjs(midnight).format('YYYY-MM-DD');
    
    // noon value
    const noontime = new Dayjs(midnight).add(12, "hours").valueOf();
   
    // 12hr or 24hr format
    var tformat = (this.config.timeFormat == 12) ? "YYYY-MM-DD hh:mm A" : "YYYY-MM-DD HH:mm";

    for (var pn in tstrarr) {
        // Append prayer time to midnight string and create Dayjs object
        var cpt = new Dayjs(mdstr + " " + tstrarr[pn], tformat);
        
        // if midnight time is after 12:00am, consider it the next day
        if (pn == 'midnight' && cpt.valueOf() < noontime) {
            cpt = cpt.add(1, "day");
        }
        
        parr.push([pn, cpt.toDate()]);
    }

    // sort the prayers by time in ascending order
    parr.sort(function(a, b) { return a[PrayerIndex.Value].valueOf() - b[PrayerIndex.Value].valueOf(); });

    return parr;
  },

  /*
   *
   * Name: convertDateToLocalizedString
   * 
   * Purpose: Convert the array of date objects to localized string array
   * 
   * Parameters: None
   * 
   * Returns: Array of localized string representing the prayer times
   * 
   */

  convertDateToLocalizedString: function() {
    require('dayjs/locale/' + this.config.language);
    var dayjs = new Dayjs();
    var pstrarr = [];
    var fstring = (this.config.timeFormat == 12) ? 'hh:mm A' : 'HH:mm';
    for (var i= 0; i < this.ptimes.length; i++) {
      var dayjs = new Dayjs(this.ptimes[i][PrayerIndex.Value]);
      dayjs.locale(this.config.language);
      var dstr = dayjs.format(fstring);
      Log.log('convert to localized string pr: ' + this.ptimes[i][PrayerIndex.Name] + ', value: ' + dstr);

      pstrarr.push([this.ptimes[i][PrayerIndex.Name], dstr]);
    }

    return pstrarr;
  },

  /*
   *
   * Name: getTodayPrayerTimes
   * 
   * Purpose: Get yesterday's, today's, and tomorrow's prayer times
   * 
   * Parameters:
   *  rdate - current date
   * 
   * Returns: None
   * 
   */
  getTodayPrayerTimes: function(rdate) {
    var today = new Dayjs(rdate);
    const mtime = new Date(rdate.setHours(0, 0, 0, 0));
    
    var ydate = today.subtract(1, 'day').toDate();
    var tdate = today.add(1, 'day').toDate();
    var doy = today.dayOfYear();
    for (var day = 0; day < prayertimes['schedule'].length; day++) {
      if (prayertimes['schedule'][day]['day'] == doy) {
        this.doy = doy;
        Log.log('Found doy: ' + JSON.stringify(prayertimes['schedule'][day]['day']));
        // generate hijri date fron current date
        this.dateString = getFormattedHijriDate(rdate, this.config.language);

        // get prayer times for yesterday
        this.ytimes = this.convertTimeStringToDate(
          prayertimes['schedule'][(day == 0) ? 
            (prayertimes['schedule'].length - 1) : 
            (day - 1)]['times'], 
          ydate
        );

        // get prayer times for today
        this.ptimes = this.convertTimeStringToDate(prayertimes['schedule'][day]['times'], rdate);

        // check if midnight time is the next day
        Log.log('mtime: ' + mtime + ', midnight time: ' + this.ptimes[Prayers.Midnight][PrayerIndex.Value]);
        if (this.ptimes[Prayers.Midnight][PrayerIndex.Value] > mtime) {
          this.mtoday = false;
        }

        // get prayer times for tomorror
        this.ttimes = this.convertTimeStringToDate(
          prayertimes['schedule'][(day == prayertimes['schedule'].length - 1) ? 
            0 : 
            (day + 1)]['times'], 
          tdate
        );
        break;
      }
    }
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

    this.getTodayPrayerTimes(rdate);
    Log.log('ptimes: ' + JSON.stringify(this.ptimes));

    // convert prayer times to localized string
    var lsptimes = this.convertDateToLocalizedString();

    // update the current prayer
    this.updateCurrentPrayer(initial, true);

    // convert prayer time array to associative array
    var ptobj = Object.fromEntries(lsptimes);

    var ptimesret = {
      'dateString': this.dateString,
      'date': rdate,
      'timings': ptobj,
      'cprayer': this.currentPrayer['cprayer'][PrayerIndex.Name],
      'nprayer': this.currentPrayer['nprayer']['name'],
      'duration': this.delta
    };

    Log.log("update prayer times on UI: " + JSON.stringify(ptimesret));
    // update the prayer times on UI
    this.sendSocketNotification('UPDATEPRAYERTIMES', ptimesret);
  }
});
