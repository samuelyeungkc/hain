'use strict';

// This module manages api proxy interface with server apis

const rpc = require('./rpc');

function call(moduleName, funcName, args) {
  return rpc.call('callApi', { moduleName, funcName, args });
}

function makeProxy(moduleName, functions) {
  const proxy = {};
  for (const func of functions) {
    proxy[func] = (...args) => {
      return call(moduleName, func, args);
    };
  }
  return proxy;
}

const app = makeProxy('app', ['restart', 'quit', 'open', 'close', 'setInput', 'setQuery', 'openPreferences', 'reloadPlugins', 'setSelectionIndex']);
const clipboard = makeProxy('clipboard', ['readText', 'writeText', 'readHTML', 'writeHTML', 'clear']);
const toast = makeProxy('toast', ['enqueue']);
const shell = makeProxy('shell', ['showItemInFolder', 'openItem', 'openExternal']);
const logger = makeProxy('logger', ['log']);

module.exports = {
  app,
  clipboard,
  toast,
  shell,
  logger
};
