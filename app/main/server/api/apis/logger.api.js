'use strict';

const logger = require('../../../shared/logger');

module.exports = class LoggerAPI {
  constructor(context) {
    this.appService = context.appService;
  }
  log(...args) {
    logger.info(...args);
    this.appService.mainWindow.log(args);
  }
};
