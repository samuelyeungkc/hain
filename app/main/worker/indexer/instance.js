'use strict';

// const indexItem = {
//   id: '',
//   primaryText: '',
//   secondaryText: '',
//   icon: '',
//   payload: '',
//   redirect: ''
// };

const lo_assign = require('lodash.assign');
const lo_isArray = require('lodash.isarray');
const lo_isFunction = require('lodash.isfunction');
const lo_isPlainObject = require('lodash.isplainobject');

const matcher = require('./matcher');

const SECONDARY_RATIO = 0.75;

class IndexerInstance {
  constructor(pluginId) {
    this._pluginId = pluginId;
    this.items = {};
    this._cachedResults = [];
  }
  set(key, funcOrArray) {
    if (!lo_isArray(funcOrArray) && !lo_isFunction(funcOrArray))
      return;

    this.items[key] = funcOrArray;
  }
  remove(key) {
    delete this.items[key];
  }
  search(query) {
    this._cachedResults.length = 0;
    for (const key in this.items) {
      const item = this.items[key];
      const searchResult = this._searchItem(item, query);
      if (lo_isArray(searchResult))
        this._cachedResults.push(...searchResult);
      else if (lo_isPlainObject(searchResult))
        this._cachedResults.push(searchResult);
    }
    // Inject pluginId
    for (const elem of this._cachedResults) {
      elem.pluginId = this._pluginId;
    }
    return this._cachedResults;
  }
  _searchItem(item, query) {
    if (lo_isArray(item))
      return this._searchArrayItem(item, query);
    else if (lo_isFunction(item))
      return this._searchFunctionItem(item, query);
    return null;
  }
  _searchArrayItem(item, query) {
    const arr = item;
    const matched = [];
    const query_lower = query.toLowerCase();
    for (const elem of arr) {
      const primaryMatch = matcher.computeMatchScore(elem.primaryText, query_lower);
      let score = primaryMatch.score;

      if (elem.secondaryText) {
        const secondaryMatch = matcher.computeMatchScore(elem.secondaryText, query_lower);
        const secondaryScore = secondaryMatch.score * SECONDARY_RATIO;
        score = Math.max(score, secondaryScore);
      }

      const failedToMatch = (score <= 0);
      if (failedToMatch)
        continue;

      const elemWithScore = lo_assign(elem, { score });
      matched.push(elemWithScore);
    }
    return matched;
  }
  _searchFunctionItem(item, query) {
    const matched = [];
    const result = item(query);
    if (lo_isArray(result))
      matched.push(...result);
    else if (lo_isPlainObject(result))
      matched.push(result);
    return matched;
  }
}

module.exports = IndexerInstance;
