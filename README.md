# MMM-OLPrayerTime
Off-line Prayer Time module for MagicMirror

## How to install this module
### Install Magic Mirror
1. Clone the repository and check out the master branch: 

`git clone https://github.com/MichMich/MagicMirror`
  
2. Change to the directory:

`cd MagicMirror/`
   
3. Install the required modules:

`npm install`

4. Install this module:

`cd modules`  
`git clone https://github.com/ibnharoon/MMM-OLPrayerTime.git`

5. Make a copy of the config sample file:

`cp config/config.js.sample config/config.js`

6. Add module entry to config.js (see below for module options) eg:

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

6. Install vendor modules:

`cd ../vendor`  
`npm install`

7. Start the application:

`cd ..`  
`npm run start`

### Module Options
