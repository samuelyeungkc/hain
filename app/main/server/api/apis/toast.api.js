'use strict';

module.exports = class ToastAPI {
  constructor(context) {
    this.appService = context.appService;
  }
  enqueue(message, duration) {
    this.appService.mainWindow.enqueueToast(message, duration);
  }
};
