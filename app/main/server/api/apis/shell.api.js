'use strict';

const shell = require('electron').shell;

module.exports = class ShellAPI {
  showItemInFolder(fullPath) {
    shell.showItemInFolder(fullPath);
  }
  openItem(fullPath) {
    shell.openItem(fullPath);
  }
  openExternal(fullPath) {
    shell.openExternal(fullPath);
  }
};
