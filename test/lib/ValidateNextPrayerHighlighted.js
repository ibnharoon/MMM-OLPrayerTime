const {
  getElementClass
} = require('./ui');

function ValidateNextPrayerHighlighted(config, highlighted) {
  it('The prayer ' + config.nextPrayer + ' should ' + (highlighted ? 'be ' : 'not be ') + 'highlighted', async () => {
    const actualClasses = await getElementClass(driver, 'ptimeDOM-table-td-pname-' + config.nextPrayer);
    const expectedClasses = 'prayer-name bright light' + (highlighted? ' highlight': '');
    expect(actualClasses, `Expected class '${expectedClasses}' but found '${actualClasses}'`).to.equal(expectedClasses);
  });
}

module.exports = {
  ValidateNextPrayerHighlighted
};