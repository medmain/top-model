'use strict';

import { assert } from 'chai';
import { TopModel, field } from './src';

describe('TopModel', function() {
  it('should handle simple models', function() {
    class Person extends TopModel {
      @field(String) firstName;
      @field(String) lastName;
    }

    let person;

    person = new Person();
    assert.deepEqual(person.serialize(), {});

    person = new Person(
      { firstName: 'Jean', lastName: 'Dupont', unknownProperty: 123 }
    );
    assert.deepEqual(
      person.serialize(), { firstName: 'Jean', lastName: 'Dupont' }
    );
    person.firstName = 'Eric';
    assert.strictEqual(person.firstName, 'Eric');
  });

  it('should handle extended models', function() {
    class Person extends TopModel {
      @field(String) name;
    }

    class Hero extends Person {
      @field(String) power;
    }

    let hero = new Hero({ name: 'Manu', power: 'invisible' });
    assert.deepEqual(hero.serialize(), { name: 'Manu', power: 'invisible' });
  });

  it('should handle model mixins', function() {
    let Power = (superclass = function() {}) => class extends superclass {
      @field(String) power;
    };

    class Hero extends Power(TopModel) {
      @field(String) name;
    }

    let hero = new Hero({ name: 'Manu', power: 'fly' });
    assert.deepEqual(hero.serialize(), { name: 'Manu', power: 'fly' });
  });

  it('should handle serialization', function() {
    class Model extends TopModel {
      @field(Boolean) boolean;
      @field(Number) number;
      @field(String) string;
      @field(Array) array;
      @field(Object) object;
      @field(Date) date;
    }

    let instance = new Model({
      boolean: true,
      number: 123,
      string: 'abc',
      array: [1, 2, 3],
      object: { a: 1, b: 2 },
      date: new Date('2015-08-12T09:39:21.226Z')
    });

    assert.deepEqual(instance.serialize(), {
      boolean: true,
      number: 123,
      string: 'abc',
      array: [1, 2, 3],
      object: { a: 1, b: 2 },
      date: '2015-08-12T09:39:21.226Z'
    });

    let instance2 = Model.unserialize({
      boolean: true,
      number: 123,
      string: 'abc',
      array: [1, 2, 3],
      object: { a: 1, b: 2 },
      date: '2015-08-12T09:39:21.226Z'
    });

    assert.strictEqual(instance2.boolean, true);
    assert.strictEqual(instance2.number, 123);
    assert.strictEqual(instance2.string, 'abc');
    assert.deepEqual(instance2.array, [1, 2, 3]);
    assert.deepEqual(instance2.object, { a: 1, b: 2 });
    assert.strictEqual(instance2.date.toJSON(), '2015-08-12T09:39:21.226Z');
  });

  it('should handle property conversion', function() {
    class Person extends TopModel {
      @field(String) name;
      @field(Number) age;
      @field(Boolean) isCool;
      @field(String, { converter: (val) => val.toUpperCase() }) country;
    }

    let person = new Person({ name: 123, age: '42', isCool: 'absolutely', country: 'France' });
    assert.deepEqual(
      person.serialize(),
      { name: '123', age: 42, isCool: true, country: 'FRANCE' }
    );
  });

  it('should handle default values', function() {
    let defaultCountry = 'France';
    class Person extends TopModel {
      @field(String) name;
      @field(Boolean, { defaultValue: true }) isAlive;
      @field(String, { defaultValue: () => defaultCountry }) country;
    }

    let person;

    person = new Person({ name: 'Dupont' });
    assert.deepEqual(
      person.serialize(), { name: 'Dupont', isAlive: true, country: 'France' }
    );

    person = Person.unserialize({ name: 'Dupont' });
    assert.deepEqual(person.serialize(), { name: 'Dupont' });
  });
});
