/** The plan's numbers are computed in code, not by the model (DATA-5). */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { suggestSteps, suggestWorkouts } from './suggest';

describe('workouts a week', () => {
  it('three to lose, four to gain', () => {
    assert.equal(suggestWorkouts({ age: 34, start_value: '210', target_value: '185' }), 3);
    assert.equal(suggestWorkouts({ age: 34, start_value: '150', target_value: '165' }), 4);
  });

  it('one fewer from 60, never under two', () => {
    assert.equal(suggestWorkouts({ age: 64, start_value: '210', target_value: '185' }), 2);
    assert.equal(suggestWorkouts({ age: 64, start_value: '150', target_value: '165' }), 3);
  });
});

describe('daily steps', () => {
  it('7,000 without a Health history', () => {
    assert.equal(suggestSteps(undefined), 7000);
    assert.equal(suggestSteps(0), 7000);
  });

  it('a little above what they already do, rounded to 500', () => {
    assert.equal(suggestSteps(6200), 7000); // 6,820 → 7,000
    assert.equal(suggestSteps(8000), 9000); // 8,800 → 9,000
  });

  it('between 5,000 and 12,000', () => {
    assert.equal(suggestSteps(2000), 5000);
    assert.equal(suggestSteps(20000), 12000);
  });
});
