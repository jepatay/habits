import { parseDateKey } from '../../utils/dates';

function formatDate(dateKey) {
  return parseDateKey(dateKey).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatTimestamp(ts) {
  const d = ts?.toDate?.();
  return d ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : null;
}

// One line per time an objective was met - a single reward set up on the
// Rewards tab can produce many of these (e.g. mowing once a week -> one
// notification per mow), each fulfilled on its own.
function NotificationRow({ item, isAdmin, onFulfill }) {
  const done = item.status === 'fulfilled';
  const fulfilledOn = formatTimestamp(item.fulfilledAt);

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 8,
        padding: '6px 10px',
        borderRadius: 8,
        background: 'var(--bg-elevated)',
        marginBottom: 4,
        opacity: done ? 0.7 : 1,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600 }}>
          {item.rewardName}
          {item.cycle ? ` #${item.cycle}` : ''}
          {item.ownerName && (
            <span style={{ fontWeight: 400, color: 'var(--text-faint)', fontSize: '0.75rem' }}> · {item.ownerName}</span>
          )}
        </p>
        <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: 'var(--text-dim)' }}>
          {item.date ? `${formatDate(item.date)} · ` : ''}
          {item.habitName ? `${item.habitName} · ` : ''}
          {item.rewardText}
        </p>
        {done && fulfilledOn && (
          <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: 'var(--text-faint)' }}>Fulfilled {fulfilledOn}</p>
        )}
      </div>
      {done ? (
        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
          ✓ Fulfilled
        </span>
      ) : isAdmin ? (
        <button
          className="btn"
          style={{ fontSize: '0.75rem', padding: '4px 8px', whiteSpace: 'nowrap' }}
          onClick={() => onFulfill(item)}
        >
          Mark fulfilled
        </button>
      ) : (
        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--warning)', whiteSpace: 'nowrap' }}>
          To fulfill
        </span>
      )}
    </div>
  );
}

export default function RewardNotifications({ items, isAdmin, onFulfill }) {
  if (!items.length) {
    return (
      <div className="empty-state">
        No notifications yet. Each time an objective is met, a line shows up here to fulfill.
      </div>
    );
  }

  const toFulfill = items.filter((i) => i.status !== 'fulfilled');
  const fulfilled = items.filter((i) => i.status === 'fulfilled');

  return (
    <div>
      <h3 style={{ margin: '0 0 8px', fontSize: '0.85rem', color: 'var(--text-dim)' }}>To fulfill ({toFulfill.length})</h3>
      {toFulfill.length === 0 ? (
        <p style={{ margin: '0 0 16px', fontSize: '0.8rem', color: 'var(--text-faint)' }}>All caught up.</p>
      ) : (
        toFulfill.map((item) => <NotificationRow key={item.id} item={item} isAdmin={isAdmin} onFulfill={onFulfill} />)
      )}

      {fulfilled.length > 0 && (
        <>
          <h3 style={{ margin: '16px 0 8px', fontSize: '0.85rem', color: 'var(--text-dim)' }}>
            Fulfilled ({fulfilled.length})
          </h3>
          {fulfilled.map((item) => (
            <NotificationRow key={item.id} item={item} isAdmin={isAdmin} onFulfill={onFulfill} />
          ))}
        </>
      )}
    </div>
  );
}
