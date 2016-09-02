'use strict';

const lo_find = require('lodash.find');
const lo_remove = require('lodash.remove');

const co = require('co');
const path = require('path');
const packageControl = require('./package-control');
const fileUtil = require('../../shared/file-util');
const fs = require('fs');

const util = require('./util');

function _createPackageInfo(name, data, internal) {
  return {
    name,
    version: data.version || 'none',
    desc: data.description || '',
    author: util.parseAuthor(data.author) || '',
    homepage: data.homepage || '',
    internal: !!internal
  };
}

class Packman {

  constructor(opts) {
    this.repoDir = opts.mainRepo;
    this.internalRepoDir = opts.internalRepo;
    this.tempDir = opts.tempDir;
    this.installDir = opts.installDir;
    this.updateListFile = opts.updateListFile;
    this.uninstallListFile = opts.uninstallListFile;

    this.packages = [];
    this.internalPackages = [];
  }

  readPackages() {
    const self = this;
    co(function* () {
      self.packages = [];
      yield fileUtil.ensureDir(self.repoDir);
      const packageDirs = yield fileUtil.readdir(self.repoDir);
      for (const _packageDir of packageDirs) {
        const packageJsonFile = path.join(self.repoDir, _packageDir, 'package.json');
        try {
          const fileContents = yield fileUtil.readFile(packageJsonFile);
          const pkgJson = JSON.parse(fileContents.toString());
          const pkgInfo = _createPackageInfo(_packageDir, pkgJson);
          self.packages.push(pkgInfo);
        } catch (e) {
          console.log(e);
          continue;
        }
      }

      self.internalPackages = [];
      const internalPackageDirs = yield fileUtil.readdir(self.internalRepoDir);
      for (const _packageDir of internalPackageDirs) {
        const packageJsonFile = path.join(self.internalRepoDir, _packageDir, 'package.json');
        try {
          const fileContents = yield fileUtil.readFile(packageJsonFile);
          const pkgJson = JSON.parse(fileContents.toString());
          const pkgInfo = _createPackageInfo(_packageDir, pkgJson, true);
          self.internalPackages.push(pkgInfo);
        } catch (e) {
          console.log(e);
          continue;
        }
      }
    });
  }

  listPackages() {
    return this.packages;
  }

  listInternalPackages() {
    return this.internalPackages;
  }

  getPackage(packageName) {
    return lo_find(this.packages, (x) => x.name === packageName);
  }

  hasPackage(packageName) {
    return (this.getPackage(packageName) !== undefined);
  }

  installPackage(packageName, versionRange) {
    const self = this;
    return co(function* () {
      if (self.hasPackage(packageName))
        throw `Installed package: ${packageName}`;

      const saveDir = path.join(self.installDir, packageName);
      const data = yield packageControl.installPackage(packageName, versionRange, saveDir, self.tempDir);

      self.packages.push(_createPackageInfo(packageName, data));
    });
  }

  _uninstallPackage(targetListFile, packageName) {
    if (!this.hasPackage(packageName))
      throw `Can't find a package: ${packageName}`;

    fs.appendFileSync(targetListFile, `${packageName}\n`);
    lo_remove(this.packages, x => x.name === packageName);
  }

  uninstallPackageForUpdate(packageName) {
    this._uninstallPackage(this.updateListFile, packageName);
  }

  uninstallPackage(packageName) {
    this._uninstallPackage(this.uninstallListFile, packageName);
  }

}

module.exports = Packman;
