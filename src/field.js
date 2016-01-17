'use strict';

import { cloneDeep } from 'better-clone';
import { TopModel } from './';
import { Validation } from './validation';

export class Field extends Validation() {
  constructor(name, type, options) {
    super();

    if (typeof name !== 'string' || !name) {
      throw new Error('\'name\' parameter is missing');
    }
    if (!type) {
      throw new Error('\'type\' parameter is missing');
    }

    this.name = name;
    this.type = type;
    this.convertValue = getConverter(type);
    this.serializeValue = getSerializer(type);

    if (!options) return;
    for (let key of Object.keys(options)) {
      let val = options[key];
      if (key === 'converter') this.convertValue = val;
      else if (key === 'serializer') this.serializeValue = val;
      else if (key === 'defaultValue') this.defaultValue = val;
      else if (key === 'validators') {
        if (!Array.isArray(val)) val = [val];
        val.forEach(this.addValidator, this);
      } else throw new Error('Option \'' + key + '\' is unknown');
    }
  }
}

function getConverter(type) {
  let converter;
  if (type === Boolean) {
    converter = (val) => {
      if (typeof val !== 'boolean') val = Boolean(val);
      return val;
    };
  } else if (type === Number) {
    converter = (val) => {
      if (typeof val !== 'number') val = Number(val);
      return val;
    };
  } else if (type === String) {
    converter = (val) => {
      if (typeof val !== 'string') val = String(val);
      return val;
    };
  } else if (type === Object) {
    converter = (val) => {
      return cloneDeep(val);
    };
  } else if (type === Array) {
    converter = (val) => {
      if (!Array.isArray(val)) {
        throw new Error('Type mismatch (an array was expected)');
      }
      return cloneDeep(val);
    };
  } else if (TopModel.isPrototypeOf(type)) {
    converter = (val, options) => {
      return new (type)(val, options);
    };
  } else if (typeof type === 'function') {
    converter = (val) => {
      return new (type)(val);
    };
  } else {
    throw new Error('Invalid type');
  }
  return converter;
}

function getSerializer(type) {
  let serializer;
  if (type === Object) {
    serializer = serializeObject;
  } else if (type === Array) {
    serializer = serializeArray;
  } else if (TopModel.isPrototypeOf(type)) {
    serializer = (val) => val.serialize();
  } else if (type.prototype && typeof type.prototype.toJSON === 'function') {
    serializer = (val) => val.toJSON();
  } else {
    serializer = (val) => val;
  }
  return serializer;
}

function serialize(input) {
  if (input == null) return undefined;
  let output;
  let type = typeof input;
  if (type === 'boolean' || type === 'number' || type === 'string') {
    output = input;
  } else if (input.toJSON) {
    output = input.toJSON();
  } else if (Array.isArray(input)) {
    output = serializeArray(input);
  } else {
    output = serializeObject(input);
  }
  return output;
}

function serializeObject(input) {
  let output = {};
  for (let key of Object.keys(input)) {
    let val = input[key];
    val = serialize(val);
    if (val != null) output[key] = val;
  }
  return output;
}

function serializeArray(input) {
  return input.map(serialize);
}

export default Field;
