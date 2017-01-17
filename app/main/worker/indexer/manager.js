'use strict';

const lo_orderBy = require('lodash.orderby');
const lo_isString = require('lodash.isstring');
const logger = require('../../shared/logger');

const RecentItemManager = require('./recent-item-manager');
const Indexer = require('./indexer');

const CONTEXT = '@indexer';

class IndexerManager {
  constructor(localStorage) {
    this.indexers = {};
    this.executeFunc = (pluginId, id, payload) => { };
    this.recentItemManager = new RecentItemManager(localStorage);
    this.recentItemManager.load();
  }
  search(query) {
    const totalResults = [];
    for (const key in this.indexers) {
      const indexer = this.indexers[key];
      const searchResult = indexer.search(query);
      totalResults.push(...searchResult);
    }
    return this.sortAndRefineSearchedResults(totalResults, 15);
  }
  sortAndRefineSearchedResults(results, limit) {
    const sorted = lo_orderBy(results, ['score'], ['desc']);
    if (sorted.length > limit)
      sorted.length = limit;
    const mapped = sorted.map((x) => {
      const payload = {
        pluginId: x.pluginId,
        extraPayload: x.payload
      };
      const recentItemId = this.makeIdForRecentItem(x.pluginId, x.id);
      return {
        title: x.primaryText,
        desc: x.secondaryText,
        icon: x.icon,
        group: x.group,
        redirect: x.redirect,
        context: CONTEXT,
        id: x.id,
        score: x.score * this.recentItemManager.getSearchRatio(recentItemId),
        payload
      };
    });
    return mapped;
  }
  createIndexerForPlugin(pluginId, defaultIcon) {
    const indexer = new Indexer(pluginId, defaultIcon);
    this.indexers[pluginId] = indexer;
    return indexer;
  }
  execute(pluginId, id, extraPayload) {
    if (!this.executeFunc) {
      logger.error('Can\'t find a execute function');
      return;
    }
    this.executeFunc(pluginId, id, extraPayload);

    const recentItemId = this.makeIdForRecentItem(pluginId, id);
    this.recentItemManager.markExecuted(recentItemId);
    this.recentItemManager.save();
  }
  setExecuteFunction(executeFunc) {
    this.executeFunc = executeFunc;
  }
  makeIdForRecentItem(pluginId, id) {
    if (!lo_isString(id))
      return null;
    return `${pluginId}?@${id}`;
  }
}

IndexerManager.CONTEXT = CONTEXT;

module.exports = IndexerManager;
