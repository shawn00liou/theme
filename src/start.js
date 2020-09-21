const filesJs = require('./files.js');
const path = require('path');
/**
 * start.js
 * 讀取Theme 生成json做分析
 *
 */

//設定要讀哪一個樣板
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

  //從Adam 去撈看看
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

  const mapJSon = {};
  const currentJson = {};
  /** 2.把所有單一樣板要用的theme 設定抓回來 */
  const promise = new Promise((resolve, err) => {
    var countLoading = 0;
    themeFileList.forEach((filepath) => {
      filesJs.readFile(path.resolve(...filepath), 'utf8', function (err, data) {
        const dataArray = data.split('\n');
        dataArray.forEach((element) => {
          if ([...element].includes(':')) {
            const ar = String(element).split(':');
            const key = ar[0];
            /** 3.取回所有的設定key */
            mapJSon[String(key).replace(/^\s+/, '')] = ar.slice(1, ar.length);

            if (filepath.includes(checkThemeSetting.toLocaleLowerCase())) {
              currentJson[String(key).replace(/^\s+/, '')] = ar.slice(1, ar.length);
            }
          }
        });
        countLoading = countLoading + 1;

        if (countLoading == themeFileList.length) {
          resolve();
        }
      });
    });
  });

  const themeJson = {};
  promise.then(() => {
    Object.keys(mapJSon).forEach((key) => {
      /** 從全部檔案裡面去找,把真正這個版要用的找出來 */
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
    console.log('sucess!!!', themeJson);
    //建立輸出日期
    const d = new Date();
    const backupDate = '20200921'; //d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate());
    filesJs.writeFile(checkThemeSetting + '_' + backupDate + '.json', JSON.stringify(themeJson, null, 2), errorHandler);
    filesJs.writeFile(
      checkThemeSetting + '_' + backupDate + '_key.json',
      JSON.stringify(Object.keys(themeJson).sort(), null, 2),
      errorHandler,
    );
    filesJs.writeFile(
      checkThemeSetting + '_' + backupDate + '_defkey.json',
      JSON.stringify(Object.keys(currentJson).sort(), null, 2),
      errorHandler,
    );

    const userJson = [];
    Object.keys(themeJson).forEach((val) => {
      //過濾出只用一次的user
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
