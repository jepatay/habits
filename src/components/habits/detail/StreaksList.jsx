export default function StreaksList({ streaks }) {
  if (!streaks.length) {
    return <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>No streaks yet.</p>;
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {streaks.map((s, idx) => (
        <div key={`${s.start}-${idx}`} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
          <span style={{ color: 'var(--text-dim)' }}>
            {s.start} → {s.end}
          </span>
          <span style={{ fontWeight: 700 }}>{s.length} days</span>
        </div>
      ))}
    </div>
  );
}
