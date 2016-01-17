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
  }
};

function _addValidator(validator) {
  if (!validator) throw new Error('\'validator\' parameter is missing');
  if (typeof validator === 'string') {
    if (!(validator in standardValidators)) {
      throw new Error('Validator \'' + validator + '\' is unknown');
    }
    validator = standardValidators[validator];
  } else if (typeof validator !== 'function') {
    throw new Error('A validator should be a string or a function');
  }
  this.getValidators(true).push(validator);
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
