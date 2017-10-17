'use strict';

const lo_isString = require('lodash.isstring');

const MAX_RATIO = 3;

class ItemPriorityManager {
  constructor(localStorage) {
    this.localStorage = localStorage;
    this.itemNumberOfUses = {};
  }
  load() {
    this.itemNumberOfUses = this.localStorage.getItem('itemNumberOfUses') || {};
  }
  save() {
    this.localStorage.setItem('itemNumberOfUses', this.itemNumberOfUses);
  }
  applyPriorityToScore(itemId, score) {
    if (!lo_isString(itemId) || itemId.length <= 0)
      return score;

    const itemNumberOfUse = this.itemNumberOfUses[itemId] || 0;
    const ratio = Math.min(MAX_RATIO, (1 + Math.log(1 + itemNumberOfUse)));
    return score * ratio;
  }
  markItemHasExecuted(itemId) {
    if (!lo_isString(itemId) || itemId.length <= 0)
      return;

    const oldNumberOfUse = this.itemNumberOfUses[itemId] || 0;
    this.itemNumberOfUses[itemId] = oldNumberOfUse + 1;
  }
}

module.exports = ItemPriorityManager;
