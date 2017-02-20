// appicon:// protocol for macOS
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const electron = require('electron');
const protocol = electron.protocol;

const conf = require('../../conf');

function hashPath(bundlePath) {
  return crypto.createHash('md5').update(bundlePath).digest('hex');
}

function register() {
  if (process.platform !== 'darwin')
    return;

  const macBundleUtil = require('../../../native/mac-bundle-util');

  protocol.registerFileProtocol('appicon', (req, callback) => {
    const cacheDir = path.join(conf.HAIN_USER_PATH, 'AppIcons');
    if (!fs.existsSync(cacheDir))
      fs.mkdirSync(cacheDir);

    try {
      const bundlePath = decodeURI(req.url.substr(10));
      const pathHash = hashPath(bundlePath);
      const pngPath = path.join(cacheDir, `${pathHash}.png`);
      if (fs.existsSync(pngPath))
        return callback(pngPath);

      macBundleUtil.saveApplicationIconAsPng(bundlePath, pngPath, (success) => {
        if (success)
          return callback(pngPath);
        return callback();
      });
    } catch (e) {
      callback();
    }
  });
}

module.exports = {
  register
};
