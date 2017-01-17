'use strict';

const lo_assign = require('lodash.assign');
const lo_isFunction = require('lodash.isfunction');
const lo_reject = require('lodash.reject');
const lo_keys = require('lodash.keys');
const lo_isString = require('lodash.isstring');

const matchUtil = require('../shared/match-util');
const logger = require('../shared/logger');
const prefStore = require('./pref-store');
const storageManager = require('./storage-manager');
const IndexerManager = require('./indexer/manager');
const PreferencesObject = require('../shared/preferences-object');
const helpUtil = require('./utils/help-util');
const responseUtil = require('./utils/response-util');
const pluginInstaller = require('./plugin-installer');

const conf = require('../conf');

const PLUGIN_QUERY_PREFIX_REGEX = /^[?@=\\/#]/;

module.exports = (workerContext) => {
  const pluginLoader = require('./plugin-loader')();

  let indexerManager = null;
  let plugins = null;
  let pluginConfigs = null;
  let pluginPrefIds = null;
  const prefObjs = {};

  const pluginContextBase = {
    // Plugin Configurations
    MAIN_PLUGIN_REPO: conf.MAIN_PLUGIN_REPO,
    DEV_PLUGIN_REPO: conf.DEV_PLUGIN_REPO,
    INTERNAL_PLUGIN_REPO: conf.INTERNAL_PLUGIN_REPO,
    __PLUGIN_PREINSTALL_DIR: conf.__PLUGIN_PREINSTALL_DIR,
    __PLUGIN_UNINSTALL_LIST_FILE: conf.__PLUGIN_UNINSTALL_LIST_FILE,
    __PLUGIN_UPDATE_LIST_FILE: conf.__PLUGIN_UPDATE_LIST_FILE,
    CURRENT_API_VERSION: conf.CURRENT_API_VERSION,
    COMPATIBLE_API_VERSIONS: conf.COMPATIBLE_API_VERSIONS,
    // Utilities
    app: workerContext.app,
    clipboard: workerContext.clipboard,
    toast: workerContext.toast,
    shell: workerContext.shell,
    logger: workerContext.logger,
    matchUtil,
    // Preferences
    globalPreferences: workerContext.globalPreferences,
    // Deprecated
    matchutil: matchUtil
  };

  function generatePluginContext(pluginId, pluginConfig) {
    const localContext = {
      localStorage: storageManager.createLocalStorage(pluginId),
      indexer: indexerManager.createIndexerForPlugin(pluginId, pluginConfig.icon)
    };
    const hasPreferences = (pluginConfig.prefSchema !== null);
    if (hasPreferences) {
      const preferences = new PreferencesObject(prefStore, pluginId, pluginConfig.prefSchema);
      localContext.preferences = preferences;
      prefObjs[pluginId] = preferences;
    }
    return lo_assign({}, pluginContextBase, localContext);
  }

  function* initialize() {
    yield pluginInstaller.installPreinstalledPlugins();

    setupIndexerManager();

    const ret = pluginLoader.loadPlugins(generatePluginContext);
    plugins = ret.plugins;
    pluginConfigs = ret.pluginConfigs;
    pluginPrefIds = lo_reject(lo_keys(pluginConfigs), x => pluginConfigs[x].prefSchema === null);

    callPluginsStartup();
  }

  function callPluginsStartup() {
    logger.debug('callPluginsStartup: begin');
    for (const prop in plugins) {
      logger.debug(`startup: ${prop}`);
      const startupFunc = plugins[prop].startup;
      if (!lo_isFunction(startupFunc)) {
        logger.debug(`${prop}: startup property should be a Function`);
        continue;
      }
      try {
        startupFunc();
      } catch (e) {
        logger.error(e.stack || e);
      }
    }
    logger.debug('callPluginsStartup: end');
  }

  function setupIndexerManager() {
    indexerManager = new IndexerManager(storageManager.createLocalStorage('indexer'));
    indexerManager.setExecuteFunction(executeOnPlugin);
  }

  function searchAll(query, resFunc) {
    const noQuery = (query.length <= 0);
    if (noQuery) {
      resFunc({ type: 'add', payload: helpUtil.createIntroHelp(pluginConfigs) });
      return;
    }

    const isPluginQuery = PLUGIN_QUERY_PREFIX_REGEX.test(query);
    if (isPluginQuery)
      searchPlugins(query, resFunc);
    else
      searchIndexer(query, resFunc);
  }

  function searchPlugins(query, resFunc) {
    const sysResults = [];
    for (const prop in plugins) {
      const pluginId = prop;
      const plugin = plugins[pluginId];
      const pluginConfig = pluginConfigs[pluginId];
      const hasPrefix = (lo_isString(pluginConfig.prefix) && pluginConfig.prefix.length > 0);
      if (!hasPrefix)
        continue;

      const query_lower = query.toLowerCase();
      const prefix_lower = pluginConfig.prefix.toLowerCase();

      if (query_lower.startsWith(prefix_lower) === false) {
        const prefixHelp = helpUtil.makePrefixHelp(pluginConfig, query);
        if (prefixHelp && prefixHelp.length > 0)
          sysResults.push(...prefixHelp);
        continue;
      }

      const localQuery = query.substring(prefix_lower.length);
      const pluginResponse = responseUtil.createResponseObject(resFunc, pluginId, pluginConfig);
      try {
        plugin.search(localQuery, pluginResponse);
      } catch (e) {
        logger.error(e.stack || e);
      }
    }
    // Send System-generated Results
    if (sysResults.length > 0)
      resFunc({ type: 'add', payload: sysResults });
  }

  function searchIndexer(query, resFunc) {
    resFunc({ type: 'add', payload: indexerManager.search(query) });
  }

  function execute(context, id, payload) {
    const isRedirect = (!context && lo_isString(payload));
    if (isRedirect) {
      workerContext.app.setQuery(payload);
      return;
    }

    if (context === IndexerManager.CONTEXT)
      return executeOnIndexer(id, payload);
    return executeOnPlugin(context, id, payload);
  }

  function executeOnIndexer(id, payload) {
    const { pluginId, extraPayload } = payload;
    indexerManager.execute(pluginId, id, extraPayload);
  }

  function executeOnPlugin(pluginId, id, payload) {
    const executeFunc = plugins[pluginId].execute;
    if (executeFunc === undefined)
      return;
    try {
      executeFunc(id, payload);
    } catch (e) {
      logger.error(e.stack || e);
    }
  }

  function renderPreview(context, id, payload, render) {
    if (plugins[context] === undefined)
      return;
    const renderPreviewFunc = plugins[context].renderPreview;
    if (renderPreviewFunc === undefined)
      return;
    try {
      renderPreviewFunc(id, payload, render);
    } catch (e) {
      logger.error(e.stack || e);
    }
  }

  function buttonAction(context, id, payload) {
    if (plugins[context] === undefined)
      return;
    const buttonActionFunc = plugins[context].buttonAction;
    if (buttonActionFunc === undefined)
      return;
    try {
      buttonActionFunc(id, payload);
    } catch (e) {
      logger.error(e.stack || e);
    }
  }

  function getPrefIds() {
    return pluginPrefIds;
  }

  function getPreferences(prefId) {
    const prefObj = prefObjs[prefId];
    return prefObj.toPrefFormat();
  }

  function updatePreferences(prefId, prefModel) {
    prefObjs[prefId].update(prefModel);
  }

  function commitPreferences() {
    for (const prefId in prefObjs) {
      const prefObj = prefObjs[prefId];
      prefObj.commit();
    }
  }

  function resetPreferences(prefId) {
    return prefObjs[prefId].reset();
  }

  return {
    initialize,
    searchAll,
    execute,
    renderPreview,
    buttonAction,
    getPrefIds,
    getPreferences,
    updatePreferences,
    commitPreferences,
    resetPreferences
  };
};
