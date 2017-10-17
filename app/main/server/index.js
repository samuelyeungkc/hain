'use strict';

const AppService = require('./app/app-service');
const PrefManager = require('./preferences/pref-manager');
const WorkerClient = require('./worker/worker-client');
const WorkerProxy = require('./worker/worker-proxy');
const WorkerHandler = require('./worker/worker-handler');
const ApiService = require('./api/api-service');

module.exports = class Server {
  constructor() {
    this.workerClient = new WorkerClient();
    this.workerProxy = new WorkerProxy(this.workerClient);
    this.prefManager = new PrefManager(this.workerProxy);
    this.appService = new AppService(this.prefManager, this.workerClient, this.workerProxy);
    this.apiService = new ApiService(this.appService);
    this.workerHandler = new WorkerHandler(this.workerClient, this.appService, this.apiService);
  }
  launch() {
    this.apiService.loadApiModules();
    this.workerHandler.initialize();
    return this.appService.initializeAndLaunch()
      .then(() => {
        this.workerClient.load();
        this.workerProxy.initialize(this.prefManager.appPref.get());
      });
  }
};
