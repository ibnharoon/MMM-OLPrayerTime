const {
  getElementText
} = require('./ui');

function ValidateCurrentDate(config) {
  // console.log('config: ' + JSON.stringify(config));
  it('The current date should be correct', async () => {
    const edatestr = config.expectedDate.format('YYYY-MM-DD hh:mm A');
    var actualDate = await getElementText(driver, 'currentTime');
    // console.log('actual date: ' + actualDate + ', edate: ' + edatestr);
    expect(actualDate, `Expected date '${edatestr}' but found '${actualDate}'`).to.equal(edatestr);
  });
}

module.exports = {
  ValidateCurrentDate
};