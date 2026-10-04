import { useState } from 'react';

// One compact line per reward as set up - tap it to see the description and
// the admin's Edit/Delete. Kept short on purpose so a phone screen fits
// 8-10 of them; each time one is met shows up on the Notifications tab.
export default function RewardRow({ item, isAdmin, onEdit, onDelete }) {
  const [open, setOpen] = useState(false);
  const { reward, habitName, ownerName, summary, current, target, toFulfill } = item;
  const pct = target > 0 ? Math.min(100, (current / target) * 100) : 0;

  return (
    <div style={{ borderTop: '1px solid var(--border)' }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          display: 'block',
          width: '100%',
          textAlign: 'left',
          background: 'none',
          border: 'none',
          color: 'inherit',
          padding: '8px 2px',
          cursor: 'pointer',
          font: 'inherit',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span
            style={{
              flex: 1,
              minWidth: 0,
              fontSize: '0.88rem',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {reward.name}
            {ownerName && <span style={{ fontWeight: 400, color: 'var(--text-faint)', fontSize: '0.72rem' }}> · {ownerName}</span>}
          </span>
          {toFulfill > 0 && (
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--warning)', whiteSpace: 'nowrap' }}>
              {toFulfill} to fulfill
            </span>
          )}
          {target > 0 && (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
              {current}/{target}
            </span>
          )}
        </div>
        <div
          style={{
            fontSize: '0.72rem',
            color: 'var(--text-dim)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {habitName ? `${habitName} · ` : ''}
          {summary}
        </div>
        {target > 0 && (
          <div style={{ height: 3, borderRadius: 2, background: 'var(--bg-elevated)', marginTop: 5, overflow: 'hidden' }}>
            <div style={{ width: `${pct}%`, height: '100%', background: 'var(--accent)' }} />
          </div>
        )}
      </button>

      {open && (
        <div style={{ padding: '0 2px 10px' }}>
          {reward.description && (
            <p style={{ margin: '0 0 8px', fontSize: '0.75rem', color: 'var(--text-dim)' }}>{reward.description}</p>
          )}
          {isAdmin && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn secondary" style={{ fontSize: '0.75rem', padding: '4px 10px' }} onClick={onEdit}>
                Edit
              </button>
              <button className="btn danger" style={{ fontSize: '0.75rem', padding: '4px 10px' }} onClick={onDelete}>
                Delete
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
