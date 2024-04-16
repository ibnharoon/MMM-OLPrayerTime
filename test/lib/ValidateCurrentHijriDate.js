const {
  getElementText
} = require('./ui');

function ValidateCurrentHijriDate(config) {
  it('The current hijri date should be correct', async () => {
    const actualDate = await getElementText(driver, 'ptimeDOM-table-td-date');
    expect(actualDate, `Expected hijri date '${config.expectedHijriDate}' but found '${actualDate}'`).to.equal(config.expectedHijriDate);
  });
}

module.exports = {
  ValidateCurrentHijriDate
};