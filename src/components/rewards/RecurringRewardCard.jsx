import { useEffect, useState } from 'react';
import { subscribeEntriesForHabit } from '../../firebase/firestore';
import { everyNProgress } from '../../utils/rewards';

// The reward as set up, plus progress toward the next time it's met (the
// count restarts after each). Each time it's met becomes its own line on the
// Notifications tab, which is where it gets marked fulfilled.
export default function RecurringRewardCard({ reward, habit, ownerName, payouts, isAdmin, onEdit, onDelete }) {
  const pending = payouts.filter((p) => p.status === 'pending');
  const paid = payouts.filter((p) => p.status === 'paid');
  const isEveryN = reward.type === 'every_n';
  const [entries, setEntries] = useState([]);

  useEffect(() => {
    if (!isEveryN || !reward.condition?.habit_id) return undefined;
    return subscribeEntriesForHabit(reward.condition.habit_id, reward.owner_uid, setEntries);
  }, [isEveryN, reward.condition?.habit_id, reward.owner_uid]);

  const progress = isEveryN ? everyNProgress(reward, habit, entries) : null;

  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ margin: 0, fontWeight: 700 }}>
            {reward.name}
            {ownerName && (
              <span style={{ fontWeight: 400, color: 'var(--text-faint)', fontSize: '0.75rem' }}> · {ownerName}</span>
            )}
          </p>
          <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--text-dim)' }}>
            {habit ? `${habit.name} · ` : ''}
            {isEveryN ? `${reward.reward_text} every ${reward.condition?.every} times` : `${reward.reward_text} each time`}
          </p>
        </div>
        {pending.length > 0 && (
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--warning)' }}>
            {pending.length} to fulfill
          </span>
        )}
      </div>

      {reward.description && (
        <p style={{ margin: '8px 0 0', fontSize: '0.8rem', color: 'var(--text-dim)' }}>{reward.description}</p>
      )}

      {progress && progress.every > 0 && (
        <div style={{ marginTop: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-dim)' }}>
            <span>Toward next</span>
            <span>
              {progress.towardNext} / {progress.every}
            </span>
          </div>
          <div style={{ height: 6, borderRadius: 3, background: 'var(--bg-elevated)', marginTop: 4, overflow: 'hidden' }}>
            <div
              style={{
                width: `${(progress.towardNext / progress.every) * 100}%`,
                height: '100%',
                background: 'var(--accent, #22c55e)',
              }}
            />
          </div>
        </div>
      )}

      <p style={{ margin: '10px 0 0', fontSize: '0.78rem', color: 'var(--text-dim)' }}>
        {payouts.length === 0
          ? 'Not met yet.'
          : `Met ${payouts.length} time${payouts.length === 1 ? '' : 's'} · ${paid.length} fulfilled`}
        {pending.length > 0 ? ' · see Notifications' : ''}
      </p>

      {isAdmin && (
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button className="btn secondary" style={{ fontSize: '0.8rem', padding: '6px 10px' }} onClick={onEdit}>
            Edit
          </button>
          <button className="btn danger" style={{ fontSize: '0.8rem', padding: '6px 10px' }} onClick={onDelete}>
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
