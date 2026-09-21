import assert from 'node:assert/strict';
import { afterEach, describe, it, mock } from 'node:test';

import { getToday, toLocalDateString } from './local-date.ts';

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function localYmd(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function utcYmd(date: Date): string {
  return date.toISOString().split('T')[0];
}

/** Asia/Kolkata (IST, UTC+5:30) — the timezone called out in the issue. */
const IST_OFFSET_MINUTES = -330;

function isAsiaKolkata(): boolean {
  return new Date().getTimezoneOffset() === IST_OFFSET_MINUTES;
}

function todaysSchedule<T extends { date: string; status: string }>(
  appointments: T[],
  today: string
): T[] {
  return appointments.filter((a) => a.date === today && a.status !== 'cancelled');
}

describe('toLocalDateString', () => {
  it('zero-pads month and day into YYYY-MM-DD', () => {
    const date = new Date(2026, 0, 5, 15, 45, 0);
    assert.equal(toLocalDateString(date), '2026-01-05');
  });

  it('uses local calendar components, not UTC', () => {
    const date = new Date(2026, 4, 21, 0, 30, 0);
    assert.equal(toLocalDateString(date), localYmd(date));
    assert.equal(toLocalDateString(date), '2026-05-21');
  });
});

describe('getToday', () => {
  afterEach(() => {
    mock.timers.reset();
  });

  it('returns the local calendar date as YYYY-MM-DD', () => {
    const now = new Date();
    assert.match(getToday(), /^\d{4}-\d{2}-\d{2}$/);
    assert.equal(getToday(now), localYmd(now));
  });

  it('matches local today and not local yesterday', () => {
    const now = new Date(2026, 4, 21, 10, 0, 0);
    const today = getToday(now);

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    assert.equal(today, '2026-05-21');
    assert.notEqual(toLocalDateString(yesterday), today);
    assert.equal(toLocalDateString(yesterday), '2026-05-20');
  });

  it('uses fake timers so getToday() follows the mocked local clock', () => {
    const frozen = new Date(2026, 4, 21, 8, 15, 0);
    mock.timers.enable({ apis: ['Date'], now: frozen });

    assert.equal(getToday(), localYmd(new Date()));
    assert.equal(getToday(), '2026-05-21');
  });

  it('keeps local today after local midnight when UTC is still yesterday (Asia/Kolkata)', {
    skip: !isAsiaKolkata(),
  }, () => {
    // 2026-05-21 00:30 IST == 2026-05-20 19:00 UTC
    const afterLocalMidnight = new Date('2026-05-20T19:00:00.000Z');
    mock.timers.enable({ apis: ['Date'], now: afterLocalMidnight });

    const now = new Date();
    assert.equal(utcYmd(now), '2026-05-20');
    assert.equal(localYmd(now), '2026-05-21');
    assert.equal(getToday(), '2026-05-21');
    assert.notEqual(getToday(), utcYmd(now));
  });

  it('stays on the previous local day just before local midnight (Asia/Kolkata)', {
    skip: !isAsiaKolkata(),
  }, () => {
    // 2026-05-20 23:30 IST == 2026-05-20 18:00 UTC
    const beforeLocalMidnight = new Date('2026-05-20T18:00:00.000Z');
    mock.timers.enable({ apis: ['Date'], now: beforeLocalMidnight });

    const now = new Date();
    assert.equal(localYmd(now), '2026-05-20');
    assert.equal(getToday(), '2026-05-20');
    assert.equal(getToday(), utcYmd(now));
  });

  it('filters Today’s Schedule by local date, excluding yesterday and cancelled', () => {
    const now = new Date(2026, 4, 21, 0, 30, 0);
    const today = getToday(now);
    const yesterday = toLocalDateString(new Date(2026, 4, 20, 23, 30, 0));

    const appointments = [
      { id: 'today-ok', date: today, status: 'confirmed' },
      { id: 'yesterday', date: yesterday, status: 'confirmed' },
      { id: 'today-cancelled', date: today, status: 'cancelled' },
    ];

    const visible = todaysSchedule(appointments, today).map((a) => a.id);
    assert.deepEqual(visible, ['today-ok']);
  });
});
