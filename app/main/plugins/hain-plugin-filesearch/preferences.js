'use strict';

let prefFile = './preferences-windows.json';

if (process.platform === 'darwin')
  prefFile = './preferences-macos.json';

module.exports = require(prefFile);
