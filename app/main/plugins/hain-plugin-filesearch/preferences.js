'use strict';

let prefFile = './win32/preferences.json';

if (process.platform === 'darwin')
  prefFile = './darwin/preferences.json';

module.exports = require(prefFile);
