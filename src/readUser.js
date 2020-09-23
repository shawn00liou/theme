const filesJs = require('./files.js');
const path = require('path');
/**
 * readUser.js
 * 針對User做分析 輸出一份全部樣板都使用到的user參數
 *
 *
 */
const checkThemeSitconfig = 'light'; //light,default

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
  const backupDate = '20200922'; //d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate());
  //輸出四個樣版都有使用到的user
  filesJs.writeFile('user_' + backupDate + '.json', JSON.stringify(userDefault, null, 2), errorHandler);
  console.log(userDefault);

  const allThemeUserData = JSON.parse(
    filesJs.readFileSync(
      path.resolve('.', 'frontstage_' + backupDate + '_' + checkThemeSitconfig + '_json.json'),
      'utf8',
    ),
  );

  const logger = filesJs.createWriteStream(
    path.resolve('.', 'frontstage_' + backupDate + '_' + checkThemeSitconfig + '_User.scss'),
    {
      flags: 'w', // 'a' means appending (old data will be preserved)
    },
  );
  logger.write('html[theme] {\n');

  const confirmDirPath = checkThemeSitconfig === 'light' ? ['amy', 'anson', 'alex'] : Object.keys(allThemeUserData);

  userDefault.forEach((key) => {
    // console.log(key);
    var confirmTheInformationIsTheSame = 0;

    confirmDirPath.forEach((path, index) => {
      const nextPath = confirmDirPath[(index + 1) % confirmDirPath.length];
      try {
        if (allThemeUserData[path][key][0] === allThemeUserData[nextPath][key][0]) {
          // console.log(key, '///', allThemeUserData[nextPath][key][0]);
          confirmTheInformationIsTheSame++;
        }
      } catch (er) {
        // 不存在 表示某一個樣板並沒有使用到這個key
      }
    });

    if (confirmTheInformationIsTheSame == confirmDirPath.length) {
      logger.write(`  ${key}:${allThemeUserData['anson'][key][0]}\n`);
    } else {
      logger.write(`  ${key}: ;\n`);
    }
  });
  logger.write('}');
  logger.end();
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
