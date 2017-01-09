'use strict';

const cp = require('child_process');
const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');

const logger = require('../../shared/logger');
const RpcChannel = require('../../shared/rpc-channel');
const lo_assign = require('lodash.assign');

module.exports = class WorkerClient extends EventEmitter {
  constructor() {
    super();

    this.workerProcess = null;
    this.rpc = RpcChannel.create('#worker', this.send.bind(this), this.on.bind(this));
  }
  reload() {
    logger.debug('WorkerWrapper: reloading worker');

    this.terminate();
    this.load();
  }
  load() {
    logger.debug('WorkerWrapper: loading worker');

    const workerPath = path.join(__dirname, '../../worker/index.js');
    if (!fs.existsSync(workerPath))
      throw new Error('can\'t execute plugin process');

    const workerOptions = {
      execArgv: ['--optimize_for_size', '--gc_global', '--always_compact'],
    };

    if (process.platform === 'win32') {
      this.workerProcess = cp.fork(workerPath, [], lo_assign(workerOptions, {
        silent: true
      }));

      // Workaround for Electron 1.3.4's strange stdio redirection
      this.workerProcess.stdout.on('data', process.stdout.write);
      this.workerProcess.stderr.on('data', process.stdout.write);
    } else {
      this.workerProcess = cp.fork(workerPath, [], workerOptions);

      // Kill worker process on exit
      process.on('exit', this.terminate.bind(this));
    }

    this.workerProcess.on('message', (msg) => this._handleWorkerMessage(msg));
  }
  terminate() {
    if (this.workerProcess === null)
      return;
    this.workerProcess.kill();
    this.workerProcess = null;
  }
  send(channel, payload) {
    this.workerProcess.send({ channel, payload });
  }
  _handleWorkerMessage(msg) {
    const { channel, payload } = msg;
    this.emit(channel, payload);
  }
};
