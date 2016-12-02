'use strict';

const crypto = require('crypto');

function encrypt(text, key) {
  const cipher = crypto.createCipher('aes192', key);
  let enc = cipher.update(text, 'utf8', 'hex');
  enc += cipher.final('hex');
  return enc;
}

function decrypt(encText, key) {
  const decipher = crypto.createDecipher('aes192', key);
  let dec = decipher.update(encText, 'hex', 'utf8');
  dec += decipher.final('utf8');
  return dec;
}

module.exports = { encrypt, decrypt };
