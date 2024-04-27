const Dayjs = require('dayjs');
const {
  getElementText
} = require('./ui');

const {
  convertTimeStringToDate,
  durationToString
} = require('./utils');

function ValidateNextPrayerDuration(config) {
  it('The next prayer duration should be correct', async () => {
    console.log('validate next prayer duration config: ' + JSON.stringify(config));
    var actualDur = await getElementText(driver, 'ptimeDOM-premain');
    const prayerTimeString = await getElementText(driver, 'ptimeDOM-table-td-ptime-' + config.nextPrayer.toLowerCase());
    console.log('prayer time string: ' + prayerTimeString);
    var currentDateString = await getElementText(driver, 'currentTime');
    console.log('current date string: ' + currentDateString);
    var endDate = convertTimeStringToDate(prayerTimeString, currentDateString, config.nextPrayer);
    console.log('end date before: ' + endDate.toDate());
    const midnight = new Dayjs(config.expectedDate.toDate().setHours(0, 0, 0, 0)).add((config.midnightNextDay) ? 0 : 1, 'day');
    console.log('midnight before: ' + midnight.toDate());
    // const midnighttime = new Dayjs(midnight).add(1, 'day');
    // console.log('midnight time: ' + midnighttime.toDate());
    if (config.currentPrayer === 'Midnight' && endDate.valueOf() < midnight.valueOf() && config.midnightNextDay) {
      endDate = endDate.add(1, 'day');
    }
    console.log('current date string: ' + currentDateString + ', expected date: ' + config.expectedDate.toDate() + ', endDate: ' + endDate.toDate());
    const expectedDur = config.nextPrayer + ' ' + durationToString(config.expectedDate, endDate);
    expect(actualDur, `Expected duration '${expectedDur}' but found '${actualDur}'`).to.equal(expectedDur);
  });
}

module.exports = {
  ValidateNextPrayerDuration
};