import { useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useViewedUser } from '../contexts/ViewedUserContext';
import { useUnlockedRewards } from '../hooks/useUnlockedRewards';
import { useRewardPayouts } from '../hooks/useRewardPayouts';
import { createReward, updateReward, deleteReward, markPayoutPaid, markMilestoneFulfilled } from '../firebase/firestore';
import RewardRow from '../components/rewards/RewardRow';
import RewardForm from '../components/rewards/RewardForm';
import RewardNotifications from '../components/rewards/RewardNotifications';
import Modal from '../components/common/Modal';

// Rewards tab groups each set-up reward by where it stands right now.
// Every type restarts after being met, so "Not started" covers both
// never-touched rewards and ones whose count just restarted.
const STAGES = [
  { id: 'reached', label: 'Reached - to fulfill', color: 'var(--accent)' },
  { id: 'progress', label: 'In progress', color: 'var(--warning)' },
  { id: 'pending', label: 'Not started', color: 'var(--text-dim)' },
];

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

  // Rewards tab = what's been set up; Notifications tab = every time one of
  // those objectives was actually met, one line each, to fulfill or fulfilled.
  // A per-completion / every-N payout is its own line; a milestone gets one
  // line per round reached.
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
    // Milestones restart after each round: one fulfilled line per round
    // already handed over, plus a to-fulfill line while the current round
    // is reached.
    const fromMilestones = rewards.flatMap(({ reward, habit, status, fulfilledCount }) => {
      const base = {
        kind: 'milestone',
        reward,
        date: null,
        rewardName: reward.name,
        rewardText: reward.reward_text,
        habitName: habit?.name,
        ownerName: nameOf(reward.owner_uid),
      };
      const dates = reward.fulfilled_dates || [];
      const lines = Array.from({ length: fulfilledCount }, (_, i) => ({
        ...base,
        id: `${reward.id}_${i + 1}`,
        cycle: fulfilledCount > 1 || status === 'unlocked' ? i + 1 : null,
        status: 'fulfilled',
        fulfilledAt: dates[i] || (i === 0 ? reward.fulfilledAt : null),
      }));
      if (status === 'unlocked') {
        lines.push({ ...base, id: `${reward.id}_${fulfilledCount + 1}`, cycle: fulfilledCount ? fulfilledCount + 1 : null, status: 'to_fulfill' });
      }
      return lines;
    });
    // Newest first; milestones carry no earned date, so they float to the top.
    return [...fromPayouts, ...fromMilestones].sort((a, b) => (b.date || '9999').localeCompare(a.date || '9999'));
  }, [recurringRewards, rewards, usersById, isAdmin]);
  const rewardGroups = useMemo(() => {
    const nameOf = (uid) => (isAdmin ? usersById.get(uid)?.name : null);
    const groups = { reached: [], progress: [], pending: [] };

    for (const { reward, habit, current, target, status, fulfilledCount } of rewards) {
      const within = reward.condition?.within_days;
      const met = fulfilledCount ? ` · met ${fulfilledCount}×` : '';
      groups[{ unlocked: 'reached', in_progress: 'progress', locked: 'pending' }[status]].push({
        reward,
        habitName: habit?.name,
        ownerName: nameOf(reward.owner_uid),
        summary: `${reward.reward_text} at ${target}${within ? ` in ${within} days` : ''}${met}`,
        current,
        target,
        toFulfill: status === 'unlocked' ? 1 : 0,
      });
    }

    for (const { reward, habit, payouts, progress } of recurringRewards) {
      const every = progress?.every || 1;
      const toFulfill = payouts.filter((p) => p.status === 'pending').length;
      const met = payouts.length ? ` · met ${payouts.length}×` : '';
      groups[progress && progress.towardNext > 0 ? 'progress' : 'pending'].push({
        reward,
        habitName: habit?.name,
        ownerName: nameOf(reward.owner_uid),
        summary: `${reward.reward_text} ${every > 1 ? `every ${every}` : 'each time'}${met}`,
        current: every > 1 ? progress.towardNext : 0,
        target: every > 1 ? every : 0,
        toFulfill,
      });
    }

    for (const list of Object.values(groups)) {
      list.sort((a, b) => b.current / (b.target || 1) - a.current / (a.target || 1));
    }
    return groups;
  }, [rewards, recurringRewards, usersById, isAdmin]);

  const toFulfillCount = notifications.filter((n) => n.status !== 'fulfilled').length;

  async function handleSave(data) {
    if (editing) await updateReward(editing.id, data);
    else await createReward(data);
    setShowForm(false);
    setEditing(null);
  }

  async function handleFulfill(item) {
    if (item.kind === 'milestone') await markMilestoneFulfilled(item.reward);
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

      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
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
        STAGES.filter((st) => rewardGroups[st.id].length).map((st) => (
          <div key={st.id} className="card" style={{ padding: '6px 12px 2px', marginBottom: 12 }}>
            <p
              style={{
                margin: '2px 0 6px',
                fontSize: '0.72rem',
                fontWeight: 700,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                color: st.color,
              }}
            >
              {st.label} ({rewardGroups[st.id].length})
            </p>
            {rewardGroups[st.id].map((item) => (
              <RewardRow
                key={item.reward.id}
                item={item}
                isAdmin={isAdmin}
                onEdit={() => {
                  setEditing(item.reward);
                  setShowForm(true);
                }}
                onDelete={() => handleDelete(item.reward.id)}
              />
            ))}
          </div>
        ))
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
