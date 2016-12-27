'use strict';

const lo_orderBy = require('lodash.orderby');

const IndexerInstance = require('./instance');
const instances = [];

function search(query) {
  const totalResults = [];
  for (const instance of instances) {
    const searchResult = instance.search(query);
    totalResults.push(...searchResult);
  }
  const sorted = lo_orderBy(totalResults, ['score'], ['desc']);
  return sorted.map((x) => {
    return {
      title: x.primaryText,
      desc: x.secondaryText,
      context: 'hain-indexer'
    };
  });
}

function createIndexerInstance(pluginId) {
  const instance = new IndexerInstance(pluginId);
  instances.push(instance);
  return instance;
}

function markExecuted(pluginId, id) {
}

const i = createIndexerInstance('test');
i.set('test', [{ primaryText: 'haha' }]);

module.exports = {
  search,
  createIndexerInstance
};
