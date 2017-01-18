'use strict';

const lo_assign = require('lodash.assign');

const pkg = require('../../../package.json');
const checkForUpdate = require('./check-update');

const CONTRIBUTORS_URL = 'https://github.com/appetizermonster/hain/graphs/contributors';
const NAME = 'hain-commands';

module.exports = (context) => {
  const app = context.app;
  const toast = context.toast;
  const shell = context.shell;
  const indexer = context.indexer;

  function handleUpdate(res) {
    res.add({
      id: '__temp__',
      title: 'Checking for update...',
      icon: '#fa fa-spinner fa-spin',
      desc: NAME
    });
    checkForUpdate().then(ret => {
      res.remove('__temp__');
      if (ret.version !== pkg.version) {
        return res.add({
          id: 'goUpdate',
          payload: ret.url,
          title: `There is a new version ${ret.version}`,
          desc: 'Go download page'
        });
      }
      res.add({
        title: 'There is no update',
        desc: NAME
      });
    }, () => {
      res.remove('__temp__');
      res.add({
        title: 'Oops! Hain was unable to check for an update.',
        desc: NAME
      });
    });
  }

  function startup() {
    checkForUpdate().then(ret => {
      if (ret.version !== pkg.version) {
        toast.enqueue('New version available! Please enter `/hain update`.', 2500);
      }
    });
    registerIndexerShortcuts();
  }

  function registerIndexerShortcuts() {
    const shortcuts = [
      {
        primaryText: 'Reload Plugins',
        redirect: '/hain reload'
      },
      {
        primaryText: 'Restart Hain',
        redirect: '/hain restart'
      },
      {
        primaryText: 'About Hain',
        redirect: '/hain about'
      },
      {
        primaryText: 'Quit Hain',
        redirect: '/hain quit'
      },
      {
        primaryText: 'Open Preferences',
        redirect: '/hain preferences'
      },
      {
        primaryText: 'Check for Update',
        redirect: '/hain update'
      }
    ];
    indexer.set('shortcuts', shortcuts.map((x) => lo_assign(x, { secondaryText: x.redirect, group: 'Hain Commands' })));
  }

  function search(query, res) {
    const query_lower = query.trim().toLowerCase();
    const basicCommandResults = {
      'reload': 'Reload Plugins',
      'restart': 'Restart Hain',
      'about': `Hain v${pkg.version}`,
      'quit': 'Quit Hain',
      'preferences': 'Open Preferences'
    };

    const commandResult = basicCommandResults[query_lower];
    if (commandResult !== undefined) {
      return res.add({
        id: query_lower,
        title: commandResult,
        desc: NAME
      });
    }
    if (query_lower === 'update')
      return handleUpdate(res);
  }

  function execute(id, payload) {
    const commands = {
      'reload': () => {
        app.reloadPlugins();
      },
      'restart': () => {
        toast.enqueue('Hain will be restarted. This will take a few seconds.');
        setTimeout(() => app.restart(), 1000);
        app.setQuery('');
      },
      'quit': () => app.quit(),
      'about': () => {
        shell.openExternal(CONTRIBUTORS_URL);
        app.close(true);
      },
      'preferences': () => {
        app.openPreferences();
        app.close(true);
      },
      'goUpdate': () => {
        shell.openExternal(payload);
        app.close();
      },
      'redirect': () => app.setQuery(payload)
    };
    const func = commands[id];
    if (func !== undefined)
      func();
  }

  return { startup, search, execute };
};
