'use strict';

const readdir = require('./readdir');

function createMatchFunc(extensions, recursive) {
  return (filePath, stats) => {
    if (stats.isDirectory()) {
      let result = recursive ? readdir.RESULT_RECURSIVE_DIRECTORY : 0;
      if (filePath.endsWith('.app'))
        result = readdir.RESULT_OK;
      return result;
    }

    const ext = path.extname(filePath).toLowerCase();
    if (extensions.includes(ext))
      return readdir.RESULT_OK;
    return readdir.RESULT_NO;
  };
}

module.exports = {
  createMatchFunc
};
