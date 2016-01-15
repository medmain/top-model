'use strict';

import util from 'util';
import EventEmitterMixin from 'event-emitter-mixin';
import { customClone } from 'better-clone';
import Field from './field';

export class TopModel extends EventEmitterMixin() {
  static unserialize(json) {
    return new (this)(json, { useDefaultValues: false });
  }

  constructor(value, options) {
    super();
    this.setValue(value, options);
    if ((options && options.useDefaultValues) !== false) {
      this.applyDefaultValues();
    }
  }

  clone() {
    return this.constructor.unserialize(this.serialize());
  }

  [customClone]() {
    return this.clone();
  }

  getField(name) {
    return this._fields && this._fields[name];
  }

  setField(name, type, options) {
    let field = new Field(name, type, options);
    if (!this.hasOwnProperty('_fields')) {
      this._fields = Object.create(this._fields || null);
    }
    this._fields[name] = field;
  }

  forEachField(fn, thisArg) {
    for (let name in this._fields) {
      let field = this._fields[name];
      fn.call(thisArg, field, name);
    }
  }

  getFieldValue(name) {
    return this._fieldValues && this._fieldValues[name];
  }

  setFieldValue(name, val, options) {
    let oldVal = this.getFieldValue(name);
    let field = this.getField(name);
    if (val != null) val = field.convertValue(val, options);
    if (val === oldVal) return false;
    if (!this.hasOwnProperty('_fieldValues')) {
      this._fieldValues = Object.create(this._fieldValues || null);
    }
    this._fieldValues[name] = val;
    return true;
  }

  setValue(value, options) {
    let hasChanged;
    this.forEachField(function(field, name) {
      let val = value && value[name];
      if (this.setFieldValue(name, val, options)) hasChanged = true;
    }, this);
    if (hasChanged) this.emit('didChange');
    return this;
  }

  applyDefaultValues() {
    this.forEachField(function(field, name) {
      let val = field.defaultValue;
      if (val == null) return;
      if (this.getFieldValue(name) != null) return;
      if (typeof val === 'function') val = val.call(this);
      if (val == null) return;
      this.setFieldValue(name, val);
    }, this);
  }

  serialize() {
    let json = {};
    this.forEachField(function(field, name) {
      let val = this.getFieldValue(name);
      if (val == null) return;
      val = field.serializeValue(val);
      json[name] = val;
    }, this);
    return json;
  }

  toJSON() {
    return this.serialize();
  }

  inspect(depth = 5) {
    let json = this.serialize();
    return util.inspect(json, { depth });
  }
}

export function field(type, options) {
  return function(target, name, descriptor) {
    target.setField(name, type, options);
    delete descriptor.initializer;
    descriptor.get = function() {
      return this.getFieldValue(name);
    };
    descriptor.set = function(val) {
      if (this.setFieldValue(name, val)) this.emit('didChange');
      return this.getFieldValue(name);
    };
  };
}

export default TopModel;
