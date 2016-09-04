'use strict';

const Registry = require('winreg');

module.exports = class AutoLauncher {
  constructor(opts) {
    this.appName = opts.name;
    this.appPath = opts.path;
    this.reg = new Registry({
      hive: Registry.HKCU,
      key: '\\Software\\Microsoft\\Windows\\CurrentVersion\\Run'
    });
  }
  enable() {
    return new Promise((resolve, reject) => {
      this.reg.set(this.appName, Registry.REG_SZ, this.appPath, (err) => {
        if (err)
          return reject(err);
        resolve();
      });
    });
  }
  disable() {
    return new Promise((resolve, reject) => {
      this.reg.remove(this.appName, (err) => {
        if (err)
          return reject(err);
        resolve();
      });
    });
  }
  isEnabled() {
    return new Promise((resolve, reject) => {
      this.reg.get(this.appName, (err, item) => {
        resolve(item != null);
      });
    });
  }
};
