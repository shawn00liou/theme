const filesJs = require('./files.js');
const path = require('path');

(async function () {
  console.log('read init');

  const fileList = [];
  const scsslist = filesJs.readdirSync(path.resolve('.')).forEach((element) => {
    if (/_user/.test(element) && element) {
      fileList.push(['.', element]);
    }
  });

  const userJson = {};
  // console.log(fileList);
  fileList.forEach((filepath) => {
    const data = JSON.parse(filesJs.readFileSync(path.resolve(...filepath), 'utf8'));
    data.forEach((key) => {
      userJson[key] = userJson[key] || 0;
      userJson[key] = userJson[key] + 1;
    });
  });

  const userDefault = [];
  //過濾掉只用一次的
  Object.keys(userJson).forEach((key) => {
    if (userJson[key] > 1) {
      userDefault.push(key);
    }
  });
  const d = new Date();
  const backupDate = d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate());
  filesJs.writeFile('user_' + backupDate + '.json', JSON.stringify(userDefault, null, 2), errorHandler);
  console.log(userDefault);
})();

function errorHandler(err) {
  if (err) {
    console.log(err);
    throw err;
  }
}

function pad(n) {
  return n < 10 ? '0' + n : n;
}
