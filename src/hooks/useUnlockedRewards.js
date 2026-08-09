import { useEffect, useMemo, useState } from 'react';
import { subscribeRewards, subscribeHabits, subscribeEntriesForUserInRange, subscribeEntriesInRange } from '../firebase/firestore';
import { computeRewardProgress, deriveRewardStatus } from '../utils/rewards';
import { addDays, todayKey } from '../utils/dates';

// A reward's within_days (e.g. 365) bounds how far back its progress can
// possibly need to look; DEFAULT_WINDOW_DAYS covers all-time rewards
// (within_days: null) generously without re-syncing a user's entire
// history (which, e.g. for a Loop import, can be years of entries) on
// every single page - this hook runs globally via the unlock banner.
const DEFAULT_WINDOW_DAYS = 400;

// Live, always-recomputed reward status for one user - surfaces newly unlocked
// rewards to both the member and any admin currently viewing them, without
// needing a write (rewards are admin-write-only; "fulfilled" is the only
// state that actually gets persisted).
//
// Pass { allUsers: true } (uid is ignored then) for the admin's cross-user
// view on the Rewards page - subscribes to every user's rewards/habits/entries
// at once instead of requiring a profile to be picked first.
export function useUnlockedRewards(uid, { allUsers = false } = {}) {
  const [rewards, setRewards] = useState([]);
  const [habits, setHabits] = useState([]);
  const [entries, setEntries] = useState([]);
  const active = allUsers || !!uid;

  useEffect(() => {
    if (!active) return undefined;
    return subscribeRewards(allUsers ? null : uid, setRewards);
  }, [uid, allUsers, active]);

  useEffect(() => {
    if (!active) return undefined;
    return subscribeHabits(allUsers ? null : uid, setHabits, { includeArchived: true });
  }, [uid, allUsers, active]);

  const windowDays = useMemo(
    () => Math.max(DEFAULT_WINDOW_DAYS, ...rewards.map((r) => r.condition?.within_days || 0)),
    [rewards],
  );
  const rangeEnd = todayKey();
  const rangeStart = useMemo(() => addDays(rangeEnd, -windowDays), [rangeEnd, windowDays]);

  useEffect(() => {
    if (!active) return undefined;
    return allUsers
      ? subscribeEntriesInRange(rangeStart, rangeEnd, setEntries)
      : subscribeEntriesForUserInRange(uid, rangeStart, rangeEnd, setEntries);
  }, [uid, allUsers, active, rangeStart, rangeEnd]);

  const habitsById = useMemo(() => new Map(habits.map((h) => [h.id, h])), [habits]);

  const computed = useMemo(
    () =>
      rewards
        .filter((reward) => reward.type !== 'recurring')
        .map((reward) => {
          const habit = habitsById.get(reward.condition?.habit_id);
          const { current, target } = computeRewardProgress(reward, habit, entries);
          return {
            reward,
            habit,
            current,
            target,
            status: deriveRewardStatus(reward, current, target),
          };
        }),
    [rewards, habitsById, entries],
  );

  const newlyUnlocked = computed.filter((r) => r.status === 'unlocked');

  return { rewards: computed, newlyUnlocked };
}
