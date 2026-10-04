import { useEffect, useMemo, useState } from 'react';
import { subscribeRewards, subscribeRewardPayouts, subscribeHabits, subscribeEntriesForHabit } from '../firebase/firestore';
import { everyNProgress } from '../utils/rewards';

// Per-completion ("recurring") and every-N ("every_n") rewards don't have a single unlock state like
// milestone rewards do - each qualifying entry mints its own payout record,
// which stays 'pending' until admin confirms it was actually handed over.
//
// Pass { allUsers: true } (uid is ignored then) for the admin's cross-user
// view on the Rewards page.
export function useRewardPayouts(uid, { allUsers = false } = {}) {
  const [rewards, setRewards] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [habits, setHabits] = useState([]);
  const active = allUsers || !!uid;

  useEffect(() => {
    if (!active) return undefined;
    return subscribeRewards(allUsers ? null : uid, setRewards);
  }, [uid, allUsers, active]);

  useEffect(() => {
    if (!active) return undefined;
    return subscribeRewardPayouts(allUsers ? null : uid, setPayouts);
  }, [uid, allUsers, active]);

  useEffect(() => {
    if (!active) return undefined;
    return subscribeHabits(allUsers ? null : uid, setHabits, { includeArchived: true });
  }, [uid, allUsers, active]);

  // Every-N rewards need their habit's entries to show progress toward the
  // next payout - one listener per reward, keyed so it only resubscribes
  // when the set of every-N rewards (or their habit/owner) actually changes.
  const [entriesByReward, setEntriesByReward] = useState({});
  const everyNKey = rewards
    .filter((r) => r.type === 'every_n' && r.condition?.habit_id)
    .map((r) => `${r.id}|${r.condition.habit_id}|${r.owner_uid}`)
    .sort()
    .join(',');

  useEffect(() => {
    if (!everyNKey) return undefined;
    const unsubs = everyNKey.split(',').map((key) => {
      const [rewardId, habitId, ownerUid] = key.split('|');
      return subscribeEntriesForHabit(habitId, ownerUid, (entries) =>
        setEntriesByReward((prev) => ({ ...prev, [rewardId]: entries })),
      );
    });
    return () => unsubs.forEach((u) => u());
  }, [everyNKey]);

  const habitsById = useMemo(() => new Map(habits.map((h) => [h.id, h])), [habits]);

  return useMemo(
    () =>
      rewards
        .filter((r) => r.type === 'recurring' || r.type === 'every_n')
        .map((reward) => {
          const habit = habitsById.get(reward.condition?.habit_id);
          return {
            reward,
            habit,
            payouts: payouts
              .filter((p) => p.reward_id === reward.id)
              .sort((a, b) => b.date.localeCompare(a.date)),
            progress: reward.type === 'every_n' ? everyNProgress(reward, habit, entriesByReward[reward.id] || []) : null,
          };
        }),
    [rewards, payouts, habitsById, entriesByReward],
  );
}
