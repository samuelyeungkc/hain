'use strict';

const fs = require('fs');
const fse = require('fs-extra');
const path = require('path');
const fileUtil = require('../shared/file-util');

const conf = require('../conf');
const logger = require('../shared/logger');

function removeUninstalledPlugins(listFile, removeData) {
  if (!fs.existsSync(listFile))
    return;

  try {
    const contents = fs.readFileSync(listFile, { encoding: 'utf8' });
    const targetPlugins = contents.split('\n').filter((val) => (val && val.trim().length > 0));

    for (const packageName of targetPlugins) {
      const packageDir = path.join(conf.MAIN_PLUGIN_REPO, packageName);
      fse.removeSync(packageDir);

      if (removeData) {
        const storageDir = path.join(conf.LOCAL_STORAGE_DIR, packageName);
        const prefFile = path.join(conf.PLUGIN_PREF_DIR, packageName);
        fse.removeSync(storageDir);
        fse.removeSync(prefFile);
      }

      logger.debug(`${packageName} has uninstalled successfully`);
    }
    fse.removeSync(listFile);
  } catch (e) {
    logger.error(`plugin uninstall error: ${e.stack || e}`);
  }
}

function* movePreinstalledPlugins() {
  const preinstallDir = conf.__PLUGIN_PREINSTALL_DIR;
  if (!fs.existsSync(preinstallDir))
    return;

  const packageDirs = fs.readdirSync(preinstallDir);
  const repoDir = conf.MAIN_PLUGIN_REPO;
  for (const packageName of packageDirs) {
    const srcPath = path.join(preinstallDir, packageName);
    const destPath = path.join(repoDir, packageName);
    yield fileUtil.move(srcPath, destPath);
    logger.debug(`${packageName} has installed successfully`);
  }
}

function* installPreinstalledPlugins() {
  removeUninstalledPlugins(conf.__PLUGIN_UNINSTALL_LIST_FILE, true);
  removeUninstalledPlugins(conf.__PLUGIN_UPDATE_LIST_FILE, false);
  yield movePreinstalledPlugins();
}

module.exports = {
  installPreinstalledPlugins
};
