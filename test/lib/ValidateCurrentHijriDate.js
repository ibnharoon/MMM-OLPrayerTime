const {
  getElementText
} = require('./ui');

function ValidateCurrentHijriDate(config) {
  console.log('config: ' + JSON.stringify(config));
  it('The current hijri date should be correct', async () => {
    const actualDate = await getElementText(driver, 'ptimeDOM-table-td-date');
    const expected = (config.currentPrayer === 'Fajr') ? config.nextHijri : config.expectedHijriDate;
    expect(actualDate, `Expected hijri date '${config.expectedHijriDate}' but found '${actualDate}'`).to.equal(expected);
  });
}

module.exports = {
  ValidateCurrentHijriDate
};
