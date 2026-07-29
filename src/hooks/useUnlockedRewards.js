import { useEffect, useMemo, useState } from 'react';
import { subscribeRewards, subscribeHabits, subscribeEntriesForUser } from '../firebase/firestore';
import { computeRewardProgress, deriveRewardStatus } from '../utils/rewards';

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

  useEffect(() => {
    if (!uid) return undefined;
    return subscribeEntriesForUser(uid, setEntries);
  }, [uid]);

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
