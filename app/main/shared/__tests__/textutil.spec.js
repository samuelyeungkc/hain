'use strict';

const lo_isString = require('lodash.isstring');
const textUtil = require('../text-util');

describe('text-util.js', () => {
  describe('sanitize', () => {
    it('shouldn\'t edit properties of textObject excluding `text`', () => {
      const txtObj = {
        singleLine: true,
        garbage: '*_*',
        text: 'Title text'
      };
      const ret = textUtil.sanitize(txtObj);
      expect(ret.singleLine).toBe(true);
      expect(ret.garbage).toBe('*_*');
    });

    it('should return string if input is string', () => {
      const ret = textUtil.sanitize('test');
      expect(lo_isString(ret)).toBeTruthy();
    });

    it('should remove unallowed tags', () => {
      const txtObj = {
        text: '<script>hahaha</script>hello'
      };
      const expected = {
        text: 'hello'
      };
      const ret = textUtil.sanitize(txtObj);
      expect(ret).toEqual(expected);
    });
  });
});
