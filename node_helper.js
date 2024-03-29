/* 
 * Node Helper for MMM-OLPrayerTime Magic Mirror module
 *
 * By Bustamam Harun/bustamam@gmail.com
 * MIT Licensed.
 */

var NodeHelper = require("node_helper");
const Log = require(__dirname + "/../../js/logger.js");
var PrayerTimes = require('prayer-times');
var Moment = require('moment');

module.exports = NodeHelper.create({
    // Subclass start method.
    start: function() {
        this.prayertimes = new PrayerTimes();
        this.config = false;
        this.ptimes = false;
        this.ytimes = false;
        this.initial = true;
        this.mnnext = false;
        this.inupdate = false;
        this.mdback = false;
        this.currentPrayer = {'cprayer': null, 'nprayer': null};
        this.ignore = ['sunset', 'imsak'];
        this.updatePrayerTimer = null;
        this.updateCurrentPrayerTimer = {};
    },

    // disable all timers
    disableTimers: function() {
        if (this.updatePrayerTimer != null) {
            clearTimeout(this.updatePrayerTimer);
        }

        for (var tk in this.updateCurrentPrayerTimer) {
            if (this.updateCurrentPrayerTimer[tk] != null) {
                clearTimeout(this.updateCurrentPrayerTimer[tk]);
                this.updateCurrentPrayerTimer[tk] = null;
            }
        }
    },

    // enable timer for daily update and current prayer
    enableTimers: function() {
        this.disableTimers();

        // get the current time
        const nowv = new Moment().valueOf();

        // enable current prayer timer update
        for (var i = 0; i < this.ptimes.length; i++) {
            // enable current prayer timer except midnight
            const tk = this.ptimes[i][0];
            const cptime = this.ptimes[i][1]
            const topv = new Moment(cptime).valueOf();
            const delta = topv - nowv;

            // update daily prayer timer at midnight
            if ( tk == "midnight" ) {
                if ( delta > 0 ) {
                    Log.log("enabling prayer update timer at: " + cptime + ", delta: " + delta);
                    this.updatePrayerTimer = setTimeout(() => { this.updatePrayerTimes() }, delta);
                }
            // update individual prayer timer at each prayer
            } else {
                if ( delta > 0 ) {
                    Log.log("enabling timer for: " + tk + ", at: " + cptime + ", in: " + delta);
                    this.updateCurrentPrayerTimer[tk] = setTimeout(() => { this.updateCurrentPrayer() }, delta);
                }
            }
        }
    },

    socketNotificationReceived: function(notification, payload) {
        switch (notification) {
            case 'CONFIG':
                this.config = payload;
                this.prayertimes.setMethod(this.config['method']);
                this.prayertimes.asrFactor(this.config['asrfactor']);
                this.updatePrayerTimes();
                break;
        }
    },

    getNextPrayer: function(pn, npr) {
        Log.log("getNextPrayer(): current prayer: " + pn + ", next prayer: " + npr);

        this.currentPrayer['cprayer'] = pn;
        
        // get the time of next prayer
        npm = new Moment(this.ptimes[npr][1]);

        this.currentPrayer['nprayer'] = {'time': npm.toDate(), 'name': this.ptimes[npr][0]};

        var cp = JSON.stringify(this.currentPrayer);
        Log.log("current prayer: " + cp + ", next prayer: " + this.ptimes[npr][0] + " : " + this.ptimes[npr][1]);
        
        // update the current prayer on UI
        this.sendSocketNotification('UPDATECURRENTPRAYER', this.currentPrayer);
        
        // clear current prayer timer
        this.updateCurrentPrayerTimer[pn] = null;
    },
    
    updateCurrentPrayer: function() {
        // get time now
        const nowv = new Moment().valueOf();

        // handle special case when current time between midnight and fajr, force next prayer to fajr
        let ffajr = new Moment(this.ptimes[0][1]);
        // should never happen unless MM get restarted between midnight and fajr
        if (nowv < ffajr.valueOf()) {
            let mdval = new Moment(this.ptimes[this.ptimes.length-1][1]);
            Log.log("Update current prayer: fajr: " + ffajr.toDate() + ", now: " + nowv + ", mdval: " + mdval.toDate());
            if ( mdval.valueOf() < ffajr.valueOf()) {
                ffajr.add(1, "days");
                Log.log("special case for midnight: midnight less than fajr: " + ffajr.toDate());
//                this.ptimes[0][1] = ffajr.toDate();
            } else if ( !this.initial && mdval.valueOf() > ffajr.valueOf()) {
                if (this.ytimes) {
                    mval = new Moment(this.ytimes[this.ptimes.length-1][1]);
                } else {
                    mdval.subtract(1, "days");
                }

                Log.log("special case for midnight: midnight more than fajr: " + ffajr.toDate());
                this.ptimes[this.ptimes.length-1][1] = mdval.toDate();
            }

            this.getNextPrayer('midnight', 0);
        } else {
            //Log.log("loop through all prayers to find current prayer");
            // start with last prayer time (midnight) descending order
            for (let i = this.ptimes.length - 1; i >= 0; i--) {
                //Log.log("Name: " + this.ptimes[i][0] + ", time: " + this.ptimes[i][1]);
                
                // get Name of prayer
                pn = this.ptimes[i][0];

                // get the next prayer modulus number of prayer times
                let npr = (i + 1) % this.ptimes.length;

                // create moment for time of prayer
                const topv = new Moment(this.ptimes[i][1]).valueOf();

                // if time of prayer is less than now, it becomes the current prayer
                //Log.log("update current prayer topv: " + topv + ", nowv: " + nowv + ", npr: " + npr);
                if (topv < nowv) {
                    if (pn == "midnight") {
                        // midnight next day
                        const midnight = new Date().setHours(0, 0, 0, 0);
                        let mdmomnext = new Moment(midnight);
                        mdmomnext.add(1, "days");

                        // handle scenario where midnight time is less than 12:00am, next day 
                        // prayers already calculated, and now is less than 12:00am : use yesterday's 
                        // midnight time
                        if (! this.mnnext && this.ytimes && nowv < mdmomnext.valueOf()) {
                            //Log.log("midnight time is less than 12:00am next day backup midnight time: " + this.ptimes[this.ptimes.length-1][1]);
                            if ( ! this.mdback ) {
                                this.mdback = this.ptimes[this.ptimes.length-1][1];
                            }

                            this.ptimes[this.ptimes.length-1][1] = this.ytimes[this.ptimes.length-1][1];
                        } else {
                            //Log.log("midnight time is more than 12:00am");
                            if ( this.mdback ) {
                                this.ptimes[this.ptimes.length-1][1] = this.mdback;
                            }

                            this.mdback = false;
                        }
                    }

                    Log.log("found next prayer at: " + this.ptimes[npr][1] + ", next prayer: " + npr);
                    Log.log("updating next prayer after " + pn + ": " + npr);

                    this.getNextPrayer(pn, npr);
                    break;
                }
            }
        }
    },

    convertTimeStringToDate: function(tstrarr, cdate) {
        parr = [];
        
        // midnight time
        const midnight = cdate.setHours(0, 0, 0, 0);
        
        // midnight (12:00am) string
        const mdstr = new Moment(midnight).format('YYYY-MM-DD');
        
        // noon value
        const noontime = new Moment(midnight).add(12, "hours").valueOf();
       
        // 12hr or 24hr format
        var tformat = (this.config.timeFormat == 12) ? "YYYY-MM-DD hh:mm A" : "YYYY-MM-DD HH:mm";

        for (var pn in tstrarr) {
            // Append prayer time to midnight string and create Moment object
            var cpt = new Moment(mdstr + " " + tstrarr[pn], tformat);
            
            // if midnight time is after 12:00am, consider it the next day
            if (pn == 'midnight' && cpt.valueOf() < noontime) {
                cpt = cpt.add(1, "days");
                this.mnnext = true;
            }
            
            parr.push([pn, cpt.toDate()]);
        }

        // sort the prayers by time in ascending order
        parr.sort(function(a, b) { return a[1].valueOf() - b[1].valueOf(); });

        return parr;
    },

    updatePrayerTimes: function() {
        Log.log("updatePrayerTimes()");
        this.inupdate = true;

        let rdate = new Date();
        if ( this.initial ) {
            Log.log("started at: " + rdate);
        }

        // if not initial and ptimes are already defined use midnight time
        if ( ! this.ytimes && this.ptimes ) {
            const clone = (items) => items.map(item => Array.isArray(item) ? clone(item) : item);
            rdate = this.ptimes[this.ptimes.length-1][1];
            this.ytimes = clone(this.ptimes);
            //Log.log("saving yesterday's time: " + JSON.stringify(this.ytimes));
        }

        if ( this.ptimes ) {
            // if midnight prayer time is the same day as fajr
            // get prayer times for the next day
            let mnday = Moment(rdate);
            const fjday = Moment(this.ptimes[0][1]);
            //Log.log("updatePrayerTimes(): rdate: " + rdate + ", fj date: " + this.ptimes[0][1]);
            if (mnday.dayOfYear() == fjday.dayOfYear()) {
                mnday.add(1, "days");
                rdate = mnday.toDate();
            }
        }

        Log.log("updating prayer times rdate: " + rdate);

        // get the prayer timings
        const format = (this.config.timeFormat).toString() + "h";
        const coord = [this.config['latitude'], this.config['longitude']];
        let pt = this.prayertimes.getTimes(rdate, coord, ...[,,], format);

        // delete imsak and sunset
        for (var pe in this.ignore) {
            delete pt[this.ignore[pe]];
        }

        // convert prayer times string to Date object
        this.ptimes = this.convertTimeStringToDate(pt, rdate);

//        if ( ! this.ytimes ) {
//            const clone = (items) => items.map(item => Array.isArray(item) ? clone(item) : item);
//            this.ytimes = clone(this.ptimes);
//            Log.log("cloning today's time: " + JSON.stringify(this.ytimes));
//        }

        // convert prayer time array to associative array
        var ptobj = Object.fromEntries(this.ptimes);

        var ptimesret = {
            'date' : rdate,
            'timings' : ptobj
        };

        Log.log("update prayer times on UI: " + JSON.stringify(ptimesret));
        // update the prayer times on UI
        this.sendSocketNotification('UPDATEPRAYERTIMES', ptimesret);

        // update the current prayer
        this.updateCurrentPrayer();

        // enable current prayer update timers
        this.enableTimers();

        this.initial = false;
        this.inupdate = false;
    }

});

