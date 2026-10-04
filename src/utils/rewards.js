import { todayKey, addDays } from './dates';
import { isSuccess } from './streaks';

// reward.condition: { habit_id, metric: 'count' | 'sum', target, within_days (null = all-time) }

export function computeRewardProgress(reward, habit, entries) {
  const condition = reward.condition || {};
  const { metric = 'count', target = 0, within_days = null } = condition;

  let relevant = entries.filter((e) => e.habit_id === condition.habit_id);
  if (within_days) {
    const cutoff = addDays(todayKey(), -within_days);
    relevant = relevant.filter((e) => e.date >= cutoff);
  }

  let current = 0;
  if (metric === 'sum') {
    current = relevant.reduce((sum, e) => sum + (Number(e.value) || 0), 0);
  } else {
    current = habit
      ? relevant.filter((e) => isSuccess(habit, e)).length
      : relevant.filter((e) => e.value === true || Number(e.value) > 0).length;
  }

  return { current, target };
}

// Milestones repeat: once reached and fulfilled, the count restarts and
// anything over the target carries into the next round (20 done on a target
// of 15, fulfilled once -> 5/15 toward the next). fulfilled_count is how many
// rounds were handed over; older rewards only have status: 'fulfilled'.
export function milestoneFulfilledCount(reward) {
  return reward.fulfilled_count ?? (reward.status === 'fulfilled' ? 1 : 0);
}

export function milestoneRound(reward, current, target) {
  const fulfilledCount = milestoneFulfilledCount(reward);
  const remaining = Math.max(0, current - fulfilledCount * target);
  let status = 'locked';
  if (target > 0 && remaining >= target) status = 'unlocked';
  else if (remaining > 0) status = 'in_progress';
  return { fulfilledCount, toward: Math.min(remaining, target), status };
}

// "Every N" rewards: reward.condition: { habit_id, every, start_date }.
// Returns the sorted dates of qualifying successes since start_date - the
// (i*N)th one is where the i-th payout is earned.
export function everyNSuccessDates(reward, habit, entries) {
  const { habit_id, start_date = '' } = reward.condition || {};
  return entries
    .filter((e) => e.habit_id === habit_id && e.date >= start_date && isSuccess(habit, e))
    .map((e) => e.date)
    .sort();
}

export function everyNProgress(reward, habit, entries) {
  const every = Number(reward.condition?.every) || 0;
  const count = habit ? everyNSuccessDates(reward, habit, entries).length : 0;
  return { count, every, towardNext: every > 0 ? count % every : 0 };
}
