'use strict';

const lo_assign = require('lodash.assign');
const got = require('got');

const RANGE_ALL = '1000-01-01:3000-01-01';
const PERIOD_LAST_MONTH = 'last-month';

function _getDownloadCountForPoint(packages, period) {
  const query = packages.join(',');
  const query_enc = encodeURIComponent(query);
  const baseUrl = `http://api.npmjs.org/downloads/point/${period}/${query_enc},`
  return got(baseUrl, { json: true }).then(res => res.body);
}

function _getDownloadCountForRange(packages, range) {
  const query = packages.join(',');
  const query_enc = encodeURIComponent(query);
  const baseUrl = `http://api.npmjs.org/downloads/range/${range}/${query_enc},`
  return got(baseUrl, { json: true }).then(res => {
    const { body } = res;
    Object.keys(body).forEach(pkg => {
      body[pkg].downloads = body[pkg].downloads.reduce((sum, dl) => sum + dl.downloads, 0);
    });
    return body;
  });
}

function splitIntoChunks(arr, chunkSize) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += chunkSize) {
    const begin = i;
    const end = begin + chunkSize;
    chunks.push(arr.slice(begin, end));
  }
  return chunks;
}

function getDownloadsCount(packages, period) {
  const packageChunks = splitIntoChunks(packages, 20);
  const promises = [];
  for (const packageChunk of packageChunks) {
    let promise;
    if (! period) {
      promise = _getDownloadCountForRange(packageChunk, RANGE_ALL);
    } else {
      promise = _getDownloadCountForPoint(packageChunk, period || PERIOD_LAST_MONTH);
    }
    promises.push(promise);
  }
  return Promise.all(promises).then(results => {
    let merged = {};
    for (const ret of results) {
      merged = lo_assign(merged, ret);
    }
    return merged;
  });
}

module.exports = getDownloadsCount;
