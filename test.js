'use strict';

import { assert } from 'chai';
import TopModel from './src';

describe('TopModel', function() {
  describe('constructor', function() {
    it('should create an instance', function() {
      class Person extends TopModel {

      }
      let person = new Person();
      assert(person instanceof Person);
    });
  });
});
