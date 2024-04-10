# MMM-OLPrayerTime
Off-line Muslim Prayer Time module for [MagicMirror<sup>2</sup>](https://github.com/MichMich/MagicMirror)

## How to install this module
1. If you already have MagicMirror<sup>2</sup> installed, skip to [step 5](#step-5), otherwise install it by cloning the MagicMirror<sup>2</sup> repository and check out the master branch:  
`git clone https://github.com/MichMich/MagicMirror.git`
  
2. Change to the MagicMirror<sup>2</sup> directory:  
`cd MagicMirror/`
   
3. Install the required modules:  
`npm install`

4. Make a copy of the config sample file:  
`cp config/config.js.sample config/config.js`

<a name="step-5">&nbsp;&nbsp;&nbsp;5.</a> Clone this module in the modules directory:  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;`cd modules`  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;`git clone https://github.com/ibnharoon/MMM-OLPrayerTime.git`

6. Add module entry to config/config.js (see below for [module options](#module-options)) eg:  
modules: [  
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
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;...  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;...  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;]  

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
| Option          | Type | Default           | Comments                                                      |
|-----------------|------------|---------------------------|---------------------------------------------------------------|
| latitude        | double   | none                     | Latitude. Required parameter                                  |
| longitude       | double    | none                     | Longitude. Required parameter                                 |
| timeFormat      | number     | 12 | 12 or 24                                                      |
| method          | string     | "ISNA"                    | see document for prayer-times npm                             |
| asrfactor       | string     | "Standard"                | see document for prayer-times npm                             |
| notDisplayed    | array      | ['sunrise', 'midnight']   | Do not display these times                                    |
| animationSpeed  | double     | 2.5 * 1000                | Speed of the update animation. (milliseconds)                 |
| language        | string     | "en" | Language preference                                           |
| pthreshold      | number     | 10                        | Flashing before prayer reminder threshold (in minutes)        |

### Screenshots
![](/Screenshot%20from%202022-01-01%2007-09-35.png)

[![Prayer Time Test](https://github.com/ibnharoon/MMM-OLPrayerTime/actions/workflows/test.yml/badge.svg)](https://github.com/ibnharoon/MMM-OLPrayerTime/actions/workflows/test.yml)
