
Module.register("MMM-OLPrayerTime", {
    // Default module config.
    defaults: {
        latitude: false,                        // Latitude. Required parameter, please define in config.js
        longitude: false,                       // Longitude. Required parameter, please define in config.js
        timeFormat: config.timeFormat || 24,    // 12 or 24
        method: "ISNA",                         // see document for prayer-times npm 
        asrfactor: "Standard",                  // see document for prayert-times npm
        notDisplayed: ['sunrise', 'midnight'],
        animationSpeed: 2.5 * 1000,             // Speed of the update animation. (milliseconds)
        language: config.language || "en",
        pthreshold: 10
    },

    getScripts: function() {
        return [this.file('node_modules/moment-hijri/moment-hijri.js')]
    },

    getStyles: function() {
        return ["MMM-OLPrayerTime.css"];
    },

    getTranslations: function() {
        return {
            en: 'translations/en.json'
        };
    },

    start: function() {
        var self = this;
        Log.info("Starting module: " + this.name);
        this.sendSocketNotification('CONFIG', this.config)

        this.prayerInfo = {};
        this.currentPrayer = {'cprayer': null, 'nprayer': null};
        this.timer = null;
        this.tickermsg = "";
        this.delta = 0;
        this.wrapper = null;

        this.loaded = false;
        this.allPrayers = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha', 'midnight'];
    },

    // Override dom generator.
    getDom: function() {
        Log.info("Updating MMM-OLPrayerTime DOM.");
        var self = this;

        if (this.wrapper == null) {
            this.wrapper = document.createElement("div");
            this.wrapper.setAttribute("id", "ptimeDOM-mainDiv");

            var table = document.createElement("table");
            table.setAttribute("id", "ptimeDOM-table");
            table.className = "small";

            var row = document.createElement("tr");
            table.appendChild(row);

            var currentDate = document.createElement("td");
            currentDate.setAttribute("id", "ptimeDOM-table-td-date");
            currentDate.className = "current-date bright light";
            currentDate.colSpan = 2;
            row.appendChild(currentDate);

            for (var cp of this.allPrayers) {
                if (this.config.notDisplayed.includes(cp)) {
                    continue;
                }

                row = document.createElement("tr");
                table.appendChild(row);

                var prayerName = document.createElement("td");
                prayerName.className = "prayer-name bright light";

                pname = this.translate(cp);
                prayerName.setAttribute("id", "ptimeDOM-table-td-pname-"+cp);
                row.appendChild(prayerName);

                var prayerTime = document.createElement("td");
                prayerTime.setAttribute("id", "ptimeDOM-table-td-ptime-"+cp);
                prayerTime.className = "prayer-time bright light";
                row.appendChild(prayerTime);
            }

            this.wrapper.appendChild(table);

            var tickerdiv = document.createElement("div");
            tickerdiv.className = "ticker";

            var tickerspan = document.createElement("span");
            tickerspan.setAttribute("id", "ptimeDOM-premain");
            tickerspan.className = "tickercontent";

            tickerdiv.appendChild(tickerspan);

            this.wrapper.appendChild(tickerdiv);
        }

        if (this.wrapper != null) {
            var nextDay = (['maghrib', 'isha'].includes(this.currentPrayer['cprayer'])) ? 1 : 0;

            cdate = this.prayerInfo['date'];
            hdate = new moment(cdate).add(nextDay, 'days').locale(this.config.language).format('iD iMMM iYYYY');
            var currentDate = document.getElementById("ptimeDOM-table-td-date");
            if (currentDate != null) {
                currentDate.innerHTML = hdate;
            }

            for (cp in this.prayerInfo['timings']) {
                if (this.config.notDisplayed.includes(cp)) {
                    continue;
                }

                // highlight the current prayer
                var highlight = (this.currentPrayer['cprayer'] != null && cp == this.currentPrayer['cprayer']) ? " highlight" : "";
                var prayerName = document.getElementById("ptimeDOM-table-td-pname-" + cp);
                pname = this.translate(cp);

                var tformat = (this.config.timeFormat == 12) ? "h:mm A" : "HH:mm";
                var cpt = new moment(this.prayerInfo['timings'][cp]).locale(this.config.language).format(tformat);
                var prayerTime = document.getElementById("ptimeDOM-table-td-ptime-" + cp);

                if (this.updateptimes || this.updatecprayer) {
                    prayerName.className = "prayer-name bright light" + highlight;
                    prayerTime.className = "prayer-time bright light" + highlight;
                    if (this.updateptimes) {
                        prayerName.innerHTML = pname;
                        prayerTime.innerHTML = cpt;
                    }
                }
            }

            var tickerspan = document.getElementById("ptimeDOM-premain");
            if (this.tickermsg != "" && tickerspan != null) {
                if (this.delta <= this.config.pthreshold) {
                    tickerspan.className = "tickercontent blink";

                    // send message to alert module
                    //this.sendNotification("SHOW_ALERT", {type: "notification", message: this.tickermsg, timer: 30000});
                } else {
                    tickerspan.className = "tickercontent";
                }
                tickerspan.innerHTML = this.tickermsg;
            }
        }
        return this.wrapper;
    },

    updateDuration: function(uptime, ucprayer, cmin) {
        this.updateptimes = uptime;
        this.updatecprayer = ucprayer;

        Log.log("updateDuration(): next prayer: " + JSON.stringify(this.currentPrayer['nprayer']));
        if (this.currentPrayer['nprayer'] != null) {
            var dnow = new Date();

            // truncate to nearest minutes
            let now = Math.floor(dnow.valueOf()/60000) * 60000;

            // sync with main clock
            if (cmin != -1) {
                //Log.log("sync minute before: " + now + ", cmin: " + cmin);
                let h = Math.floor(now/3600000);
                let m = (now/60000) % 60;

                // min goes to next hour
                if (now < cmin) {
                    h = h - 1;
                }

                now = (h * 3600000) + (cmin * 60000);
                //Log.log("sync minute after: " + now + ", h: " + h + ", m: " + m);
            }

            // get the next prayer time
            let nptime = new Date(this.currentPrayer['nprayer']['time']).valueOf();
            //Log.log("Next prayer time: " + this.currentPrayer['nprayer']['time']);

            this.delta = 0;

            // get date string
            //var dmsg = new moment(dnow).locale(this.config.language).format('dddd D MMM YYYY');
            this.tickermsg = "";

            if (nptime >= now) {
                const convertMinsToHrsMins = (mins) => {
                    let h = Math.floor(mins / 60);
                    let m = mins % 60;
                    
                    if (h > 0) {
                        if (m != 0) {
                            return `${h}` + this.translate('h') + " " + `${m}` + this.translate('m');
                        } else {
                            return `${h}` + this.translate('h');
                        }
                    } else {
                        if (m != 0) {
                            return `${m}` + this.translate('m');
                        } else {
                            return "";
                        }
                    }
                }

                this.delta = Math.floor((nptime - now)/60000);
                //Log.log("delta: " + this.delta);
                if ( this.delta > 0 ) {
                    //Log.log("delta is " + this.delta + ", update ticker");
                    dstr = convertMinsToHrsMins(this.delta);
                    if (dstr != "") {
                        npname = this.translate(this.currentPrayer['nprayer']['name']);
                        var nmsg = `${npname}` + " " + `${dstr}`;
                        this.tickermsg = nmsg;
                    } else {
                        //Log.log("dstring is empty");
                        this.tickermsg = "";
                    }
                } else {
                    //Log.log("delta is less than 0, reset ticker");
                    this.delta = 0;
                    this.tickermsg = "";
                }
            } else {
                this.currentPrayer['cprayer'] = null;
                this.delta = 0;
            }
        }

        this.loaded = true;
        this.updateDom();
    },

    socketNotificationReceived: function (notification, payload) {
        // debug
        var pl = JSON.stringify(payload);
        Log.info(this.name + ": Socket Notification received: " + notification + ", payload: " + pl);

        switch (notification) {
            // Update prayer times
            case 'UPDATEPRAYERTIMES': 
                this.prayerInfo = payload;
                // update the current prayer and prayer times
                this.updateDuration(true, true, -1);
                break;

            // update the current prayer
            case 'UPDATECURRENTPRAYER': 
                this.currentPrayer = payload;

                if (this.currentPrayer['cprayer'] == null) {
                    this.tickermsg = "";
                    this.delta = 0;
                }

                // update only current prayer
                this.updateDuration(false, true, -1);
                break;
        }
    },

    notificationReceived: function (notification, payload, sender) {
        switch (notification) {
            case 'CLOCK_MINUTE':
                Log.log("clock minute notification received from: " + sender + ", payload: " + payload);
                let cMin = parseInt(payload);

                // update only the duration
                this.updateDuration(false, false, cMin);
                break;
        }
    }
});
