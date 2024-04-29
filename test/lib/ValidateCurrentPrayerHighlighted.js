const {
  getElementClass
} = require('./ui');

function ValidateCurrentPrayerHighlighted(config, highlighted) {
  it('The prayer ' + config.currentPrayer + ' should ' + (highlighted ? 'be ' : 'not be ') + 'highlighted', async () => {
    const actualClasses = await getElementClass(driver, 'ptimeDOM-table-td-pname-' + config.currentPrayer);
    const expectedClasses = 'prayer-name bright light' +  (highlighted ? ' highlight' : '');
    expect(actualClasses, `Expected class '${expectedClasses}' but found '${actualClasses}'`).to.equal(expectedClasses);
  });
}

module.exports = {
  ValidateCurrentPrayerHighlighted
};