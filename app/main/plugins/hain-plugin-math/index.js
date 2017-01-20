'use strict';

const lo_isNumber = require('lodash.isnumber');
const lo_isString = require('lodash.isstring');
const lo_isObject = require('lodash.isobject');
const lo_has = require('lodash.has');

const math = require('mathjs');

module.exports = (context) => {
  const app = context.app;
  const clipboard = context.clipboard;
  const toast = context.toast;
  const indexer = context.indexer;

  function startup() {
    indexer.set('math', (query) => {
      const answer = calculate(query);
      if (!answer)
        return;
      return makeResultItem('primaryText', query, answer);
    });
  }

  function search(query, res) {
    const answer = calculate(query);
    if (!answer)
      return;
    res.add(makeResultItem('title', query, answer));
  }

  function makeResultItem(titleKey, query, answer) {
    const result = {};
    result[titleKey] = `${query.trim()} = ${answer}`;
    result.group = 'Math';
    result.payload = answer;
    return result;
  }

  function calculate(query) {
    try {
      const ans = math.eval(query);
      if (lo_isNumber(ans) || lo_isString(ans) || (lo_isObject(ans) && lo_has(ans, 'value'))) {
        const ansString = ans.toString();
        if (ansString.trim() !== query.trim())
          return ansString;
      }
    } catch (e) { }
  }

  function execute(id, payload) {
    app.setQuery(`=${payload}`);
    clipboard.writeText(payload);
    toast.enqueue(`${payload} has copied into clipboard`);
  }

  return { startup, search, execute };
};
