'use strict';

const app = require('electron').app;

module.exports = class AutoLauncher {
  enable() {
    return new Promise((resolve, reject) => {
      app.setLoginItemSettings({ openAtLogin: true });
      resolve();
    });
  }
  disable() {
    return new Promise((resolve, reject) => {
      app.setLoginItemSettings({ openAtLogin: false });
      resolve();
    });
  }
  isEnabled() {
    return new Promise((resolve, reject) => {
      const enabled = app.getLoginItemSettings().openAtLogin;
      resolve(enabled);
    });
  }
  isLaunchedAtLogin() {
    return app.getLoginItemSettings().wasOpenedAtLogin;
  }
};
