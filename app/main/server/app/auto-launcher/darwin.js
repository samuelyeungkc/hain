'use strict';

const app = require('electron').app;
const lo_assign = require('lodash.assign');

module.exports = class AutoLauncher {
  constructor(opts) {
    this.options = {
      path: opts.path,
      args: opts.args
    };
  }
  enable() {
    return new Promise((resolve, reject) => {
      app.setLoginItemSettings(lo_assign(this.options, {
        openAtLogin: true
      }));
      resolve();
    });
  }
  disable() {
    return new Promise((resolve, reject) => {
      app.setLoginItemSettings(lo_assign(this.options, {
        openAtLogin: false
      }));
      resolve();
    });
  }
  isEnabled() {
    return new Promise((resolve, reject) => {
      const enabled = app.getLoginItemSettings(this.options).openAtLogin;
      resolve(enabled);
    });
  }
};
