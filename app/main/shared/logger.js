'use strict';

const winston = require('winston');
const logger = new (winston.Logger)({
  level: 'debug',
  transports: [
    new (winston.transports.File)({
      filename: 'hain-debug.log',
      json: false,
      prettyPrint: true,
      maxFiles: 3,
      maxsize: 1024 * 1024,
			showLevel: false,
    }),
    new (winston.transports.Console)({
      timestamp: true,
      prettyPrint: true,
			showLevel: false,
    })
  ]
});

module.exports = logger;
