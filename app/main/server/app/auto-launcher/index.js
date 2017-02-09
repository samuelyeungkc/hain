'use strict';

let moduleName = require('./win32');

if (process.platform === 'darwin')
  moduleName = './darwin';

module.exports = require(moduleName);
