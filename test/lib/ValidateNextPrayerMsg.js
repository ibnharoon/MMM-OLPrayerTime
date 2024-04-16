const {
  getElementText
} = require('./ui');

function ValidateNextPrayerMsg(config) {
  it('The next prayer message should be "' + config.currentPrayer + ' ' + config.min + 'm"', async () => {
    var actualDur = await getElementText(driver, 'ptimeDOM-premain');
    const expectedDur = config.currentPrayer + ' ' + config.min + 'm';
    expect(actualDur, `Expected duration '${expectedDur}' but found '${actualDur}'`).to.equal(expectedDur);
  });
}

module.exports = {
  ValidateNextPrayerMsg
};