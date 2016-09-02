'use strict';

const lo_size = require('lodash.size');
const fs = require('fs');
const co = require('co');
const got = require('got');
const semver = require('semver');
const path = require('path');
const fileUtil = require('../../shared/file-util');

const REGISTRY_URL = 'https://registry.npmjs.org';

function req(url, opts) {
  const _opts = opts;
  return got(url, _opts);
}

function reqStream(url) {
  const opts = {};
  return got.stream(url, opts);
}

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const fileStream = fs.createWriteStream(destPath);
    fileStream.on('error', (err) => {
      reject(err);
    });
    fileStream.on('finish', () => {
      resolve();
    });
    reqStream(url).pipe(fileStream);
  });
}

function* resolvePackageVersion(packageName, versionRange) {
  const url = `${REGISTRY_URL}/${packageName}`;
  const res = yield req(url, { json: true });
  const data = res.body;

  let desired = versionRange;
  if (!semver.validRange(versionRange) && data['dist-tags']) {
    desired = data['dist-tags'][desired];
  }
  if (!semver.validRange(desired)) {
    throw 'invalid version';
  }

  let selectedVersion = null;
  const pkgVersions = data['versions']; // object
  for (const pkgVersion in pkgVersions) {
    if (!semver.satisfies(pkgVersion, desired)) {
      continue;
    }
    if (!selectedVersion || semver.gt(pkgVersion, selectedVersion)) {
      selectedVersion = pkgVersion;
    }
  }

  if (!selectedVersion) {
    throw 'unavailable';
  }
  return selectedVersion;
}

function* resolvePackageData(packageName, versionRange) {
  const version = yield* resolvePackageVersion(packageName, versionRange);
  const url = `${REGISTRY_URL}/${packageName}/${version}`;

  const res = yield req(url, { json: true });
  const data = res.body;
  return data;
}

function* downloadAndExtractPackage(packageName, versionRange, destDir, tempDir) {
  const data = yield* resolvePackageData(packageName, versionRange);
  const distUrl = data.dist.tarball;

  const filename = distUrl.split('/').pop();
  const downloadPath = path.join(tempDir, filename);
  const tempPackageDir = path.join(tempDir, 'package');

  yield downloadFile(distUrl, downloadPath);
  yield fileUtil.extractTarball(downloadPath, tempDir);
  yield fileUtil.move(tempPackageDir, destDir);

  yield fileUtil.remove(downloadPath);
}

function* installPackage(packageName, versionRange, destDir, tempDir) {
  const data = yield* resolvePackageData(packageName, versionRange);
  const incompleteDir = path.join(tempDir, '__incomplete__');

  yield fileUtil.ensureDir(tempDir);
  yield fileUtil.ensureDir(incompleteDir);

  try {
    yield* downloadAndExtractPackage(packageName, versionRange, incompleteDir, tempDir);

    if (data.dependencies && (lo_size(data.dependencies) > 0)) {
      const modulePath = path.join(incompleteDir, 'node_modules');
      yield fileUtil.ensureDir(modulePath);

      const gens = [];
      for (const depName in data.dependencies) {
        const depVersion = data.dependencies[depName];
        const depDir = path.join(modulePath, depName);
        const _tempDir = path.join(tempDir, depName);
        yield fileUtil.ensureDir(_tempDir);
        gens.push(co(installPackage(depName, depVersion, depDir, _tempDir)));
      }
      yield gens;
    }
  } catch (e) {
    console.log(e);
  }

  yield fileUtil.move(incompleteDir, destDir);
  yield fileUtil.remove(tempDir);
  return data;
}

module.exports = {
  installPackage: co.wrap(installPackage)
};
