# MMM-OLPrayerTime
Off-line Muslim Prayer Time module for [MagicMirror<sup>2</sup>](https://github.com/MichMich/MagicMirror)

## How to install this module
1. If you already have MagicMirror<sup>2</sup> installed, skip to step 5, otherwise install it by cloning the MagicMirror<sup>2</sup> repository and check out the master branch:  
`git clone https://github.com/MichMich/MagicMirror.git`
  
2. Change to the MagicMirror<sup>2</sup> directory:  
`cd MagicMirror/`
   
3. Install the required modules:  
`npm install`

4. Make a copy of the config sample file:  
`cp config/config.js.sample config/config.js`

5. Clone this module in the modules directory:  
`cd modules`  
`git clone https://github.com/ibnharoon/MMM-OLPrayerTime.git`

6. Add module entry to config/config.js (see [below](#module-options) for module options) eg:  
`modules: [  
...  
...  
> 		{  
>			module: 'MMM-OLPrayerTime',  
>			position: 'middle_center',  
>			header: 'Prayer Times',  
>			config: {  
>				latitude: 37.3391931,  
>				longitude: -121.9389783  
>			}  
>		}  
...  
...  
]`  

7. Install the required modules:  
`cd modules/MMM-OLPrayerTime`  
`cd npm install`

8. Install vendor specific modules (skip this step if you already have MagicMirror<sup>2</sup> installed):  
`cd ../../vendor`  
`npm install`

9. Start the application:  
`cd ..`  
`npm start`

### Module Options

>        latitude: false,                        // Latitude. Required parameter  
>        longitude: false,                       // Longitude. Required parameter  
>        timeFormat: config.timeFormat || 24,    // 12 or 24  
>        method: "ISNA",                         // see document for prayer-times npm  
>        asrfactor: "Standard",                  // see document for prayer-times npm  
>        notDisplayed: ['sunrise', 'midnight'],  // Do not display these times  
>        animationSpeed: 2.5 * 1000,             // Speed of the update animation. (milliseconds)  
>        language: config.language || "en",      // Language preference  
>        pthreshold: 10                          // Flashing before prayer reminder threshold (in minutes)  

### Screenshots
![](/Screenshot%20from%202022-01-01%2007-09-35.png)
