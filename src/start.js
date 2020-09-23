const filesJs = require('./files.js');
const path = require('path');
const extend = require('extend');
/**
 * start.js
 * 讀取Theme 生成json做分析
 *
 */

//設定要讀哪一個樣板
const checkThemeSitconfig = 'light'; //light,default

// const checkTemplateTheme = 'template-adam';
// const checkThemeSetting = 'Adam';
// const checkTemplateTheme = 'template-alex';
// const checkThemeSetting = 'Alex';
// const checkTemplateTheme = 'template-amy';
// const checkThemeSetting = 'Amy';
const checkTemplateTheme = 'template-anson';
const checkThemeSetting = 'Anson';

(async function () {
  console.log('init');
  const dirpath = ['adam', 'amy', 'anson', 'alex'];
  const themeFileList = [];
  dirpath.forEach((dirname) => {
    const scsslist = filesJs.readdirSync(path.resolve('.', 'theme', dirname)).forEach((element) => {
      if (/scss/.test(element) && element) {
        themeFileList.push(['.', 'theme', dirname, element]);
      }
    });
  });

  //要核對的Css Template
  const templatefilelist = walkFilesSync(
    path.resolve('..', '..', '..', 'Template', checkTemplateTheme),
    (fname, dirname) => {
      // const fullpath = path.join(dirname, fname);
      return /\.scss$/.test(fname);
    },
  );

  //從Adam 樣板去撈看看
  const sitpackageModule = walkFilesSync(
    path.resolve('..', '..', '..', 'sitepackage.frontend.master', 'src', 'components', checkThemeSetting),
    (fname, dirname) => {
      // const fullpath = path.join(dirname, fname);
      return /\.vue$/.test(fname) || /\.scss$/.test(fname);
    },
  );

  //從_global 去撈看看
  const sitpackageComponents = walkFilesSync(
    path.resolve('..', '..', '..', 'sitepackage.frontend.master', 'src', 'components', '_global'),
    (fname, dirname) => {
      // const fullpath = path.join(dirname, fname);
      return /\.vue$/.test(fname) || /\.scss$/.test(fname);
    },
  );
  //從user 去撈看看
  const sitpackageUser = walkFilesSync(
    path.resolve('..', '..', '..', 'sitepackage.frontend.master', 'src', 'components', 'user'),
    (fname, dirname) => {
      // const fullpath = path.join(dirname, fname);
      return /\.vue$/.test(fname) || /\.scss$/.test(fname);
    },
  );
  /** 1.把所有單一樣板要用的檔案vue css 抓回來 */
  const allFileList = [...sitpackageModule, ...sitpackageComponents, ...sitpackageUser, ...templatefilelist];
  //所有樣板的theme key map
  const mapJSon = {};
  //本次執行的樣板 theme key
  const currentJson = {};
  //本次執行的樣板 line 紀錄
  const currentLine = [];
  /** 2.把所有樣板要用的theme 設定抓回來 */
  const promise = new Promise((resolve, err) => {
    var countLoading = 0;
    themeFileList.forEach((filepath) => {
      filesJs.readFile(path.resolve(...filepath), 'utf8', function (err, data) {
        const dataArray = data.split('\n');

        dataArray.forEach((element, ind) => {
          if ([...element].includes(':')) {
            const ar = String(element).split(':');
            const key = ar[0];
            /** 3.取回所有的設定key */
            mapJSon[String(key).replace(/^\s+/, '')] = ar.slice(1, ar.length);
            //區分指定的樣板 theme key
            if (
              filepath.includes(checkThemeSetting.toLocaleLowerCase()) &&
              filepath.toString().indexOf(checkThemeSitconfig) !== -1
            ) {
              currentJson[String(key).replace(/^\s+/, '')] = ar.slice(1, ar.length);
            }
          }
          if (
            filepath.includes(checkThemeSetting.toLocaleLowerCase()) &&
            filepath.toString().indexOf(checkThemeSitconfig) !== -1
          ) {
            currentLine[ind] = element;
          }
        });
        countLoading = countLoading + 1;

        if (countLoading == themeFileList.length) {
          resolve();
        }
      });
    });
  });
  //實際有用到的
  const themeJson = {};
  promise.then(() => {
    Object.keys(mapJSon).forEach((key) => {
      /** 4.從全部檔案裡面去找,把真正這個版要用的找出來 */
      allFileList.forEach((temppath) => {
        const checkFile = filesJs.readFileSync(temppath, { encoding: 'utf8' });
        if (checkFile.indexOf('var(' + key) >= 0) {
          var fileType;
          switch (true) {
            case temppath.indexOf('user') !== -1:
              fileType = 'user';
              break;
            case temppath.indexOf('_global') !== -1:
              fileType = 'global';
              break;
            case temppath.indexOf('css') !== -1:
              fileType = 'css';
              break;
            case temppath.indexOf(checkThemeSetting) !== -1:
              fileType = checkThemeSetting;
              break;
            default:
              fileType = 'template';
              break;
          }
          themeJson[key] = themeJson[key] || [];
          if (!themeJson[key].includes(fileType)) {
            themeJson[key].push(fileType);
          }
        }
      });
    });

    //建立輸出日期
    const d = new Date();
    const backupDate = '20200922'; //d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate());
    filesJs.writeFile(checkThemeSetting + '_' + backupDate + '.json', JSON.stringify(themeJson, null, 2), errorHandler);

    //實際這個樣板真正有用到的
    filesJs.writeFile(
      checkThemeSetting + '_' + backupDate + '_key.json',
      JSON.stringify(Object.keys(themeJson).sort(), null, 2),
      errorHandler,
    );
    //指定的樣板結構 ex amy light scss
    filesJs.writeFile(
      checkThemeSetting + '_' + backupDate + '_defkey.json',
      JSON.stringify(Object.keys(currentJson).sort(), null, 2),
      errorHandler,
    );
    //從樣板內過濾出只用一次的user key
    const userJson = [];
    Object.keys(themeJson).forEach((val) => {
      if (themeJson[val].length == 1) {
        switch (true) {
          case themeJson[val][0] === 'user':
            userJson.push(val);
            break;
        }
      }
    });
    filesJs.writeFile(
      checkThemeSetting + '_' + backupDate + '_user.json',
      JSON.stringify(userJson, null, 2),
      errorHandler,
    );
    /** 5.從目前在用的theme 去 比對實際有用的  抓出多餘的 */
    const delCurrentKeyList = Object.keys(currentJson).filter((key) => {
      if (!Object.keys(themeJson).includes(key)) {
        return true;
      }
    });
    /** 從實際有用的 跟 目前在用的theme  比對抓出 沒有在目前在用的裡面的key 要拿來新增 */
    const addCurrentKeyList = Object.keys(themeJson).filter((key) => {
      if (!Object.keys(currentJson).includes(key)) {
        return true;
      }
    });

    const cloneCurrentLine = extend(true, [], currentLine);

    /** 6.刪掉 */
    delCurrentKeyList.forEach((val) => {
      currentLine.forEach((line, ind) => {
        const index = line.indexOf(val);
        if (index !== -1) {
          currentLine[ind] = '';
        }
      });
    });

    /** 新增還沒寫 因為新增也要寫對應的參數*/
    //
    console.log('注意一下需要寫新增', addCurrentKeyList.length > 0 && addCurrentKeyList);
    //
    /** 輸出scss */
    filesJs.writeFile(
      checkThemeSetting + '_' + backupDate + '.scss',
      currentLine.filter((v) => v !== '').join('\n'),
      errorHandler,
    );

    //全部的key 輸出一份scss
    const lineArray = cloneCurrentLine
      .map((line) => {
        if (line.indexOf(':') !== -1) {
          return line.split(':')[0].replace(/^\s+/, '');
        }
      })
      .filter((val) => val);

    // console.log('.......');
    const checkThemeSitconfig = 'light'; //light,default
    const logger = filesJs.createWriteStream(
      path.resolve('.', 'frontstage_' + backupDate + '_' + checkThemeSitconfig + '_key.scss'),
      {
        flags: 'w', // 'a' means appending (old data will be preserved)
      },
    );
    logger.write('html[theme] {\n');

    const outputArray = [...lineArray];
    Object.keys(mapJSon).forEach((key) => {
      if (lineArray.indexOf(key) === -1) {
        console.log(key);
        outputArray.push(key);
      }
    });
    outputArray.forEach((key) => {
      if (mapJSon[key][0].indexOf('var(') !== -1 || mapJSon[key][0].indexOf('px') !== -1) {
        logger.write(`  ${key}: ${mapJSon[key][0]}\n`);
      } else {
        logger.write(`  ${key}: \n`);
      }
    });
    logger.write('}');
    logger.end();
  });
})();

function walkFilesSync(dirname, filter = undefined) {
  try {
    let files = [];

    filesJs.readdirSync(dirname).forEach((fname) => {
      const fpath = path.join(dirname, fname);

      if (filesJs.is_file(fpath)) {
        if (filter && filter(fname, dirname)) {
          files.push(fpath);
        }
      } else if (filesJs.is_dir(fpath) && !/^\./.test(fpath) && !/node_modules/.test(fpath)) {
        files = files.concat(walkFilesSync(fpath, filter));
      }
    });

    return files;
  } catch (err) {
    throw err;
  }
}

function errorHandler(err) {
  if (err) {
    console.log(err);
    throw err;
  }
}

function pad(n) {
  return n < 10 ? '0' + n : n;
}
