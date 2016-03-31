'use strict';

import { assert } from 'chai';
import AbstractDate from 'abstract-date';
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
      @field(String, { validators: ['filled', 'minLength(2)', 'match(/^[a-z]+$/i)'] }) name;
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
    assert.lengthOf(validity.reasons, 5);

    person = new Person({ name: '', age: 0, status: '' });
    validity = person.checkValidity();
    assert.isFalse(validity.valid);
    assert.lengthOf(validity.reasons, 5);

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

    person = new Person({ name: 'D', age: 30, status: 'alive' });
    validity = person.checkValidity();
    assert.isFalse(validity.valid);
    assert.lengthOf(validity.reasons, 1);
    assert.deepEqual(validity.reasons[0], {
      failedValidator: 'minLength(2)', path: 'name'
    });

    person = new Person({ name: 'R2D2', age: 30, status: 'alive' });
    validity = person.checkValidity();
    assert.isFalse(validity.valid);
    assert.lengthOf(validity.reasons, 1);
    assert.deepEqual(validity.reasons[0], {
      failedValidator: 'match(/^[a-z]+$/i)', path: 'name'
    });

    person = new Person({ name: 'Dupont', age: 30, status: 'alive' });
    validity = person.checkValidity();
    assert.isTrue(validity.valid);
  });

  it('should handle nested model', function() {
    class Person extends TopModel {
      @field(String) name;
    }

    class Company extends TopModel {
      @field(String) name;
      @field(Person) boss;
    }

    let company;

    company = new Company({
      name: 'Cool Ltd'
    });
    assert.isUndefined(company.boss);
    assert.deepEqual(company.serialize(), { name: 'Cool Ltd' });

    company.boss = new Person();
    assert.deepEqual(company.boss.serialize(), {});

    company.boss.name = 'John Smith';
    assert.deepEqual(company.boss.serialize(), { name: 'John Smith' });

    company.boss = { name: 'John Durand' };
    assert.deepEqual(company.boss.serialize(), { name: 'John Durand' });

    assert.deepEqual(
      company.serialize(),
      { name: 'Cool Ltd', boss: { name: 'John Durand' } }
    );

    company = new Company({
      name: 'Hype Ltd',
      boss: {
        name: 'Jaques Dupont'
      }
    });
    assert.deepEqual(
      company.serialize(),
      { name: 'Hype Ltd', boss: { name: 'Jaques Dupont' } }
    );
  });

  it('should handle custom types', function() {
    class Person extends TopModel {
      @field(String) firstName;
      @field(String) lastName;
      @field(AbstractDate) birthday;
    }

    let person = new Person({
      firstName: 'Manuel',
      lastName: 'Vila',
      birthday: '1972-09-25T00:00:00.000'
    });
    assert.instanceOf(person.birthday, AbstractDate);
    assert.deepEqual(
      person.serialize(),
      {
        firstName: 'Manuel',
        lastName: 'Vila',
        birthday: '1972-09-25T00:00:00.000'
      }
    );
    person.birthday = '1972-09-25T10:07:00.000';
    assert.instanceOf(person.birthday, AbstractDate);
    assert.equal(person.birthday.toJSON(), '1972-09-25T10:07:00.000');
    person.birthday = undefined;
    assert.isUndefined(person.birthday);

    person = new Person({ birthday: undefined });
    assert.isUndefined(person.birthday);

    person = new Person();
    assert.isUndefined(person.birthday);
  });

  it('should handle custom types inside an array', function() {
    class Calendar extends TopModel {
      @field(Array) dates;
    }

    let calendar = new Calendar({
      dates: [new AbstractDate('1972-09-25T00:00:00.000')]
    });
    assert.instanceOf(calendar.dates[0], AbstractDate);
    assert.equal(calendar.dates[0].toString(), '1972-09-25T00:00:00.000');
    assert.deepEqual(calendar.serialize(), { dates: ['1972-09-25T00:00:00.000'] });
  });

  it('should handle comparison', function() {
    class Person extends TopModel {
      @field(String) name;
    }

    class Company extends TopModel {
      @field(String) name;
      @field(Person) boss;
    }

    let company1 = new Company({
      name: 'Cool Ltd',
      boss: {
        name: 'Jaques Dupont'
      }
    });
    assert.isFalse(company1.isEqualTo(undefined));
    assert.isTrue(company1.isEqualTo(company1));

    let company2 = new Company({
      name: 'Cool Ltd',
      boss: {
        name: 'Jaques Durand'
      }
    });
    assert.isFalse(company2.isEqualTo(company1));

    company2.boss.name = 'Jaques Dupont';
    assert.isTrue(company2.isEqualTo(company1));

    assert.isTrue(company2.isEqualTo({
      name: 'Cool Ltd',
      boss: {
        name: 'Jaques Dupont'
      }
    }));
  });

  it('should handle specialization and mutation', function() {
    class Element extends TopModel {
      @field(String) id;
    }

    class Person extends Element {
      @field(String) name;
    }

    let element, element2;

    element = new Element({ id: 'abc123' });
    assert.isTrue(element instanceof Element);
    assert.isFalse(element instanceof Person);
    element.specialize(Person, true);
    assert.isTrue(element instanceof Person);
    assert.equal(element.id, 'abc123');
    assert.throws(function() {
      element.specialize(Element, true);
    });

    element = new Element({ id: 'abc123' });
    element2 = new Element({ id: 'xyz789' });
    element2.mutate(element, undefined, true);
    assert.isTrue(element2 instanceof Element);
    assert.equal(element2.id, 'abc123');

    element = new Element({ id: 'abc123' });
    let person = new Person({ id: 'xyz789', name: 'Manu' });
    element.mutate(person, undefined, true);
    assert.isTrue(element instanceof Person);
    assert.deepEqual(element.serialize(), { id: 'xyz789', name: 'Manu' });
    assert.throws(function() {
      element2 = new Element({ id: 'xyz789' });
      element.mutate(element2, undefined, true);
    });
  });
});
