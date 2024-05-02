const {
  getElementText
} = require('./ui');

function ShowValues(config) {
  console.log('Show values');
  const date = await getElementText(driver, 'currentTime');
  console.log('date: ' + date);

  const hijri = await getElementText(driver, 'ptimeDOM-table-td-date');
  console.log('hijri: ' + hijri);
}

module.exports = {
  ShowValues
};
