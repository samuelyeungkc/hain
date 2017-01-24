'use strict';

let moduleName = './win32';

const isDarwin = (process.platform === 'darwin');
if (isDarwin)
  moduleName = './darwin';

module.exports = require(moduleName);
