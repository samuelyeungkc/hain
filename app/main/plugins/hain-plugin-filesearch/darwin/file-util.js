'use strict';

const fs = require('fs');
const fsp = require('fs-promise');
const path = require('path');
const plist = require('plist');

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

function getApplicationInfo(appPath) {
  const infoPlistPath = path.join(appPath, 'Contents', 'Info.plist');
  const infoPlistText = fs.readFileSync(infoPlistPath, 'utf8');
  const info = plist.parse(infoPlistText);
  const basename = path.basename(appPath, '.app');
  return {
    path: appPath,
    name: info.CrAppModeShortcutName || info.CFBundleDisplayName || info.CFBundleName || basename
  };
}

module.exports = { findApplications, getApplicationInfo };
