'use strict';

import { customClone } from 'better-clone';

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
