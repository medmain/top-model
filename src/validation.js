'use strict';

import util from 'util';
import fnName from 'fn-name';

let standardValidators = {
  required(val) {
    return val != null;
  },
  filled(val) {
    return !!val;
  },
  positive(val) {
    return val > 0;
  },
  negative(val) {
    return val < 0;
  },
  minLength(min, str) {
    return str && str.length >= min;
  },
  maxLength(max, str) {
    return !str || str.length <= max;
  },
  match(regExp, str) {
    return str != null && regExp.test(str);
  }
};

const VALIDATOR_PATTERN = /([a-z]+)(?:\((.+)\))?/i;

function _addValidator(validator) {
  if (!validator) throw new Error('\'validator\' parameter is missing');
  if (typeof validator === 'string') {
    let validatorString = validator;
    let matches = validatorString.match(VALIDATOR_PATTERN);
    if (!matches) throw new Error('Validator \'' + validatorString + '\' is invalid');
    let [, name, params] = matches;
    if (!(name in standardValidators)) {
      throw new Error('Validator \'' + name + '\' is unknown');
    }
    validator = standardValidators[name];
    if (params) {
      params = _parseValidatorParams(params);
      validator = validator.bind(undefined, ...params);
      validator.displayName = validatorString;
    }
  } else if (typeof validator !== 'function') {
    throw new Error('A validator should be a string or a function');
  }
  this.getValidators(true).push(validator);
}

function _parseValidatorParams(params) {
  // TODO: handle multiple parameters
  if (params.startsWith('/')) {
    let index = params.lastIndexOf('/');
    if (index < 2) throw new Error('Invalid regular expression');
    let source = params.slice(1, index);
    let flags = params.slice(index + 1);
    return [new RegExp(source, flags)];
  } else {
    return [JSON.parse(params)];
  }
}

export let Validation = (superclass = function() {}) => class extends superclass {
  getValidators(createIfUndefined) {
    if (!this.hasOwnProperty('_validators')) {
      if (!createIfUndefined) return undefined;
      Object.defineProperty(this, '_validators', { value: [] });
    }
    return this._validators;
  }

  addValidator(validator) {
    _addValidator.call(this, validator);
  }

  checkValidity(val, path) {
    if (arguments.length < 2) path = '';
    if (arguments.length < 1) val = this;

    let reasons = [];

    let modelOrField = this;
    while (modelOrField.getValidators) {
      let validators = modelOrField.getValidators(false);
      modelOrField = Object.getPrototypeOf(modelOrField);
      if (!validators) continue;
      for (let validator of validators) {
        let validity = validator(val, path);
        if (validity == null) validity = false;
        if (validity.hasOwnProperty('valid')) {
          if (!validity.valid) {
            reasons = reasons.concat(validity.reasons);
          }
        } else if (!validity) {
          let name = fnName(validator);
          reasons.push({ failedValidator: name, path });
        }
      }
    }

    // Check field value which are a model
    if (val && val !== this && val.checkValidity) {
      let validity = val.checkValidity(val, path);
      if (!validity.valid) {
        reasons = reasons.concat(validity.reasons);
      }
    }

    if (reasons.length) {
      return { valid: false, reasons };
    } else {
      return { valid: true };
    }
  }

  validate() {
    let validity = this.checkValidity();
    if (!validity.valid) {
      let reasons = util.inspect(validity.reasons);
      throw new Error('Validation failed (reasons=' + reasons + ')');
    }
  }
};

export function validator(target, name, descriptor) {
  _addValidator.call(target, descriptor.value);
}

export default Validation;
