/** Dates are where this app can be wrong invisibly.
 *
 * A weigh-in belongs to the owner's local calendar day, decided by a function running in
 * Virginia for someone in Tulsa. Get it wrong by one day and the week's floor is computed
 * against the wrong set of mornings — which means someone's witness is told they went quiet
 * when they did not. No screenshot shows that. These do.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createdDate,
  daysLeftInWeek,
  minutesSince,
  shiftDate,
  weekStart,
  weekdayOf,
} from './time';

describe('weeks run Monday to Sunday', () => {
  it('names a week by its Monday', () => {
    assert.equal(weekStart('2026-09-21'), '2026-09-21'); // Monday: itself
    assert.equal(weekStart('2026-09-23'), '2026-09-21'); // Wednesday
    assert.equal(weekStart('2026-09-26'), '2026-09-21'); // Saturday
  });

  it('puts Sunday at the END of its week, not the start', () => {
    // The classic off-by-one. getUTCDay() calls Sunday 0, so a naive implementation would
    // start a fresh week on Sunday and judge a six-day week against a seven-day floor.
    assert.equal(weekStart('2026-09-27'), '2026-09-21');
    assert.equal(weekStart('2026-09-28'), '2026-09-28'); // the next Monday does start one
  });

  it('counts the days left including today', () => {
    assert.equal(daysLeftInWeek('2026-09-21'), 7); // Monday: the whole week
    assert.equal(daysLeftInWeek('2026-09-26'), 2); // Saturday: today and Sunday
    assert.equal(daysLeftInWeek('2026-09-27'), 1); // Sunday: only today
  });

  it('crosses month and year boundaries', () => {
    assert.equal(weekStart('2026-11-01'), '2026-10-26');
    assert.equal(weekStart('2026-12-31'), '2026-12-28');
  });
});

describe('shiftDate', () => {
  it('crosses months, years and leap days', () => {
    assert.equal(shiftDate('2026-12-31', 1), '2027-01-01');
    assert.equal(shiftDate('2026-03-01', -1), '2026-02-28');
    assert.equal(shiftDate('2028-02-28', 1), '2028-02-29'); // 2028 is a leap year
    assert.equal(shiftDate('2026-02-28', 1), '2026-03-01'); // 2026 is not
  });

  it('is unaffected by daylight saving', () => {
    // Built on Date.UTC on purpose: a local-time implementation would land on the same
    // calendar day when it crossed a spring-forward boundary.
    assert.equal(shiftDate('2026-03-07', 1), '2026-03-08'); // US spring forward
    assert.equal(shiftDate('2026-10-31', 1), '2026-11-01'); // US fall back
  });

  it('round-trips', () => {
    assert.equal(shiftDate(shiftDate('2026-09-23', 30), -30), '2026-09-23');
  });
});

describe('weekdayOf', () => {
  it('agrees with the calendar', () => {
    assert.equal(weekdayOf('2026-09-27'), 0); // Sunday
    assert.equal(weekdayOf('2026-09-21'), 1); // Monday
    assert.equal(weekdayOf('2026-09-26'), 6); // Saturday
  });
});

describe('createdDate resolves an instant into the owner’s calendar day', () => {
  it('is the owner’s day, not UTC’s', () => {
    // 03:00 UTC on New Year's Day is still the previous evening in New York. A plan created
    // then belongs to 2025-12-31 — its first week is pro-rated from that Wednesday.
    assert.equal(createdDate('2026-01-01T03:00:00Z', 'America/New_York'), '2025-12-31');
    // And already tomorrow in Tokyo.
    assert.equal(createdDate('2026-01-01T20:00:00Z', 'Asia/Tokyo'), '2026-01-02');
  });

  it('handles the spring-forward gap', () => {
    // US DST begins 2026-03-08 at 02:00 local (07:00 UTC). Either side lands on the right day.
    assert.equal(createdDate('2026-03-08T06:30:00Z', 'America/New_York'), '2026-03-08');
    assert.equal(createdDate('2026-03-08T04:30:00Z', 'America/New_York'), '2026-03-07');
  });

  it('handles the fall-back repeat', () => {
    // 01:30 local happens twice on 2026-11-01. Both instants are still that same local day.
    assert.equal(createdDate('2026-11-01T05:30:00Z', 'America/New_York'), '2026-11-01');
    assert.equal(createdDate('2026-11-01T06:30:00Z', 'America/New_York'), '2026-11-01');
  });
});

describe('minutesSince', () => {
  it('treats never-happened as infinitely long ago, so a first rung always fires', () => {
    assert.equal(minutesSince(null), Infinity);
  });

  it('measures elapsed minutes', () => {
    const tenAgo = new Date(Date.now() - 10 * 60_000).toISOString();
    assert.ok(Math.abs(minutesSince(tenAgo) - 10) < 0.1);
  });
});
