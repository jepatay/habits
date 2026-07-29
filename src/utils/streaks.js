import { parseDateKey, toDateKey, todayKey, addDays } from './dates';

export function isScheduledDay(habit, dateKey) {
  const freq = habit.frequency || { type: 'daily' };
  if (freq.type === 'daily') return true;
  const weekday = parseDateKey(dateKey).getDay();
  return (freq.days || []).includes(weekday);
}

export function isSuccess(habit, entry) {
  if (!entry) return false;
  if (habit.type === 'measurable') {
    if (entry.value == null) return false;
    return entry.value >= (habit.target_value ?? 0);
  }
  return entry.value === true;
}

// entries: array of { date, value } for a single habit
export function computeStreaks(habit, entries) {
  const byDate = new Map(entries.map((e) => [e.date, e]));

  const dateKeys = entries.map((e) => e.date);
  const habitStart = habit.createdAt
    ? toDateKey(
        habit.createdAt.toDate ? habit.createdAt.toDate() : new Date(habit.createdAt),
      )
    : dateKeys.sort()[0];

  if (!habitStart) {
    return { current: 0, best: 0, scoreTotal: 0, scoreCompleted: 0 };
  }

  const today = todayKey();
  let cursor = habitStart;
  let best = 0;
  let running = 0;
  let scheduledCount = 0;
  let successCount = 0;

  // Walk every day from habit creation to today once, tracking both the
  // best-ever run and totals for the overall completion score.
  while (cursor <= today) {
    if (isScheduledDay(habit, cursor)) {
      scheduledCount += 1;
      const success = isSuccess(habit, byDate.get(cursor));
      if (success) {
        successCount += 1;
        running += 1;
        if (running > best) best = running;
      } else {
        running = 0;
      }
    }
    cursor = addDays(cursor, 1);
  }

  // Current streak: walk backwards from today, allowing today itself to be
  // unlogged yet (still in progress) without breaking the streak.
  let current = 0;
  cursor = today;
  let skippedToday = false;
  while (cursor >= habitStart) {
    if (isScheduledDay(habit, cursor)) {
      const entry = byDate.get(cursor);
      if (cursor === today && !entry) {
        skippedToday = true;
        cursor = addDays(cursor, -1);
        continue;
      }
      if (isSuccess(habit, entry)) {
        current += 1;
      } else {
        break;
      }
    }
    cursor = addDays(cursor, -1);
  }
  void skippedToday;

  return {
    current,
    best,
    scoreTotal: scheduledCount,
    scoreCompleted: successCount,
    scorePercent: scheduledCount ? Math.round((successCount / scheduledCount) * 100) : 0,
  };
}

// Returns list of { start, end, length } for the top streaks, longest first.
export function bestStreaksList(habit, entries, limit = 5) {
  const byDate = new Map(entries.map((e) => [e.date, e]));
  const dateKeys = entries.map((e) => e.date).sort();
  if (!dateKeys.length) return [];

  const habitStart = habit.createdAt
    ? toDateKey(
        habit.createdAt.toDate ? habit.createdAt.toDate() : new Date(habit.createdAt),
      )
    : dateKeys[0];
  const today = todayKey();

  const streaks = [];
  let runStart = null;
  let runLength = 0;
  let cursor = habitStart;

  while (cursor <= today) {
    if (isScheduledDay(habit, cursor)) {
      const success = isSuccess(habit, byDate.get(cursor));
      if (success) {
        if (runStart == null) runStart = cursor;
        runLength += 1;
      } else if (runLength > 0) {
        streaks.push({ start: runStart, end: cursor, length: runLength });
        runStart = null;
        runLength = 0;
      }
    }
    cursor = addDays(cursor, 1);
  }
  if (runLength > 0) {
    streaks.push({ start: runStart, end: addDays(today, 1), length: runLength });
  }

  return streaks.sort((a, b) => b.length - a.length).slice(0, limit);
}
