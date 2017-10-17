'use strict';

const jsonSchemaEncoder = require('../json-schema-encoder');
const cryptoUtil = require('../crypto-util');

describe('json-schema-encoder.js', () => {
  describe('parse', () => {
    it('should parse encrypted password properties with given encryption key', () => {
      const key = 'testkey1';
      const contents = 'thisistestcontents';
      const schema = {
        type: 'object',
        properties: {
          testpass: {
            type: 'password'
          }
        }
      };
      const model = {
        testpass: cryptoUtil.encrypt(contents, key)
      };
      const options = {
        encryptionKey: key
      };
      const ret = jsonSchemaEncoder.decode(model, schema, options);
      expect(ret.testpass).toBe(contents);
    });

    it('should parse nested schema correctly', () => {
      const key = 'testkey2';
      const schema = {
        type: 'object',
        properties: {
          arr: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                testpass: {
                  type: 'password'
                }
              }
            }
          },
          obj: {
            type: 'object',
            properties: {
              nestedObj: {
                type: 'object',
                properties: {
                  testpass: {
                    type: 'password'
                  },
                  int: {
                    type: 'number'
                  },
                  str: {
                    type: 'string'
                  }
                }
              }
            }
          }
        }
      };
      const model = {
        arr: [
          {
            testpass: cryptoUtil.encrypt('0', key)
          },
          {
            testpass: cryptoUtil.encrypt('1', key)
          }
        ],
        obj: {
          nestedObj: {
            testpass: cryptoUtil.encrypt('test', key),
            int: 100,
            str: 'hello'
          }
        }
      };
      const options = {
        encryptionKey: key
      };
      const ret = jsonSchemaEncoder.decode(model, schema, options);
      expect(ret.arr[0].testpass).toBe('0');
      expect(ret.arr[1].testpass).toBe('1');
      expect(ret.obj.nestedObj.testpass).toBe('test');
      expect(ret.obj.nestedObj.int).toBe(100);
      expect(ret.obj.nestedObj.str).toBe('hello');
    });
  });

  describe('stringify', () => {
    it('should encrypt password properties with given encryption key', () => {
      const key = 'testkey3';
      const schema = {
        type: 'object',
        properties: {
          testpass: {
            type: 'password'
          }
        }
      };
      const model = {
        testpass: 'hello'
      };
      const options = {
        encryptionKey: key
      };
      const ret = jsonSchemaEncoder.encode(model, schema, options);
      expect(ret.testpass).toBe(cryptoUtil.encrypt(model.testpass, key));
    });
  });
});
