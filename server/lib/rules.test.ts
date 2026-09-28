/** The rules that decide what witnesses hear. A mistake here messages somebody's friend about a
 *  week the app told them they'd passed, and no screenshot would show it. */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { PlanRow, SessionRow } from './db';
import { countsFrom, missedRun, passesLeft, reachedTarget, requiredInWeek, weekMath } from './rules';

const plan = (over: Partial<PlanRow> = {}) =>
  ({ per_week: 3, paused_from: null, paused_until: null, timezone: 'America/New_York', start_value: '200', target_value: '180', ...over }) as PlanRow;
const w = (...dates: string[]) => dates.map((date) => ({ date, value: '190' }));

// 2026-09-21 is a Monday.
describe('the plan counts from the day the first witness accepts', () => {
  it('is null while nobody has accepted', () => {
    assert.equal(countsFrom(plan(), [{ linked_at: null }]), null);
  });

  it('uses the earliest acceptance, in the plan’s timezone', () => {
    // 02:00 UTC on the 24th is still the 23rd in New York.
    assert.equal(countsFrom(plan(), [{ linked_at: '2026-09-25T15:00:00Z' }, { linked_at: '2026-09-24T02:00:00Z' }]), '2026-09-23');
  });
});

describe('the first counted week is pro-rated', () => {
  it('Saturday start owes 2, Sunday owes 1, Monday owes 3', () => {
    assert.equal(requiredInWeek(plan(), '2026-09-26', '2026-09-26'), 2);
    assert.equal(requiredInWeek(plan(), '2026-09-27', '2026-09-27'), 1);
    assert.equal(requiredInWeek(plan(), '2026-09-21', '2026-09-21'), 3);
  });

  it('every later week owes the full floor', () => {
    assert.equal(requiredInWeek(plan(), '2026-09-26', '2026-09-28'), 3);
  });
});

describe('Flow C: what the week still needs', () => {
  const start = '2026-09-14';

  it('counts what is left, including today until they weigh in', () => {
    const m = weekMath(plan(), start, w('2026-09-21'), '2026-09-23'); // Wednesday
    assert.equal(m.needed, 2);
    assert.equal(m.left, 5);
    assert.equal(m.noRoom, false);
  });

  it('says there is no room when every remaining day is needed', () => {
    // Saturday, one done, two needed, two days left (today and Sunday).
    const m = weekMath(plan(), start, w('2026-09-21'), '2026-09-26');
    assert.equal(m.noRoom, true);
    assert.equal(m.impossible, false);
  });

  it('after weighing in today, only the days after today are left', () => {
    // Saturday, weighed in today: 2 done, 1 needed, only Sunday left.
    const m = weekMath(plan(), start, w('2026-09-21', '2026-09-26'), '2026-09-26');
    assert.equal(m.needed, 1);
    assert.equal(m.noRoom, true);
  });

  it('says so when the week can no longer be met', () => {
    const m = weekMath(plan(), start, [], '2026-09-26'); // Saturday, none done
    assert.equal(m.impossible, true);
  });

  it('owes nothing before a witness accepts', () => {
    const m = weekMath(plan(), null, [], '2026-09-26');
    assert.equal(m.counting, false);
    assert.equal(m.required, 0);
    assert.equal(m.met, true);
  });

  it('a pause takes days out of the week and can cancel it', () => {
    const paused = plan({ paused_from: '2026-09-21', paused_until: '2026-09-25' }); // Mon–Fri
    assert.equal(weekMath(paused, start, [], '2026-09-26').required, 2);
    const whole = plan({ paused_from: '2026-09-21', paused_until: '2026-09-27' });
    assert.equal(weekMath(whole, start, [], '2026-09-26').required, 0);
  });
});

describe('workouts', () => {
  const s = (date: string, status: SessionRow['status'], slot = 'a') => ({ date, slot_id: slot, status }) as SessionRow;

  it('two misses in a row is a run of two', () => {
    assert.equal(missedRun([s('2026-09-21', 'done'), s('2026-09-23', 'missed'), s('2026-09-25', 'missed')]).run, 2);
  });

  it('a done workout breaks the run', () => {
    assert.equal(missedRun([s('2026-09-21', 'missed'), s('2026-09-23', 'done'), s('2026-09-25', 'missed')]).run, 1);
  });

  it('an excused workout (a pass) neither counts nor breaks it', () => {
    assert.equal(missedRun([s('2026-09-21', 'missed'), s('2026-09-23', 'excused'), s('2026-09-25', 'missed')]).run, 2);
  });
});

describe('passes and the goal', () => {
  it('two passes a calendar month', () => {
    const used = [{ created_at: '2026-09-02T10:00:00Z' }, { created_at: '2026-08-30T10:00:00Z' }];
    assert.equal(passesLeft(used, '2026-09-26'), 1);
    assert.equal(passesLeft(used, '2026-10-01'), 2);
  });

  it('reached means the seven-day average crossed the target, either direction', () => {
    const readings = [{ date: '2026-09-20', value: '181' }, { date: '2026-09-25', value: '179' }];
    assert.equal(reachedTarget(plan(), readings, '2026-09-26'), true); // average 180
    assert.equal(reachedTarget(plan({ start_value: '150', target_value: '160' }), readings, '2026-09-26'), true);
    assert.equal(reachedTarget(plan(), [{ date: '2026-09-25', value: '185' }], '2026-09-26'), false);
  });
});
