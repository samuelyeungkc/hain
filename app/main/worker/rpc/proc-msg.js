'use strict';

const logger = require('../../shared/logger');
const listeners = {};

function send(channel, payload) {
  process.send({ channel, payload });
}

function on(channel, listener) {
  listeners[channel] = listener;
}

function start() {
  process.on('message', (msg) => {
    try {
      const { channel, payload } = msg;
      const listener = listeners[channel];
      listener(payload);
    } catch (e) {
      const err = e.stack || e;
      logger.error(err);
    }
  });
}

module.exports = { send, on, start };
