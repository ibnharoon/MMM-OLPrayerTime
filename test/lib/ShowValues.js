const {
  getElementText
} = require('./ui');

function ShowValues(config) {
  console.log('Show values');
  const date = await getElementText(driver, 'currentTime');
  console.log('date: ' + date);

  
}

module.exports = {
  ShowValues
};
