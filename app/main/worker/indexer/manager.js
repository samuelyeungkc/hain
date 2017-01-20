'use strict';

const lo_orderBy = require('lodash.orderby');
const lo_isString = require('lodash.isstring');
const logger = require('../../shared/logger');

const ItemPriorityManager = require('./item-priority-manager');
const Indexer = require('./indexer');

const CONTEXT = '@indexer';

class IndexerManager {
  constructor(localStorage) {
    this.indexers = {};
    this.executeFunc = (pluginId, id, payload) => { };
    this.itemPriorityManager = new ItemPriorityManager(localStorage);
    this.itemPriorityManager.load();
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
    const sorted = lo_orderBy(results, [this._computeItemScoreWithPriority.bind(this)], ['desc']);
    if (sorted.length > limit)
      sorted.length = limit;
    const refinedItems = sorted.map((x) => {
      const payload = {
        pluginId: x.pluginId,
        extraPayload: x.payload
      };
      return {
        title: x.primaryText,
        desc: x.secondaryText,
        icon: x.icon,
        group: x.group,
        redirect: x.redirect,
        context: CONTEXT,
        id: x.id,
        payload
      };
    });
    return refinedItems;
  }
  _computeItemScoreWithPriority(item) {
    const itemPriorityId = this.makeItemPriorityId(item.pluginId, item.id);
    const score = this.itemPriorityManager.applyPriorityToScore(itemPriorityId, item.score);
    return score;
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

    const itemPriorityId = this.makeItemPriorityId(pluginId, id);
    this.itemPriorityManager.markItemHasExecuted(itemPriorityId);
    this.itemPriorityManager.save();
  }
  setExecuteFunction(executeFunc) {
    this.executeFunc = executeFunc;
  }
  makeItemPriorityId(pluginId, id) {
    if (!lo_isString(id))
      return null;
    return `${pluginId}?@${id}`;
  }
}

IndexerManager.CONTEXT = CONTEXT;

module.exports = IndexerManager;
