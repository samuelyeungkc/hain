'use strict';

const util = require('../util');

describe('util.js', () => {
  describe('fuzzy', () => {

    it('matching with basename should have higher score than default matching', () => {
      const files = [
        'C:\\test\\Internet Explorer.lnk',
        'C:\\test\\Internet Explorer\\sysi.exe',
        'C:\\test\\cmd.exe'
      ];
      const results = util.fuzzy(files, 'iex', ['.exe', '.lnk', '.appref-ms']);
      expect(results[0].path).toEqual(files[0]);
    });

  });
});
