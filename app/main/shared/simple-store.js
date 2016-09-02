'use strict';

const fse = require('fs-extra');
const storage = require('node-persist');

function createStorage(dir) {
  fse.ensureDirSync(dir);
  const localStorage = storage.create({ dir });
  localStorage.initSync();
  return localStorage;
}

module.exports = class SimpleStore {
  constructor(dir) {
    this.localStorage = createStorage(dir);
  }
  get(id) {
    return this.localStorage.getItemSync(id);
  }
  set(id, obj) {
    this.localStorage.setItemSync(id, obj);
  }
  has(id) {
    return (this.get(id) !== undefined);
  }
};
