const { By } = require('selenium-webdriver');
var Dayjs = require('dayjs');

// Utility to handle dates with Dayjs
function calculateExpectedDate(fakeTime, addMin) {
  // console.log('fake time: ' + fakeTime + ', addmin: ' + addMin);
  return new Dayjs(fakeTime.replace('@', ''), 'YYYY-MM-DD HH:mm:ss').add(addMin, 'minute');
}

// Utility to find an element by ID and get its text
async function getElementText(driver, elementId) {
  // console.log('element id: ' + elementId + ', driver: ' + driver);
  const element = await driver.findElement(By.id(elementId));
  return element.getText();
}

// Utility to find an element by ID and get its class attribute
async function getElementClass(driver, elementId) {
  const element = await driver.findElement(By.id(elementId));
  return element.getAttribute('class');
}

module.exports = {
  getElementText,
  getElementClass,
  calculateExpectedDate
};
