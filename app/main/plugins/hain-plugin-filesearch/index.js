'use strict';

const fs = require('original-fs');
const co = require('co');
const lo_reject = require('lodash.reject');
const lo_findIndex = require('lodash.findindex');
const path = require('path');

const readdir = require('./readdir');
const searchUtil = require('./search-util');

const RECENT_ITEM_COUNT = 50;
const RECENT_ITEM_RATIO_HIGH = 3;
const RECENT_ITEM_RATIO_LOW = 1.5;

function injectEnvVariable(dirPath) {
  if (dirPath.length <= 0)
    return dirPath;

  // for macOS
  let _path = dirPath;
  if (process.platform !== 'win32') {
    if (_path[0] === '~')
      _path = path.join(process.env.HOME, _path.slice(1));
  }

  // Inject Environment Variables
  for (const envVar in process.env) {
    const value = process.env[envVar];
    _path = _path.replace(`\${${envVar}}`, value);
  }
  return _path;
}

function injectEnvVariables(dirArr) {
  const newArr = [];
  for (let i = 0; i < dirArr.length; ++i) {
    const dirPath = dirArr[i];
    newArr.push(injectEnvVariable(dirPath));
  }
  return newArr;
}

module.exports = (context) => {
  const logger = context.logger;
  const shell = context.shell;
  const app = context.app;
  const initialPref = context.preferences.get();
  const indexer = context.indexer;
  const toast = context.toast;

  const recursiveSearchDirs = injectEnvVariables(initialPref.recursiveFolders || []);
  const flatSearchDirs = injectEnvVariables(initialPref.flatFolders || []);
  const searchExtensions = initialPref.searchExtensions || [];

  const lazyIndexingKeys = {};

  function fileMatcher(filePath, stats) {
    const ext = path.extname(filePath).toLowerCase();
    if (stats.isDirectory())
      return true;
    if (searchExtensions.includes(ext))
      return true;
    return false;
  }

  function* findFilesAndUpdateIndexer(dirs, recursive) {
    for (const dir of dirs) {
      logger.log(`try to update files in ${dir}`);
      if (fs.existsSync(dir) === false) {
        logger.log(`can't find a dir: ${dir}`);
        continue;
      }
      const files = yield co(readdir.readdir(dir, recursive, fileMatcher));
      updateIndexer(dir, files);
    }
  }

  function updateIndexer(indexKey, files) {
    const indexerElements = searchUtil.filesToIndexerElements(files);
    indexer.set(indexKey, indexerElements);
    logger.log(`Indexer has updated ${indexKey}, ${files.length} files`);
  }

  function lazyRefreshIndex(dir, recursive) {
    const _lazyKey = lazyIndexingKeys[dir];
    if (_lazyKey !== undefined)
      clearTimeout(_lazyKey);

    lazyIndexingKeys[dir] = setTimeout(() => {
      co(findFilesAndUpdateIndexer([dir], recursive)).catch(logger.log);
    }, 10000);
  }

  function* setupWatchers(dirs, recursive) {
    for (const dir of dirs) {
      const _dir = dir;
      fs.watch(_dir, {
        persistent: true,
        recursive: recursive
      }, (evt, filename) => {
        lazyRefreshIndex(_dir, recursive);
      });
    }
  }

  function startup() {
    co(function* () {
      yield* findFilesAndUpdateIndexer(recursiveSearchDirs, true);
      yield* findFilesAndUpdateIndexer(flatSearchDirs, false);
      yield* setupWatchers(recursiveSearchDirs, true);
      yield* setupWatchers(flatSearchDirs, false);
    }).catch((err) => {
      logger.log(err);
      logger.log(err.stack);
    });
  }

  // function _fuzzyResultToSearchResult(results) {
  //   return results.map(x => {
  //     const path_base64 = new Buffer(x.path).toString('base64');
  //     return {
  //       id: x.path,
  //       title: path.basename(x.path, path.extname(x.path)),
  //       desc: x.html,
  //       icon: `icon://${path_base64}`,
  //       group: 'Files & Folders',
  //       score: x.score
  //     };
  //   });
  // }

  // function search(query, res) {
  //   const query_trim = query.replace(' ', '');
  //   const recentFuzzyResults = searchUtil.fuzzy(_recentUsedItems, query_trim, searchExtensions).slice(0, 2);
  //   const defaultFuzzyResults = searchUtil.fuzzy(db, query_trim, searchExtensions);

  //   let recentSearchResults = [];
  //   if (recentFuzzyResults.length > 0) {
  //     // Update score by usage frequency
  //     const RATIO_DELTA = (RECENT_ITEM_RATIO_HIGH - RECENT_ITEM_RATIO_LOW);
  //     const scoredRecentFuzzyResults = recentFuzzyResults.map((x) => {
  //       const nearIdx = _recentUsedItems.indexOf(x.path);
  //       const ratio = ((RECENT_ITEM_COUNT - nearIdx) / RECENT_ITEM_COUNT) * RATIO_DELTA + RECENT_ITEM_RATIO_LOW;
  //       x.score = x.score * ratio;
  //       return x;
  //     });
  //     recentSearchResults = _fuzzyResultToSearchResult(scoredRecentFuzzyResults);
  //   }

  //   // Reject if it is duplicated with recent items
  //   const sanitizedFuzzyResults = lo_reject(defaultFuzzyResults, x => lo_findIndex(recentFuzzyResults, { path: x.path }) >= 0);
  //   const fileSearchResults = _fuzzyResultToSearchResult(sanitizedFuzzyResults);
  //   const searchResults = recentSearchResults.concat(fileSearchResults).slice(0, 15);
  //   res.add(searchResults);
  // }

  function execute(id, payload) {
    if (fs.existsSync(id) === false) {
      toast.enqueue('Sorry, Could\'nt Find a File');
      return;
    }

    app.close();
    shell.openItem(id);
  }

  return { startup, execute };
};
