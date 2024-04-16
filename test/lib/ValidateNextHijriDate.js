const {
  getElementText
} = require('./ui');

function ValidateNextHijriDate(config) {
  it('The next hijri date should be correct', async () => {
    const actualDate = await getElementText(driver, 'ptimeDOM-table-td-date');
    expect(actualDate, `Expected hijri date '${config.nextHijri}' but found '${actualDate}'`).to.equal(config.nextHijri);
  });
}

module.exports = {
  ValidateNextHijriDate
};
