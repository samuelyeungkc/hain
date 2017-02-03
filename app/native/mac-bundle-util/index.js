'use strict';

const macBundleUtil = require('./mac-bundle-util.node');

function getLocalizedBundleDisplayName(bundlePath) {
  let appName = null;
  try {
    appName = macBundleUtil.getLocalizedBundleDisplayName(bundlePath);
  } catch (e) {
    console.error(e);
  }
  return appName;
}

function saveApplicationIconAsPng(bundlePath, pngPath) {
  let success = false;
  try {
    success = macBundleUtil.saveApplicationIconAsPng(bundlePath, pngPath);
  } catch (e) {
    console.error(e);
  }
  return success;
}

module.exports = {
  getLocalizedBundleDisplayName,
  saveApplicationIconAsPng
};
