'use strict';

const lo_findIndex = require('lodash.findindex');
const lo_orderBy = require('lodash.orderby');
const path = require('path');
const matchUtil = require('../../shared/match-util');

const BASENAME_MATCH_WEIGHT = 2.0;

function computeRatio(filePath, extensions) {
  let ratio = 1;
  const ext = path.extname(filePath).toLowerCase();
  const basename = path.basename(filePath).toLowerCase();
  if (!extensions.includes(ext))
    ratio *= 0.5;
  if (ext === '.lnk')
    ratio *= 1.5;
  if (ext === '.appref-ms')
    ratio *= 1.4;
  if (basename.indexOf('uninstall') >= 0 || basename.indexOf('remove') >= 0)
    ratio *= 0.9;
  return ratio;
}

function combineFuzzyResults(combinedTarget, source) {
  for (const x of source) {
    const allpath = x.path;
    const idx = lo_findIndex(combinedTarget, { path: allpath });
    // Append if there is no this item on combinedTarget
    if (idx < 0) {
      combinedTarget.push(x);
      continue;
    }
    // Replace after comparing
    const old = combinedTarget[idx];
    if (old.score >= x.score)
      continue;
    combinedTarget[idx] = x;
  }
}

function fuzzy(items, query, extensions) {
  const resultsByPath = matchUtil.fuzzy(items, query).slice(0, 20).map(x => {
    return {
      path: x.elem,
      html: matchUtil.makeStringBoldHtml(x.elem, x.matches),
      score: x.score * computeRatio(x.elem, extensions)
    };
  });
  const resultsByBasename = matchUtil.fwdfuzzy(items, query, x => path.basename(x, path.extname(x))).slice(0, 20).map(x => {
    const allpath = x.elem;
    const extname = path.extname(allpath);
    const basename = path.basename(allpath, extname);
    const containerPath = allpath.substring(0, allpath.length - basename.length - extname.length);
    const html = matchUtil.makeStringBoldHtml(basename, x.matches);
    return {
      path: allpath,
      html: containerPath + html + extname,
      score: x.score * BASENAME_MATCH_WEIGHT * computeRatio(allpath, extensions)
    };
  });
  const combined = [];
  combineFuzzyResults(combined, resultsByPath);
  combineFuzzyResults(combined, resultsByBasename);
  const result = lo_orderBy(combined, ['score'], ['desc']);
  return result;
}

module.exports = { fuzzy };
