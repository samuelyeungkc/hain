'use strict';

const lo_first = require('lodash.first');
const twitter = require('twitter-text');

module.exports = (context) => {
  const shell = context.shell;
  const app = context.app;
  const indexer = context.indexer;

  function startup() {
    indexer.set('url-parser', parseUrlForIndexer);
  }

  function parseUrlForIndexer(query) {
    const query_trim = query.trim();
    if (query_trim.length <= 2)
      return;

    const urls = twitter.extractUrls(query_trim);
    if (urls.length === 0)
      return;

    const url = lo_first(urls);
    const ratio = url.length / query_trim.length;
    if (ratio <= 0.9)
      return;

    return {
      id: url,
      primaryText: url,
      secondaryText: url,
      group: 'Link'
    };
  }

  function execute(id, payload, extra) {
    const protocol_re = /https?:\/\//i;
    let url = id;
    if (protocol_re.test(url) === false) {
      url = `http://${url}`;
    }
    shell.openExternal(url);
    app.close();
  }

  return { startup, execute };
};
