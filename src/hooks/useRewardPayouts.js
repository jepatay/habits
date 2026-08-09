import { useEffect, useMemo, useState } from 'react';
import { subscribeRewards, subscribeRewardPayouts, subscribeHabits } from '../firebase/firestore';

// Per-completion ("recurring") rewards don't have a single unlock state like
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

  const habitsById = useMemo(() => new Map(habits.map((h) => [h.id, h])), [habits]);

  return useMemo(
    () =>
      rewards
        .filter((r) => r.type === 'recurring')
        .map((reward) => ({
          reward,
          habit: habitsById.get(reward.condition?.habit_id),
          payouts: payouts
            .filter((p) => p.reward_id === reward.id)
            .sort((a, b) => b.date.localeCompare(a.date)),
        })),
    [rewards, payouts, habitsById],
  );
}
