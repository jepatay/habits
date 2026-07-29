const STATUS_LABEL = {
  locked: 'Locked',
  in_progress: 'In progress',
  unlocked: 'Unlocked!',
  fulfilled: 'Fulfilled',
};

const STATUS_COLOR = {
  locked: 'var(--text-faint)',
  in_progress: 'var(--warning)',
  unlocked: 'var(--accent)',
  fulfilled: 'var(--text-dim)',
};

export default function RewardCard({ reward, habitName, current, target, isAdmin, onEdit, onFulfill, onDelete }) {
  const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;

  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ margin: 0, fontWeight: 700 }}>{reward.name}</p>
          <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--text-dim)' }}>
            {habitName ? `${habitName} · ` : ''}
            {reward.reward_text}
          </p>
        </div>
        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: STATUS_COLOR[reward.status] }}>
          {STATUS_LABEL[reward.status]}
        </span>
      </div>

      {reward.description && (
        <p style={{ margin: '8px 0 0', fontSize: '0.8rem', color: 'var(--text-dim)' }}>{reward.description}</p>
      )}

      <div style={{ marginTop: 10 }}>
        <div style={{ height: 8, borderRadius: 4, background: 'var(--bg-elevated)', overflow: 'hidden' }}>
          <div
            style={{
              width: `${pct}%`,
              height: '100%',
              background: reward.status === 'fulfilled' ? 'var(--text-faint)' : 'var(--accent)',
            }}
          />
        </div>
        <p style={{ margin: '6px 0 0', fontSize: '0.78rem', color: 'var(--text-dim)' }}>
          {current} / {target}
        </p>
      </div>

      {isAdmin && (
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button className="btn secondary" style={{ fontSize: '0.8rem', padding: '6px 10px' }} onClick={onEdit}>
            Edit
          </button>
          {reward.status === 'unlocked' && (
            <button className="btn" style={{ fontSize: '0.8rem', padding: '6px 10px' }} onClick={onFulfill}>
              Mark fulfilled
            </button>
          )}
          <button className="btn danger" style={{ fontSize: '0.8rem', padding: '6px 10px' }} onClick={onDelete}>
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
