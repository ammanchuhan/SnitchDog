import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { parseReading } from './scale';

describe('reading the model’s answer about a scale photo', () => {
  it('takes the number as written', () => {
    assert.equal(parseReading('209.4'), 209.4);
    assert.equal(parseReading(' 88.0 kg'), 88);
    assert.equal(parseReading('185'), 185);
    assert.equal(parseReading('72,5'), 72.5);
  });

  it('refuses anything that isn’t a clear reading', () => {
    assert.equal(parseReading('NONE'), null);
    assert.equal(parseReading('I think it says 209'), null);
    assert.equal(parseReading(''), null);
  });
});
