'use strict';

import EventEmitter from 'event-emitter-mixin';
import { customClone } from 'better-clone';

@EventEmitter
export class TopModel {
  constructor() {
  }

  clone() {
    return this;
  }

  [customClone]() {
    return this.clone();
  }
}

export default TopModel;
