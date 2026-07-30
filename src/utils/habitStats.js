import { isScheduledDay, isSuccess } from './streaks';
import { parseDateKey, toDateKey, todayKey, addDays, daysInMonth } from './dates';

function habitStartKey(habit, entries) {
  if (habit.createdAt) {
    const d = habit.createdAt.toDate ? habit.createdAt.toDate() : new Date(habit.createdAt);
    return toDateKey(d);
  }
  const dates = entries.map((e) => e.date).sort();
  return dates[0] || todayKey();
}

function scoreForRange(habit, byDate, startKey, endKey) {
  let scheduled = 0;
  let success = 0;
  let cursor = startKey;
  while (cursor <= endKey) {
    if (isScheduledDay(habit, cursor)) {
      scheduled += 1;
      if (isSuccess(habit, byDate.get(cursor))) success += 1;
    }
    cursor = addDays(cursor, 1);
  }
  return { scheduled, success, percent: scheduled ? Math.round((success / scheduled) * 100) : 0 };
}

export function overviewStats(habit, entries) {
  const byDate = new Map(entries.map((e) => [e.date, e]));
  const start = habitStartKey(habit, entries);
  const today = todayKey();
  const all = scoreForRange(habit, byDate, start, today);

  const now = parseDateKey(today);
  const thisMonthStart = toDateKey(new Date(now.getFullYear(), now.getMonth(), 1));
  const lastMonthStart = toDateKey(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  const lastMonthEnd = addDays(thisMonthStart, -1);

  const thisMonth = scoreForRange(habit, byDate, thisMonthStart > start ? thisMonthStart : start, today);
  const lastMonth =
    lastMonthEnd >= start
      ? scoreForRange(habit, byDate, lastMonthStart > start ? lastMonthStart : start, lastMonthEnd)
      : null;

  const thisYearStart = toDateKey(new Date(now.getFullYear(), 0, 1));
  const lastYearStart = toDateKey(new Date(now.getFullYear() - 1, 0, 1));
  const lastYearEnd = addDays(thisYearStart, -1);

  const thisYear = scoreForRange(habit, byDate, thisYearStart > start ? thisYearStart : start, today);
  const lastYear =
    lastYearEnd >= start
      ? scoreForRange(habit, byDate, lastYearStart > start ? lastYearStart : start, lastYearEnd)
      : null;

  return {
    totalCompleted: all.success,
    totalScheduled: all.scheduled,
    scorePercent: all.percent,
    monthChange: lastMonth ? thisMonth.percent - lastMonth.percent : null,
    yearChange: lastYear ? thisYear.percent - lastYear.percent : null,
    monthPercent: thisMonth.percent,
    yearPercent: thisYear.percent,
  };
}

export function monthlyScoreSeries(habit, entries, months = 12) {
  const byDate = new Map(entries.map((e) => [e.date, e]));
  const start = habitStartKey(habit, entries);
  const today = parseDateKey(todayKey());
  const result = [];

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const monthStartKey = toDateKey(d);
    if (monthStartKey < start && i !== months - 1 && monthStartKey < todayKey()) {
      // still include, just may have zero scheduled days before start
    }
    const monthEndKey = toDateKey(new Date(d.getFullYear(), d.getMonth(), daysInMonth(d.getFullYear(), d.getMonth())));
    const clampedStart = monthStartKey > start ? monthStartKey : start;
    const clampedEnd = monthEndKey > todayKey() ? todayKey() : monthEndKey;
    const label = d.toLocaleDateString('en-US', { month: 'short' });
    if (clampedStart > clampedEnd) {
      result.push({ label, percent: null });
      continue;
    }
    const { percent } = scoreForRange(habit, byDate, clampedStart, clampedEnd);
    result.push({ label, percent });
  }
  return result;
}

export function quarterlyScoreSeries(habit, entries, quarters = 8) {
  const byDate = new Map(entries.map((e) => [e.date, e]));
  const start = habitStartKey(habit, entries);
  const today = parseDateKey(todayKey());
  const currentQuarterIndex = Math.floor(today.getMonth() / 3);
  const result = [];

  for (let i = quarters - 1; i >= 0; i--) {
    const totalQuarterOffset = currentQuarterIndex - i;
    const year = today.getFullYear() + Math.floor(totalQuarterOffset / 4);
    const qIdx = ((totalQuarterOffset % 4) + 4) % 4;
    const qStart = toDateKey(new Date(year, qIdx * 3, 1));
    const qEnd = toDateKey(new Date(year, qIdx * 3 + 3, 0));
    const clampedStart = qStart > start ? qStart : start;
    const clampedEnd = qEnd > todayKey() ? todayKey() : qEnd;
    const label = `Q${qIdx + 1} '${String(year).slice(2)}`;
    if (clampedStart > clampedEnd) {
      result.push({ label, percent: null });
      continue;
    }
    const { percent } = scoreForRange(habit, byDate, clampedStart, clampedEnd);
    result.push({ label, percent });
  }
  return result;
}

export function weekdayScores(habit, entries) {
  const byDate = new Map(entries.map((e) => [e.date, e]));
  const start = habitStartKey(habit, entries);
  const today = todayKey();
  const buckets = Array.from({ length: 7 }, () => ({ scheduled: 0, success: 0 }));

  let cursor = start;
  while (cursor <= today) {
    if (isScheduledDay(habit, cursor)) {
      const weekday = parseDateKey(cursor).getDay();
      buckets[weekday].scheduled += 1;
      if (isSuccess(habit, byDate.get(cursor))) buckets[weekday].success += 1;
    }
    cursor = addDays(cursor, 1);
  }

  const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return labels.map((label, idx) => ({
    label,
    percent: buckets[idx].scheduled ? Math.round((buckets[idx].success / buckets[idx].scheduled) * 100) : 0,
  }));
}

// Returns an array of month blocks, most recent last, each with a flat list
// of { date, status } cells (status: 'success' | 'fail' | 'none' | 'unscheduled').
export function calendarMonths(habit, entries, monthsBack = 6) {
  const byDate = new Map(entries.map((e) => [e.date, e]));
  const today = parseDateKey(todayKey());
  const months = [];

  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = d.getMonth();
    const numDays = daysInMonth(year, month);
    const cells = [];
    for (let day = 1; day <= numDays; day++) {
      const key = toDateKey(new Date(year, month, day));
      if (key > todayKey()) {
        cells.push({ date: key, status: 'future' });
        continue;
      }
      if (!isScheduledDay(habit, key)) {
        cells.push({ date: key, status: 'unscheduled' });
        continue;
      }
      const entry = byDate.get(key);
      cells.push({ date: key, status: isSuccess(habit, entry) ? 'success' : entry ? 'fail' : 'none' });
    }
    months.push({
      label: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      cells,
    });
  }
  return months;
}
