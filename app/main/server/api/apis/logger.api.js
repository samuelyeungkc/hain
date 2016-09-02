'use strict';

const logger = require('../../../shared/logger');

module.exports = class LoggerAPI {
  constructor(context) {
    this.appService = context.appService;
  }
  log(msg) {
    logger.debug(msg);
    this.appService.mainWindow.log(msg);
  }
};
