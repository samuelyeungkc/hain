'use strict';

const lo_get = require('lodash.get');
const lo_isEqual = require('lodash.isequal');
const lo_assign = require('lodash.assign');

const EventEmitter = require('events');

const schemaDefaults = require('../../utils/schema-defaults');
const jsonSchemaEncoder = require('../../utils/json-schema-encoder');

class PreferencesObject extends EventEmitter {
  constructor(store, id, schema, encKey) {
    super();

    this.store = store;
    this.id = id;
    this.schema = schema;
    this.encKey = encKey;
    this.encoderOptions = {
      encryptionKey: encKey
    };

    this.model = {};
    this._isDirty = false;

    this.load();
  }
  get isDirty() {
    return this._isDirty;
  }
  load() {
    const defaults = schemaDefaults(this.schema);
    if (this.store) {
      let loadedData = this.store.get(this.id);
      if (loadedData && this.encKey)
        loadedData = jsonSchemaEncoder.decode(loadedData, this.schema, this.encoderOptions);
      this.model = lo_assign({}, defaults, loadedData);
    } else {
      this.model = lo_assign({}, defaults);
    }
  }
  get(path) {
    if (path === undefined)
      return this.model;
    return lo_get(this.model, path);
  }
  reset() {
    const defaults = schemaDefaults(this.schema);
    this.update(defaults);
    return defaults;
  }
  update(model) {
    if (lo_isEqual(this.model, model))
      return;
    this.model = model;
    this._isDirty = true;
  }
  commit() {
    if (this._isDirty === false)
      return;
    if (this.store) {
      let saveData = this.model;
      if (this.encKey)
        saveData = jsonSchemaEncoder.encode(this.model, this.schema, this.encoderOptions);
      this.store.set(this.id, saveData);
    }
    const copy = lo_assign({}, this.model);
    this.emit('update', copy);
    this._isDirty = false;
  }
}

module.exports = PreferencesObject;
