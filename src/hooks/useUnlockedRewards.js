import { useEffect, useMemo, useState } from 'react';
import { subscribeRewards, subscribeHabits, subscribeEntriesForUserInRange } from '../firebase/firestore';
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
export function useUnlockedRewards(uid) {
  const [rewards, setRewards] = useState([]);
  const [habits, setHabits] = useState([]);
  const [entries, setEntries] = useState([]);

  useEffect(() => {
    if (!uid) return undefined;
    return subscribeRewards(uid, setRewards);
  }, [uid]);

  useEffect(() => {
    if (!uid) return undefined;
    return subscribeHabits(uid, setHabits, { includeArchived: true });
  }, [uid]);

  const windowDays = useMemo(
    () => Math.max(DEFAULT_WINDOW_DAYS, ...rewards.map((r) => r.condition?.within_days || 0)),
    [rewards],
  );
  const rangeEnd = todayKey();
  const rangeStart = useMemo(() => addDays(rangeEnd, -windowDays), [rangeEnd, windowDays]);

  useEffect(() => {
    if (!uid) return undefined;
    return subscribeEntriesForUserInRange(uid, rangeStart, rangeEnd, setEntries);
  }, [uid, rangeStart, rangeEnd]);

  const habitsById = useMemo(() => new Map(habits.map((h) => [h.id, h])), [habits]);

  const computed = useMemo(
    () =>
      rewards.map((reward) => {
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
