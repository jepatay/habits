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

export function deriveRewardStatus(reward, current, target) {
  if (reward.status === 'fulfilled') return 'fulfilled';
  if (target > 0 && current >= target) return 'unlocked';
  if (current > 0) return 'in_progress';
  return 'locked';
}
