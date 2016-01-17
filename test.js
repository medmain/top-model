'use strict';

import { assert } from 'chai';
import { TopModel, field, on } from './src';

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

  it('should emit didChange events', function() {
    let didChangeCount;

    class Person extends TopModel {
      @field(String) firstName;
      @field(String) lastName;
      @on didChange() {
        didChangeCount++;
      }
    }

    let person;

    didChangeCount = 0;
    person = new Person();
    assert.equal(didChangeCount, 0);

    didChangeCount = 0;
    person = new Person({ lastName: 'Dupont' });
    assert.equal(didChangeCount, 1);
    person.lastName = 'Dupont';
    assert.equal(didChangeCount, 1);
    person.lastName = 'Durand';
    assert.equal(didChangeCount, 2);
    person.setValue({ lastName: 'Dupas' });
    assert.equal(didChangeCount, 3);

    didChangeCount = 0;
    person = new Person({ firstName: 'Jean', lastName: 'Dupont' });
    assert.equal(didChangeCount, 1);
    person.firstName = 'Jean';
    assert.equal(didChangeCount, 1);
    person.firstName = 'Eric';
    assert.equal(didChangeCount, 2);
    person.setValue({ lastName: 'Durand' });
    assert.equal(didChangeCount, 3);
    person.setValue({ firstName: 'Joe', lastName: 'Dupont' });
    assert.equal(didChangeCount, 4);

    didChangeCount = 0;
    person = Person.unserialize({ firstName: 'Jean', lastName: 'Dupont' });
    assert.equal(didChangeCount, 1);
  });

  it('should handle value replacement', function() {
    class Person extends TopModel {
      @field(String) firstName;
      @field(String) lastName;
    }

    let person;

    person = new Person({ firstName: 'Jean', lastName: 'Dupont' });
    person.setValue(undefined);
    assert.deepEqual(person.serialize(), {});

    person = new Person({ firstName: 'Jean', lastName: 'Dupont' });
    person.setValue({});
    assert.deepEqual(person.serialize(), {});

    person = new Person({ firstName: 'Jean', lastName: 'Dupont' });
    person.setValue({ lastName: 'Durand' });
    assert.deepEqual(person.serialize(), { lastName: 'Durand' });
  });

  it('should handle validation', function() {
    class Person extends TopModel {
      @field(String, { validators: 'filled' }) name;
      @field(Number, { validators: 'positive' }) age;
      @field(String, {
        validators: [
          function validStatus(status) {
            return status === 'alive' || status === 'dead';
          }
        ]
      }) status;
    }

    let person, validity;

    person = new Person();
    validity = person.checkValidity();
    assert.isFalse(validity.valid);
    assert.lengthOf(validity.reasons, 3);

    person = new Person({ name: '', age: 0, status: '' });
    validity = person.checkValidity();
    assert.isFalse(validity.valid);
    assert.lengthOf(validity.reasons, 3);

    person = new Person({ name: 'Dupont', age: -3, status: 'unknown' });
    validity = person.checkValidity();
    assert.isFalse(validity.valid);
    assert.lengthOf(validity.reasons, 2);

    person = new Person({ name: 'Dupont', age: 30, status: 'unknown' });
    validity = person.checkValidity();
    assert.isFalse(validity.valid);
    assert.lengthOf(validity.reasons, 1);
    assert.deepEqual(validity.reasons[0], {
      failedValidator: 'validStatus', path: 'status'
    });

    person = new Person({ name: 'Dupont', age: 30, status: 'alive' });
    validity = person.checkValidity();
    assert.isTrue(validity.valid);
  });
});
