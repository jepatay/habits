// All dates are stored/compared as local YYYY-MM-DD strings, never as Timestamps,
// so streaks and calendars never shift with timezone or DST changes.

export function toDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function todayKey() {
  return toDateKey(new Date());
}

export function parseDateKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(dateKey, amount) {
  const d = parseDateKey(dateKey);
  d.setDate(d.getDate() + amount);
  return toDateKey(d);
}

export function daysBetween(startKey, endKey) {
  const start = parseDateKey(startKey);
  const end = parseDateKey(endKey);
  return Math.round((end - start) / 86400000);
}

export function lastNDays(n, endKey = todayKey()) {
  const keys = [];
  for (let i = n - 1; i >= 0; i--) keys.push(addDays(endKey, -i));
  return keys;
}

export function weekdayName(dateKey) {
  return parseDateKey(dateKey).toLocaleDateString('en-US', { weekday: 'short' });
}

export function monthLabel(dateKey) {
  return parseDateKey(dateKey).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export function quarterOf(dateKey) {
  const d = parseDateKey(dateKey);
  const q = Math.floor(d.getMonth() / 3) + 1;
  return `Q${q} ${d.getFullYear()}`;
}

export function startOfMonthKey(dateKey = todayKey()) {
  const d = parseDateKey(dateKey);
  return toDateKey(new Date(d.getFullYear(), d.getMonth(), 1));
}

export function startOfYearKey(dateKey = todayKey()) {
  const d = parseDateKey(dateKey);
  return toDateKey(new Date(d.getFullYear(), 0, 1));
}

export function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}
