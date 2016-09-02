'use strict';

const clipboard = require('electron').clipboard;

module.exports = class ClipboardAPI {
  readText(type) {
    return clipboard.readText(type);
  }
  writeText(text, type) {
    clipboard.writeText(text, type);
  }
  readHTML(type) {
    return clipboard.readHTML(type);
  }
  writeHTML(html, type) {
    clipboard.writeHTML(html, type);
  }
  clear(type) {
    clipboard.clear(type);
  }
};
