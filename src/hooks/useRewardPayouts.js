import { useEffect, useMemo, useState } from 'react';
import { subscribeRewards, subscribeRewardPayouts, subscribeHabits } from '../firebase/firestore';

// Per-completion ("recurring") rewards don't have a single unlock state like
// milestone rewards do - each qualifying entry mints its own payout record,
// which stays 'pending' until admin confirms it was actually handed over.
export function useRewardPayouts(uid) {
  const [rewards, setRewards] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [habits, setHabits] = useState([]);

  useEffect(() => {
    if (!uid) return undefined;
    return subscribeRewards(uid, setRewards);
  }, [uid]);

  useEffect(() => {
    if (!uid) return undefined;
    return subscribeRewardPayouts(uid, setPayouts);
  }, [uid]);

  useEffect(() => {
    if (!uid) return undefined;
    return subscribeHabits(uid, setHabits, { includeArchived: true });
  }, [uid]);

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
