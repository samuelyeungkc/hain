'use strict';

const cryptoUtil = require('./crypto-util');
const lo_assign = require('lodash.assign');

function traverse(model, schema, callback, setter) {
  const objType = schema.type;
  if (model === undefined || model === null)
    return;
  if (objType === 'object') {
    const props = schema.properties;
    for (const propName in props) {
      const _propName = propName;
      const childSchema = props[_propName];
      const childModel = model[_propName];
      const childSetter = (x) => (model[_propName] = x);
      traverse(childModel, childSchema, callback, childSetter);
    }
  } else if (objType === 'array') {
    const itemSchema = schema.items;
    const items = model || [];
    for (let i = 0; i < items.length; ++i) {
      const _i = i;
      const item = items[i];
      const itemSetter = (x) => (items[_i] = x);
      traverse(item, itemSchema, callback, itemSetter);
    }
  } else {
    const ret = callback(model, schema);
    if (ret !== undefined)
      setter(ret);
  }
}

function decode(model, schema, options) {
  const copy = lo_assign({}, model);
  traverse(copy, schema, (_model, _schema) => {
    if (_schema.type === 'password' && _model.length > 0) {
      let _encrypted = null;
      try {
        _encrypted = cryptoUtil.decrypt(_model, options.encryptionKey);
      } catch (err) {
      }
      if (_encrypted !== null)
        return _encrypted;
      return '';
    }
  });
  return copy;
}

function encode(model, schema, options) {
  const copy = lo_assign({}, model);
  traverse(copy, schema, (_model, _schema) => {
    if (_schema.type === 'password' && _model.length > 0)
      return cryptoUtil.encrypt(_model, options.encryptionKey);
  });
  return copy;
}

module.exports = { decode, encode };
