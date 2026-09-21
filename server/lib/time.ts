/** Everything about a plan happens in its owner's local day, not the server's. */
export function localNow(timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return { date: `${get('year')}-${get('month')}-${get('day')}`, hour: Number(get('hour')) % 24 };
}

export const shiftDate = (date: string, days: number) => {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
};

export const weekdayOf = (date: string) => {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
};

/** Weeks run Monday to Sunday; the id is the Monday. */
export function weekStart(date: string): string {
  const day = weekdayOf(date);
  return shiftDate(date, day === 0 ? -6 : 1 - day);
}

/** Days remaining in the week including `date`. */
export const daysLeftInWeek = (date: string) => {
  const day = weekdayOf(date);
  return (day === 0 ? 0 : 7 - day) + 1;
};

export const minutesSince = (iso: string | null) =>
  iso ? (Date.now() - new Date(iso).getTime()) / 60_000 : Infinity;

/** The local calendar date a plan was created on. */
export const createdDate = (createdAt: string, timeZone: string) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(createdAt));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
};
