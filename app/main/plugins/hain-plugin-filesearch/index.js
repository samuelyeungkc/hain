'use strict';

const fs = require('original-fs');
const co = require('co');
const path = require('path');

const readdir = require('./readdir');
const searchUtil = require('./search-util');

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
