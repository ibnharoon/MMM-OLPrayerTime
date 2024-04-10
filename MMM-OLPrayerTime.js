
Module.register("MMM-OLPrayerTime", {
  // Default module config.
  defaults: {
    latitude: false,                        // Latitude. Required parameter, please define in config.js
    longitude: false,                       // Longitude. Required parameter, please define in config.js
    timeFormat: config.timeFormat || 12,    // 12 or 24
    method: "ISNA",                         // see document for prayer-times npm 
    asrfactor: "Standard",                  // see document for prayert-times npm
    notDisplayed: ['sunrise', 'midnight'],             // Speed of the update animation. (milliseconds)
    language: config.language || "en",
    pthreshold: 10
  },

  getStyles: function () {
    return ["MMM-OLPrayerTime.css"];
  },

  getTranslations: function () {
    return {
      en: 'translations/en.json'
    };
  },

  start: function () {
    var self = this;
    Log.info("Starting module: " + this.name);
    this.dateString = '';
    this.dateUpdated = false;

    this.prayerInfo = {};
    this.currentPrayer = null;
    this.nextPrayer = null;
    this.timer = null;
    this.tickermsg = "";
    this.delta = 0;
    this.wrapper = null;

    this.loaded = false;
    this.updateticker = false;
    this.updatecprayer = false;
    this.updateptimes = false;
    this.allPrayers = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha', 'midnight'];

    // send config information to node helper
    this.sendSocketNotification('CONFIG', this.config);
  },

  // Override dom generator.
  getDom: function () {
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
        prayerName.setAttribute("id", "ptimeDOM-table-td-pname-" + cp);
        row.appendChild(prayerName);

        var prayerTime = document.createElement("td");
        prayerTime.setAttribute("id", "ptimeDOM-table-td-ptime-" + cp);
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
      var currentDate = document.getElementById("ptimeDOM-table-td-date");
      if (currentDate != null) {
        currentDate.innerHTML = this.dateString;
      }

      for (cp in this.prayerInfo) {
        if (this.config.notDisplayed.includes(cp)) {
          continue;
        }

        // highlight the current prayer
        var highlight = (cp == this.currentPrayer) ? " highlight" : "";
        var prayerName = document.getElementById("ptimeDOM-table-td-pname-" + cp);
        pname = this.translate(cp);

        var prayerTime = document.getElementById("ptimeDOM-table-td-ptime-" + cp);

        if (this.updateptimes || this.updatecprayer) {
          prayerName.className = "prayer-name bright light" + highlight;
          prayerTime.className = "prayer-time bright light" + highlight;
          if (this.updateptimes) {
            prayerName.innerHTML = pname;
            prayerTime.innerHTML = this.prayerInfo[cp];
          }
        }
      }

      if (this.updateticker) {
        var tickerspan = document.getElementById("ptimeDOM-premain");
        if (this.tickermsg != "" && tickerspan != null) {
          if (this.delta <= this.config.pthreshold) {
            tickerspan.className = "tickercontent blink";
          } else {
            tickerspan.className = "tickercontent";
          }
          tickerspan.innerHTML = this.tickermsg;
        }
      }
    }
    this.updateptimes = false;
    this.updatecprayer = false;
    this.updateticker = false;
    this.loaded = true;
    return this.wrapper;
  },

  updateDuration: function () {
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

    Log.log("delta: " + this.delta);
    if (this.delta > 0) {
      Log.log("delta is " + this.delta + ", update ticker");
      var dstr = convertMinsToHrsMins(this.delta);
      if (dstr != "") {
        npname = this.translate(this.nextPrayer);
        var nmsg = `${npname}` + " " + `${dstr}`;
        this.tickermsg = nmsg;
      } else {
        //Log.log("dstring is empty");
        this.tickermsg = "";
      }
    }
  },

  socketNotificationReceived: function (notification, payload) {
    // debug
    var pl = JSON.stringify(payload);
    Log.info(this.name + ": Socket Notification received: " + notification + ", payload: " + pl);

    switch (notification) {
      // Update prayer times
      case 'UPDATEPRAYERTIMES':
        this.prayerInfo = payload['timings'];
        this.currentPrayer = payload['cprayer'];
        this.nextPrayer = payload['nprayer'];
        this.delta = payload['duration'];
        this.dateString = payload['dateString'];
        this.updateDuration();
        this.updateptimes = true;
        this.updateticker = true;
        this.updatecprayer = true;
        this.updateDom();
        break;

      // update the current prayer
      case 'UPDATECURRENTPRAYER':
        this.currentPrayer = payload['cprayer'];
        this.nextPrayer = payload['nprayer'];
        this.delta = payload['duration'];
        this.updateDuration();
        this.dateString = payload['dateString'];
        this.updateptimes = false;
        this.updatecprayer = true;
        this.updateticker = true;
        this.updateDom();
        break;
    }
  },

  notificationReceived: function (notification, payload, sender) {
    var updateTimerFunction = function(tobj) {
      tobj.updateticker = true;
      tobj.updatecprayer = false;
      tobj.updateptimes = false;
      tobj.updateDuration();
      tobj.updateDom();
    };

    switch (notification) {
      case 'CLOCK_MINUTE':
        Log.log("clock minute notification received from: " + JSON.stringify(sender) + ", payload: " + payload);
        var timeout = 0;

        this.delta--;
        
        this.delta = Math.max(this.delta, 0);

        if (this.delta == 0) {
          // wait .5 seconds before updating UI i.e. until next prayers information is available
          timeout = 500;
          this.sendSocketNotification('UPDATEDURATION', {'minutes': parseInt(payload)});
        }

        // update duration
        setTimeout( () => updateTimerFunction(this), timeout);
        break;
    }
  }
});
