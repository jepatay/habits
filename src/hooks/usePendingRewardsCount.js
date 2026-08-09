import { useAuth } from '../contexts/AuthContext';
import { useUnlockedRewards } from './useUnlockedRewards';
import { useRewardPayouts } from './useRewardPayouts';

// Admin-only count of reward items waiting on a confirming action: a
// milestone that's unlocked but not yet marked fulfilled, or a per-completion
// payout still pending. Stays lit until admin actually acts, not just until
// the Rewards page is opened - opening the page alone changes nothing here.
export function usePendingRewardsCount() {
  const { isAdmin } = useAuth();
  const { rewards } = useUnlockedRewards(null, { allUsers: isAdmin });
  const recurring = useRewardPayouts(null, { allUsers: isAdmin });

  if (!isAdmin) return 0;

  const unlockedMilestones = rewards.filter((r) => r.status === 'unlocked').length;
  const pendingPayouts = recurring.reduce(
    (sum, group) => sum + group.payouts.filter((p) => p.status === 'pending').length,
    0,
  );
  return unlockedMilestones + pendingPayouts;
}
