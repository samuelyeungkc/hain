/* global process */
'use strict';

const lo_assign = require('lodash.assign');
const lo_isFunction = require('lodash.isfunction');
const lo_reject = require('lodash.reject');
const lo_keys = require('lodash.keys');
const lo_isString = require('lodash.isstring');

const co = require('co');
const fs = require('fs');
const fse = require('fs-extra');
const path = require('path');
const fileUtil = require('../shared/file-util');

const matchUtil = require('../shared/match-util');
const logger = require('../shared/logger');
const prefStore = require('./pref-store');
const storageManager = require('./storage-manager');
const indexer = require('./indexer');
const PreferencesObject = require('../shared/preferences-object');
const helpUtil = require('./utils/help-util');
const responseUtil = require('./utils/response-util');

const conf = require('../conf');

module.exports = (workerContext) => {
  const pluginLoader = require('./plugin-loader')();

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
      localStorage: storageManager.createPluginLocalStorage(pluginId),
      indexer: indexer.createIndexerInstance(pluginId)
    };
    const hasPreferences = (pluginConfig.prefSchema !== null);
    if (hasPreferences) {
      const preferences = new PreferencesObject(prefStore, pluginId, pluginConfig.prefSchema);
      localContext.preferences = preferences;
      prefObjs[pluginId] = preferences;
    }
    return lo_assign({}, pluginContextBase, localContext);
  }

  function _startup() {
    logger.debug('startup: begin');
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
    logger.debug('startup: end');
  }

  function removeUninstalledPlugins(listFile, removeData) {
    if (!fs.existsSync(listFile))
      return;

    try {
      const contents = fs.readFileSync(listFile, { encoding: 'utf8' });
      const targetPlugins = contents.split('\n').filter((val) => (val && val.trim().length > 0));

      for (const packageName of targetPlugins) {
        const packageDir = path.join(conf.MAIN_PLUGIN_REPO, packageName);
        fse.removeSync(packageDir);

        if (removeData) {
          const storageDir = path.join(conf.LOCAL_STORAGE_DIR, packageName);
          const prefFile = path.join(conf.PLUGIN_PREF_DIR, packageName);
          fse.removeSync(storageDir);
          fse.removeSync(prefFile);
        }

        logger.debug(`${packageName} has uninstalled successfully`);
      }
      fse.removeSync(listFile);
    } catch (e) {
      logger.error(`plugin uninstall error: ${e.stack || e}`);
    }
  }

  function movePreinstalledPlugins() {
    return co(function* () {
      const preinstallDir = conf.__PLUGIN_PREINSTALL_DIR;
      if (!fs.existsSync(preinstallDir))
        return;

      const packageDirs = fs.readdirSync(preinstallDir);
      const repoDir = conf.MAIN_PLUGIN_REPO;
      for (const packageName of packageDirs) {
        const srcPath = path.join(preinstallDir, packageName);
        const destPath = path.join(repoDir, packageName);
        yield fileUtil.move(srcPath, destPath);
        logger.debug(`${packageName} has installed successfully`);
      }
    }).catch((err) => {
      logger.error(`plugin uninstall error: ${err.stack || err}`);
    });
  }

  function* initialize() {
    removeUninstalledPlugins(conf.__PLUGIN_UNINSTALL_LIST_FILE, true);
    removeUninstalledPlugins(conf.__PLUGIN_UPDATE_LIST_FILE, false);
    yield movePreinstalledPlugins();

    const ret = pluginLoader.loadPlugins(generatePluginContext);
    plugins = ret.plugins;
    pluginConfigs = ret.pluginConfigs;
    pluginPrefIds = lo_reject(lo_keys(pluginConfigs), x => pluginConfigs[x].prefSchema === null);

    _startup();
  }

  const QUERY_PREFIX_REGEX = /^[?@=\\/]/;

  function searchAll(query, resFunc) {
    if (query.length === 0) {
      resFunc({ type: 'add', payload: helpUtil.createIntroHelp(pluginConfigs) });
      return;
    }

    if (!QUERY_PREFIX_REGEX.test(query)) {
      // Search indexer
      resFunc({ type: 'add', payload: indexer.search(query) });
      return;
    }

    let sysResults = [];

    // Search plugins
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
          sysResults = sysResults.concat(prefixHelp);
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

  function execute(context, id, payload) {
    // FIXME redirect가 이 부분을 대체하지 않았을까 생각해봄
    if (plugins[context] === undefined) {
      if (payload)
        workerContext.app.setQuery(payload);
      return;
    }

    const executeFunc = plugins[context].execute;
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
