'use strict';

const fse = require('fs-extra');
const storage = require('node-persist');

const conf = require('../conf');

function createLocalStorage(context) {
  const localStorageDir = `${conf.LOCAL_STORAGE_DIR}/${context}`;
  fse.ensureDirSync(localStorageDir);

  const localStorage = storage.create({
    dir: localStorageDir
  });
  localStorage.initSync();
  return localStorage;
}

module.exports = {
  createLocalStorage
};
