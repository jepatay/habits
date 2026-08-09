import { parseDateKey } from '../../utils/dates';

function formatDate(dateKey) {
  return parseDateKey(dateKey).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function RecurringRewardCard({ reward, habit, ownerName, payouts, isAdmin, onEdit, onMarkPaid, onDelete }) {
  const pending = payouts.filter((p) => p.status === 'pending');
  const paid = payouts.filter((p) => p.status === 'paid');

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
            {reward.reward_text} each time
          </p>
        </div>
        {pending.length > 0 && (
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--warning)' }}>
            {pending.length} pending
          </span>
        )}
      </div>

      {reward.description && (
        <p style={{ margin: '8px 0 0', fontSize: '0.8rem', color: 'var(--text-dim)' }}>{reward.description}</p>
      )}

      {pending.length === 0 && paid.length === 0 && (
        <p style={{ margin: '10px 0 0', fontSize: '0.8rem', color: 'var(--text-faint)' }}>No completions yet.</p>
      )}

      {pending.map((p) => (
        <div
          key={p.id}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 10,
            padding: '8px 10px',
            borderRadius: 8,
            background: 'var(--bg-elevated)',
          }}
        >
          <span style={{ fontSize: '0.82rem' }}>
            {formatDate(p.date)} · {p.reward_text}
          </span>
          {isAdmin && (
            <button className="btn" style={{ fontSize: '0.75rem', padding: '4px 8px' }} onClick={() => onMarkPaid(p.id)}>
              Mark paid
            </button>
          )}
        </div>
      ))}

      {paid.length > 0 && (
        <details style={{ marginTop: 10 }}>
          <summary style={{ fontSize: '0.78rem', color: 'var(--text-faint)', cursor: 'pointer' }}>
            {paid.length} paid
          </summary>
          {paid.map((p) => (
            <div
              key={p.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                color: 'var(--text-faint)',
                fontSize: '0.78rem',
                marginTop: 6,
              }}
            >
              <span>
                {formatDate(p.date)} · {p.reward_text}
              </span>
              <span>✓ paid</span>
            </div>
          ))}
        </details>
      )}

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
