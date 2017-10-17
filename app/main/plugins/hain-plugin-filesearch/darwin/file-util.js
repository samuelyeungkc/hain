'use strict';

const fsp = require('fs-promise');
const path = require('path');
const macBundleUtil = require('../../../../native/mac-bundle-util');

function* findApplications(dirPath, recursive) {
  const matchedPaths = [];
  const pendingDirs = [dirPath];
  const scannedDirs = {};
  while (pendingDirs.length > 0) {
    const dir = pendingDirs.shift();
    const realdir = yield fsp.realpath(dir);

    if (scannedDirs[realdir])
      continue;
    scannedDirs[realdir] = true;

    try {
      const files = yield fsp.readdir(realdir);
      for (const file of files) {
        const filePath = path.join(realdir, file);
        const extName = path.extname(filePath);
        try {
          const stat = yield fsp.stat(filePath);
          if (stat.isDirectory() && extName === '.app')
            matchedPaths.push(filePath);
          else if (stat.isDirectory() && recursive)
            pendingDirs.push(filePath);
        } catch (e) { }
      }
    } catch (e) { }
  }
  return matchedPaths;
}

function* getApplicationInfo(appPath) {
  const name = macBundleUtil.getLocalizedBundleDisplayName(appPath);
  return {
    path: appPath,
    name: name
  };
}

module.exports = { findApplications, getApplicationInfo };
