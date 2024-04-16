const {
  getElementText
} = require('./ui');

const {
  convertTimeStringToDate,
  durationToString
} = require('./utils');

function ValidateNextPrayerDuration(config) {
  it('The next prayer message should be correct', async () => {
    var actualDur = await getElementText(driver, 'ptimeDOM-premain');
    const prayerTimeString = await getElementText(driver, 'ptimeDOM-table-td-ptime-' + config.nextPrayer.toLowerCase());
    var currentDateString = await getElementText(driver, 'currentTime');
    var endDate = convertTimeStringToDate(prayerTimeString, currentDateString, config.nextPrayer);
    const expectedDur = config.nextPrayer + ' ' + durationToString(config.expectedDate, endDate);
    expect(actualDur, `Expected duration '${expectedDur}' but found '${actualDur}'`).to.equal(expectedDur);
  });
}

module.exports = {
  ValidateNextPrayerDuration
};