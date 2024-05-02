const {
  getElementText
} = require('./ui');

function ShowValues(config) {
  console.log('Show values');
  const date = await getElementText(driver, 'currentTime');
  console.log('date: ' + date);

  const hijri = await getElementText(driver, 'ptimeDOM-table-td-date');
  console.log('hijri: ' + hijri);

  const duration = await getElementText(driver, 'ptimeDOM-premain');
  console.log('duration: ' + duration);

  for (const prayer of ['Midnight', 'Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha']) {
    const time = await getElementText(driver, 'ptimeDOM-table-td-ptime-' + prayer);
    console.log(prayer + ': ' + time);
  }
}

module.exports = {
  ShowValues
};
