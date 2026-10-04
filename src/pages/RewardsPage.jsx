import { useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useViewedUser } from '../contexts/ViewedUserContext';
import { useUnlockedRewards } from '../hooks/useUnlockedRewards';
import { useRewardPayouts } from '../hooks/useRewardPayouts';
import { createReward, updateReward, deleteReward, markPayoutPaid, markMilestoneFulfilled } from '../firebase/firestore';
import RewardCard from '../components/rewards/RewardCard';
import RecurringRewardCard from '../components/rewards/RecurringRewardCard';
import RewardForm from '../components/rewards/RewardForm';
import RewardNotifications from '../components/rewards/RewardNotifications';
import Modal from '../components/common/Modal';

const TABS = [
  { id: 'notifications', label: 'Notifications' },
  { id: 'rewards', label: 'Rewards' },
];

export default function RewardsPage() {
  const { isAdmin } = useAuth();
  const { viewedUid, users } = useViewedUser();
  // Admin sees every user's rewards at once here, no profile picker needed -
  // a member still only ever sees their own (viewedUid is always their own
  // uid for a non-admin anyway).
  const { rewards } = useUnlockedRewards(viewedUid, { allUsers: isAdmin });
  const recurringRewards = useRewardPayouts(viewedUid, { allUsers: isAdmin });
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [tab, setTab] = useState('notifications');

  const usersById = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);
  const ownerName = (uid) => (isAdmin ? usersById.get(uid)?.name : null);

  // Rewards tab = what's been set up; Notifications tab = every time one of
  // those objectives was actually met, one line each, to fulfill or fulfilled.
  // A per-completion / every-N payout is its own line; a milestone reward is
  // met at most once, so it contributes a single line once unlocked.
  const notifications = useMemo(() => {
    const nameOf = (uid) => (isAdmin ? usersById.get(uid)?.name : null);
    const fromPayouts = recurringRewards.flatMap(({ reward, habit, payouts }) =>
      payouts.map((p) => ({
        id: p.id,
        kind: 'payout',
        date: p.date,
        cycle: p.cycle,
        rewardName: reward.name || p.name,
        rewardText: p.reward_text,
        habitName: habit?.name,
        ownerName: nameOf(p.owner_uid),
        status: p.status === 'paid' ? 'fulfilled' : 'to_fulfill',
        fulfilledAt: p.paidAt,
      })),
    );
    const fromMilestones = rewards
      .filter((r) => r.status === 'unlocked' || r.status === 'fulfilled')
      .map(({ reward, habit, status }) => ({
        id: reward.id,
        kind: 'milestone',
        date: null,
        rewardName: reward.name,
        rewardText: reward.reward_text,
        habitName: habit?.name,
        ownerName: nameOf(reward.owner_uid),
        status: status === 'fulfilled' ? 'fulfilled' : 'to_fulfill',
        fulfilledAt: reward.fulfilledAt,
      }));
    // Newest first; milestones carry no earned date, so they float to the top.
    return [...fromPayouts, ...fromMilestones].sort((a, b) => (b.date || '9999').localeCompare(a.date || '9999'));
  }, [recurringRewards, rewards, usersById, isAdmin]);
  const toFulfillCount = notifications.filter((n) => n.status !== 'fulfilled').length;

  async function handleSave(data) {
    if (editing) await updateReward(editing.id, data);
    else await createReward(data);
    setShowForm(false);
    setEditing(null);
  }

  async function handleFulfill(item) {
    if (item.kind === 'milestone') await markMilestoneFulfilled(item.id);
    else await markPayoutPaid(item.id);
  }

  async function handleDelete(rewardId) {
    await deleteReward(rewardId);
  }

  return (
    <div>
      <div className="page-header">
        <h1>Rewards</h1>
        {isAdmin && tab === 'rewards' && (
          <button
            className="btn"
            onClick={() => {
              setEditing(null);
              setShowForm(true);
            }}
          >
            + Add
          </button>
        )}
      </div>

      <div className="segmented" style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`btn ${tab === t.id ? '' : 'secondary'}`}
            style={{ flex: 1, fontSize: '0.85rem', padding: '6px 10px' }}
            onClick={() => setTab(t.id)}
          >
            {t.label}
            {t.id === 'notifications' && toFulfillCount > 0 ? ` (${toFulfillCount})` : ''}
          </button>
        ))}
      </div>

      {tab === 'notifications' ? (
        <RewardNotifications items={notifications} isAdmin={isAdmin} onFulfill={handleFulfill} />
      ) : rewards.length === 0 && recurringRewards.length === 0 ? (
        <div className="empty-state">No rewards set up yet.</div>
      ) : (
        <>
          {rewards
            .sort((a, b) => b.current / (b.target || 1) - a.current / (a.target || 1))
            .map(({ reward, habit, current, target, status }) => (
              <RewardCard
                key={reward.id}
                reward={{ ...reward, status }}
                habitName={habit?.name}
                ownerName={ownerName(reward.owner_uid)}
                current={current}
                target={target}
                isAdmin={isAdmin}
                onEdit={() => {
                  setEditing(reward);
                  setShowForm(true);
                }}
                onDelete={() => handleDelete(reward.id)}
              />
            ))}

          {recurringRewards.map(({ reward, habit, payouts }) => (
            <RecurringRewardCard
              key={reward.id}
              reward={reward}
              habit={habit}
              ownerName={ownerName(reward.owner_uid)}
              payouts={payouts}
              isAdmin={isAdmin}
              onEdit={() => {
                setEditing(reward);
                setShowForm(true);
              }}
              onDelete={() => handleDelete(reward.id)}
            />
          ))}
        </>
      )}

      {showForm && (
        <Modal
          title={editing ? 'Edit reward' : 'New reward'}
          onClose={() => {
            setShowForm(false);
            setEditing(null);
          }}
        >
          <RewardForm
            reward={editing}
            users={users.length ? users : []}
            defaultOwnerUid={viewedUid}
            onSave={handleSave}
            onCancel={() => {
              setShowForm(false);
              setEditing(null);
            }}
          />
        </Modal>
      )}
    </div>
  );
}
