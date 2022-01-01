# MMM-OLPrayerTime
Off-line Prayer Time module for MagicMirror

## How to install this module
1. If you already have Magic Mirror installed, skip to step 5. Clone the Magic Mirror repository and check out the master branch:  
`git clone https://github.com/MichMich/MagicMirror`
  
2. Change to the Magic Mirror directory:  
`cd MagicMirror/`
   
3. Install the required modules:  
`npm install`

4. Make a copy of the config sample file:  
`cp config/config.js.sample config/config.js`

5. Clone this module in the modules directory:  
`cd modules`  
`git clone https://github.com/ibnharoon/MMM-OLPrayerTime.git`

6. Add module entry to config/config.js (see below for module options) eg:  
`modules: [  
...  
...  
> 		{  
>			module: 'MMM-OLPrayerTime',  
>			position: 'middle_center',  
>                        header: 'Prayer Times',  
>			config: {  
>				latitude: 37.3391931,  
>				longitude: -121.9389783  
>			}  
>		}  
...  
...  
]`  

5. Install the required modules:  
`cd modules/MMM-OLPrayerTime`  
`cd npm install`

6. Install vendor specific modules:  
`cd ../../vendor`  
`npm install`

7. Start the application:  
`cd ..`  
`npm run start`

### Module Options
