'use strict';

const path = require('path');

function injectEnvVariable(dirPath) {
  if (dirPath.length <= 0)
    return dirPath;

  // for macOS
  let _path = dirPath;
  if (process.platform !== 'win32') {
    if (_path[0] === '~')
      _path = path.join(process.env.HOME, _path.slice(1));
  }

  // Inject Environment Variables
  for (const envVar in process.env) {
    const value = process.env[envVar];
    _path = _path.replace(`\${${envVar}}`, value);
  }
  return _path;
}

function injectEnvVariables(dirArr) {
  const newArr = [];
  for (let i = 0; i < dirArr.length; ++i) {
    const dirPath = dirArr[i];
    newArr.push(injectEnvVariable(dirPath));
  }
  return newArr;
}

module.exports = { injectEnvVariables };
