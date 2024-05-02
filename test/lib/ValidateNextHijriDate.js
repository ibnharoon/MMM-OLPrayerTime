const {
  getElementText
} = require('./ui');

function ValidateNextHijriDate(config) {
  it('The next hijri date should be correct', async () => {
    console.log('validate next hijri:' + JSON.stringify(config));
    const actualDate = await getElementText(driver, 'ptimeDOM-table-td-date');
    expect(actualDate, `Expected hijri date '${config.nextHijri}' but found '${actualDate}'`).to.equal(config.nextHijri);
    const date = await getElementText(driver, 'currentTime');
    console.log('date: ' + date);

    const hijri = await getElementText(driver, 'ptimeDOM-table-td-date');
    console.log('hijri: ' + hijri);

    const duration = await getElementText(driver, 'ptimeDOM-premain');
    console.log('duration: ' + duration);

    for (const prayer of ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha']) {
      const time = await getElementText(driver, 'ptimeDOM-table-td-ptime-' + prayer);
      console.log(prayer + ': ' + time);
    }
  });
}

module.exports = {
  ValidateNextHijriDate
};
