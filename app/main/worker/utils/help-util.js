'use strict';

const textUtil = require('../../shared/text-util');
const matchUtil = require('../../shared/match-util');

function makeIntroHelp(pluginConfig) {
  const usage = pluginConfig.usage || 'please fill usage in package.json';
  return {
    redirect: pluginConfig.redirect,
    payload: pluginConfig.redirect,
    title: textUtil.sanitize(usage),
    desc: textUtil.sanitize(pluginConfig.name),
    icon: pluginConfig.icon,
    group: 'Plugins'
  };
}

function makePrefixHelp(pluginConfig, query) {
  if (!pluginConfig.prefix) return;
  const candidates = [pluginConfig.prefix];
  const filtered = matchUtil.head(candidates, query);
  return filtered.map((x) => {
    return {
      redirect: pluginConfig.redirect,
      payload: pluginConfig.redirect,
      title: textUtil.sanitize(matchUtil.makeStringBoldHtml(x.elem, x.matches)),
      desc: textUtil.sanitize(pluginConfig.name),
      group: 'Plugin Commands',
      icon: pluginConfig.icon
    };
  });
}

function createIntroHelp(pluginConfigs) {
  const results = [];
  for (const pluginId in pluginConfigs) {
    const pluginConfig = pluginConfigs[pluginId];
    const help = makeIntroHelp(pluginConfig);
    results.push(help);
  }
  return results;
}

module.exports = {
  makePrefixHelp,
  createIntroHelp
};
