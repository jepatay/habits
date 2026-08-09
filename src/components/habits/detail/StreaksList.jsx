export default function StreaksList({ streaks }) {
  if (!streaks.length) {
    return <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>No streaks yet.</p>;
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {streaks.map((s, idx) => (
        <div
          key={`${s.start}-${idx}`}
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}
        >
          <span style={{ color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: 6 }}>
            {s.start} → {s.end}
            {s.live && (
              <span
                title="Still going - complete today's habit to extend it"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 3,
                  fontSize: '0.62rem',
                  fontWeight: 700,
                  color: 'var(--accent)',
                  border: '1px solid var(--accent)',
                  borderRadius: 10,
                  padding: '1px 6px',
                  lineHeight: 1.4,
                }}
              >
                ● Live
              </span>
            )}
          </span>
          <span style={{ fontWeight: 700 }}>{s.length} days</span>
        </div>
      ))}
    </div>
  );
}
