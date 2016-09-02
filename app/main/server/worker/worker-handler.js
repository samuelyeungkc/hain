'use strict';

const logger = require('../../shared/logger');

module.exports = class WorkerHandler {
  constructor(workerClient, appService, apiService) {
    this.workerClient = workerClient;
    this.appService = appService;
    this.apiService = apiService;
  }
  initialize() {
    const rpc = this.workerClient.rpc;
    rpc.define('onError', this.handleOnError.bind(this));
    rpc.define('callApi', this.handleCallApi.bind(this));
    rpc.define('notifyPluginsLoaded', this.handleNotifyPluginsLoaded.bind(this));
    rpc.define('requestAddResults', this.handleRequestAddResults.bind(this));
    rpc.define('requestRenderPreview', this.handleRequestRenderPreview.bind(this));
  }
  handleOnError(payload) {
    logger.error(`Unhandled Plugin Error: ${payload}`);
  }
  handleCallApi(payload) {
    const { moduleName, funcName, args } = payload;
    return this.apiService.callApi(moduleName, funcName, args);
  }
  handleNotifyPluginsLoaded(payload) {
    this.appService.mainWindow.notifyPluginsLoaded();
  }
  handleRequestAddResults(__payload) {
    const { ticket, type, payload } = __payload;
    this.appService.mainWindow.requestAddResults(ticket, type, payload);
  }
  handleRequestRenderPreview(payload) {
    const { ticket, html } = payload;
    this.appService.mainWindow.requestRenderPreview(ticket, html);
  }
};
