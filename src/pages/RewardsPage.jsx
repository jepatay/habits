import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useViewedUser } from '../contexts/ViewedUserContext';
import { useUnlockedRewards } from '../hooks/useUnlockedRewards';
import { createReward, updateReward, deleteReward } from '../firebase/firestore';
import RewardCard from '../components/rewards/RewardCard';
import RewardForm from '../components/rewards/RewardForm';
import Modal from '../components/common/Modal';

export default function RewardsPage() {
  const { isAdmin } = useAuth();
  const { viewedUid, users } = useViewedUser();
  const { rewards } = useUnlockedRewards(viewedUid);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  async function handleSave(data) {
    if (editing) await updateReward(editing.id, data);
    else await createReward(data);
    setShowForm(false);
    setEditing(null);
  }

  async function handleFulfill(rewardId) {
    await updateReward(rewardId, { status: 'fulfilled' });
  }

  async function handleDelete(rewardId) {
    await deleteReward(rewardId);
  }

  return (
    <div>
      <div className="page-header">
        <h1>Rewards</h1>
        {isAdmin && (
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

      {rewards.length === 0 ? (
        <div className="empty-state">No rewards set up yet.</div>
      ) : (
        rewards
          .sort((a, b) => b.current / (b.target || 1) - a.current / (a.target || 1))
          .map(({ reward, habit, current, target, status }) => (
            <RewardCard
              key={reward.id}
              reward={{ ...reward, status }}
              habitName={habit?.name}
              current={current}
              target={target}
              isAdmin={isAdmin}
              onEdit={() => {
                setEditing(reward);
                setShowForm(true);
              }}
              onFulfill={() => handleFulfill(reward.id)}
              onDelete={() => handleDelete(reward.id)}
            />
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
