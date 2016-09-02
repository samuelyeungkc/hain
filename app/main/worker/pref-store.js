'use strict';

const conf = require('../conf');
const SimpleStore = require('../shared/simple-store');

module.exports = new SimpleStore(conf.PLUGIN_PREF_DIR);
