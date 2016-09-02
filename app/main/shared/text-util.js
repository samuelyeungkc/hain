'use strict';

const sanitizeHtml = require('sanitize-html');
const lo_isString = require('lodash.isstring');
const lo_assign = require('lodash.assign');
const lo_isPlainObject = require('lodash.isplainobject');

function _sanitizeHtml(text) {
  return sanitizeHtml(text, {
    allowedTags: ['a', 'b', 'i', 'u', 'em', 'strong', 'span'],
    allowedAttributes: {
      'a': ['href'],
      'i': ['class'],
      'span': ['class', 'style']
    }
  });
}

function sanitize(txtObj) {
  if (txtObj === undefined)
    return undefined;
  if (lo_isString(txtObj))
    return _sanitizeHtml(txtObj);
  return lo_assign(txtObj, {
    text: _sanitizeHtml(txtObj.text)
  });
}

function extractText(text) {
  if (!lo_isPlainObject(text))
    return text;
  return text.text;
}

function extractTextStyle(text, extraStyle) {
  if (!lo_isPlainObject(text))
    return lo_assign({}, extraStyle);
  const singleLineStyle = {
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  };
  let style = lo_assign({}, extraStyle);
  if (text.singleLine)
    style = lo_assign(style, singleLineStyle);
  return style;
}

module.exports = {
  sanitize,
  extractText,
  extractTextStyle
};
