const {
  getElementClass
} = require('./ui');

function ValidateDuration(config) {
  it('The duration field should ' + (config.blink ? 'be ' : 'not be ') + 'blinking', async () => {
    const actualClasses = await getElementClass(driver, 'ptimeDOM-premain');
    const expectedClasses = 'tickercontent' + (config.blink ? ' blink' : '');
    expect(actualClasses, `Expected class '${expectedClasses}' but found '${actualClasses}'`).to.equal(expectedClasses);
  });
}

module.exports = {
  ValidateDuration
};