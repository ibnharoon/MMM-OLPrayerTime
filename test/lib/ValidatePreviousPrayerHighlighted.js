const {
  getElementClass
} = require('./ui');

function ValidatePreviousPrayerHighlighted(config, highlighted) {
  // console.log('config: ' + JSON.stringify(config));
  // console.log('highlight: ' + highlighted);
  it('The prayer ' + config.previousPrayer + ' should ' + (highlighted ? 'be ' : 'not be ') + 'highlighted', async () => {
    const actualClasses = await getElementClass(driver, 'ptimeDOM-table-td-pname-' + config.previousPrayer.toLowerCase());
    const expectedClasses = 'prayer-name bright light' + (highlighted? ' highlight': '');
    // console.log('actual: ' + actualClasses + ', expected: ' + expectedClasses);
    expect(actualClasses, `Expected class '${expectedClasses}' but found '${actualClasses}'`).to.equal(expectedClasses);
  });
}

module.exports = {
  ValidatePreviousPrayerHighlighted
};