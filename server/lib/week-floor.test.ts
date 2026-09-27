/** The weekly floor is computed twice — once in the app, once on the server — from two separate
 *  hand-written copies of the same rule (spec §4, §5). They must not drift.
 *
 *  This matters more than it looks. The server's copy decides whether a week gets reported to
 *  the witness; the app's copy decides what the person was told they owed. If they disagree,
 *  somebody's friend is messaged about a week the app said they had passed.
 *
 *  Run with a fixed TZ: the client copy reads the device's timezone, so without pinning it this
 *  suite would pass or fail depending on where the machine happens to be.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { requiredInWeek as clientFloor } from '../../src/lib/types';
import type { Plan } from '../../src/lib/types';
import { requiredInWeek as serverFloor } from './ladder';
import type { PlanRow } from './db';

const TZ = 'America/New_York';

const pair = (createdAt: string, perWeek = 3) => ({
  client: {
    id: 'p', ownerName: 'A', timezone: TZ, createdAt,
    goal: { unit: 'lb', start: 235, target: 180, wakeHour: 7, perWeek },
    routine: [], witness: { name: 'N', linked: false, inviteToken: 't' },
    weighIns: [], sessions: [], escalatedWeeks: [],
  } as unknown as Plan,
  server: {
    id: 'p', owner_name: 'A', timezone: TZ, created_at: createdAt, per_week: perWeek,
    routine: [], escalated_weeks: [],
  } as unknown as PlanRow,
});

describe('the first week is pro-rated to the mornings that were actually available', () => {
  // Created Saturday 2026-09-26: only Saturday and Sunday remain, so the floor is 2, not 3.
  it('a plan started on Saturday owes 2, not 3', () => {
    const { server } = pair('2026-09-26T15:00:00Z');
    assert.equal(serverFloor(server, '2026-09-26'), 2);
  });

  it('a plan started on Sunday owes 1', () => {
    const { server } = pair('2026-09-27T15:00:00Z');
    assert.equal(serverFloor(server, '2026-09-27'), 1);
  });

  it('a plan started on Monday owes the full floor', () => {
    const { server } = pair('2026-09-21T15:00:00Z');
    assert.equal(serverFloor(server, '2026-09-21'), 3);
  });

  it('every week after the first owes the full floor', () => {
    const { server } = pair('2026-09-26T15:00:00Z');
    assert.equal(serverFloor(server, '2026-09-28'), 3); // the following Monday
    assert.equal(serverFloor(server, '2026-10-05'), 3);
  });

  it('never demands more than the weekly floor, however much of the week is left', () => {
    const { server } = pair('2026-09-21T15:00:00Z', 3);
    assert.equal(serverFloor(server, '2026-09-21'), 3); // 7 days left, floor still 3
  });
});

describe('the app and the server agree on the floor', () => {
  const dates = [
    '2026-09-21T15:00:00Z', '2026-09-23T15:00:00Z', '2026-09-26T15:00:00Z',
    '2026-09-27T15:00:00Z', '2026-11-01T15:00:00Z', '2026-12-31T15:00:00Z',
  ];

  it('matches across creation days and evaluation days', () => {
    for (const createdAt of dates) {
      const { client, server } = pair(createdAt);
      for (const on of ['2026-09-21', '2026-09-26', '2026-09-27', '2026-09-28', '2026-11-01', '2026-12-31']) {
        assert.equal(
          clientFloor(client, on),
          serverFloor(server, on),
          `floors disagree for a plan created ${createdAt}, evaluated on ${on}`,
        );
      }
    }
  });

  it('matches when the plan was created late at night — the day-boundary case', () => {
    // 01:00 UTC is the previous evening in New York. Both halves must agree it belongs to the
    // earlier local day, or the first week is pro-rated from the wrong Monday.
    for (const createdAt of ['2026-09-28T01:00:00Z', '2026-09-27T03:30:00Z']) {
      const { client, server } = pair(createdAt);
      for (const on of ['2026-09-21', '2026-09-27', '2026-09-28']) {
        assert.equal(clientFloor(client, on), serverFloor(server, on), `${createdAt} on ${on}`);
      }
    }
  });
});

describe('the floor does not move when the person travels', () => {
  // The bug this guards: the app used to derive the creation day from the DEVICE's timezone
  // while the server used the plan's stored one. Fly from New York to Tokyo and the app would
  // show a floor of 1 for a week the server graded against 2 — so you would hit what the app
  // asked and your witness would still be told you came up short.
  const createdAt = '2026-09-27T01:00:00Z'; // Saturday 21:00 in New York

  it('agrees regardless of where the phone is', () => {
    const { client, server } = pair(createdAt);
    const expected = serverFloor(server, '2026-09-26');
    assert.equal(expected, 2, 'Saturday start leaves Saturday and Sunday');

    const original = process.env.TZ;
    try {
      for (const tz of ['America/New_York', 'Asia/Tokyo', 'Pacific/Auckland', 'UTC']) {
        process.env.TZ = tz;
        assert.equal(
          clientFloor(client, '2026-09-26'),
          expected,
          `app and server disagree with the phone in ${tz}`,
        );
      }
    } finally {
      process.env.TZ = original;
    }
  });
});
