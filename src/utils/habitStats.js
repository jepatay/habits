import { isScheduledDay, isSuccess } from './streaks';
import { parseDateKey, toDateKey, todayKey, addDays, daysBetween, daysInMonth } from './dates';

export function habitStartKey(habit, entries) {
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

  const successDates = entries
    .filter((e) => isSuccess(habit, e))
    .map((e) => e.date)
    .sort();
  const lastActiveDate = successDates[successDates.length - 1] || null;
  const daysSinceActive = lastActiveDate ? daysBetween(lastActiveDate, today) : null;

  return {
    totalCompleted: all.success,
    totalScheduled: all.scheduled,
    scorePercent: all.percent,
    monthChange: lastMonth ? thisMonth.percent - lastMonth.percent : null,
    yearChange: lastYear ? thisYear.percent - lastYear.percent : null,
    monthPercent: thisMonth.percent,
    yearPercent: thisYear.percent,
    daysSinceActive,
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

// Rolling average number of days between completions, over three trailing
// windows (or since creation, if the habit is younger than the window).
// A shorter interval means a more frequent/improving cadence, so the 30-day
// figure is compared against the 90-day one to derive a trend direction.
export function frequencyMetrics(habit, entries) {
  const start = habitStartKey(habit, entries);
  const today = todayKey();

  function windowInterval(windowDays) {
    const windowStart = addDays(today, -(windowDays - 1));
    const effectiveStart = windowStart > start ? windowStart : start;
    const spanDays = daysBetween(effectiveStart, today) + 1;
    let successCount = 0;
    for (const e of entries) {
      if (e.date >= effectiveStart && e.date <= today && isSuccess(habit, e)) successCount += 1;
    }
    if (successCount === 0) return null;
    return spanDays / successCount;
  }

  const d30 = windowInterval(30);
  const d90 = windowInterval(90);
  const d365 = windowInterval(365);

  let trend = 'flat';
  if (d30 != null && d90 != null) {
    if (d30 < d90 - 0.05) trend = 'improving';
    else if (d30 > d90 + 0.05) trend = 'declining';
  }

  return { d30, d90, d365, trend };
}

// GitHub-style contribution grid: an array of weeks (Sunday-first columns),
// each holding 7 day-cells. Defaults to the trailing `monthsBack` months (or
// since creation if younger); pass monthsBack: null for full history.
export function contributionWeeks(habit, entries, { monthsBack = 12 } = {}) {
  const byDate = new Map(entries.map((e) => [e.date, e]));
  const today = todayKey();
  const habitStart = habitStartKey(habit, entries);

  let rangeStart = habitStart;
  if (monthsBack != null) {
    const now = parseDateKey(today);
    const cutoff = toDateKey(new Date(now.getFullYear(), now.getMonth() - monthsBack, now.getDate()));
    if (cutoff > habitStart) rangeStart = cutoff;
  }

  const gridStart = addDays(rangeStart, -parseDateKey(rangeStart).getDay());

  const weeks = [];
  const monthLabels = [];
  let cursor = gridStart;
  let lastLabeledMonth = null;

  while (cursor <= today) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      const key = addDays(cursor, d);
      let status;
      if (key < habitStart) status = 'before';
      else if (key > today) status = 'future';
      else if (!isScheduledDay(habit, key)) status = 'unscheduled';
      else status = isSuccess(habit, byDate.get(key)) ? 'success' : byDate.get(key) ? 'fail' : 'none';
      week.push({ date: key, status });
    }
    const weekMonth = parseDateKey(week[0].date).getMonth();
    if (weekMonth !== lastLabeledMonth && week.some((c) => c.status !== 'before')) {
      monthLabels.push({ weekIndex: weeks.length, label: parseDateKey(week[0].date).toLocaleDateString('en-US', { month: 'short' }) });
      lastLabeledMonth = weekMonth;
    }
    weeks.push(week);
    cursor = addDays(cursor, 7);
  }

  return { weeks, monthLabels };
}
