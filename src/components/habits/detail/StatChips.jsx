const TREND_ARROW = { improving: '▲', declining: '▼', flat: '–' };
const TREND_COLOR = { improving: 'var(--accent)', declining: 'var(--danger)', flat: 'var(--text-faint)' };

function fmtDays(value) {
  return value == null ? '—' : `${value.toFixed(1)}d`;
}

export default function StatChips({ color, score, currentStreak, bestStreak, frequency }) {
  const chips = [
    { label: 'Score', value: `${score}%` },
    { label: 'Current streak', value: currentStreak },
    { label: 'Best streak', value: bestStreak },
    {
      label: 'Frequency',
      value: (
        <>
          {fmtDays(frequency.d30)}{' '}
          <span style={{ color: TREND_COLOR[frequency.trend], fontSize: '0.7rem' }}>
            {TREND_ARROW[frequency.trend]}
          </span>
        </>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
      {chips.map((chip) => (
        <div
          key={chip.label}
          style={{
            flex: '1 1 calc(50% - 6px)',
            minWidth: 100,
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderLeft: `3px solid ${color}`,
            borderRadius: 8,
            padding: '6px 10px',
          }}
        >
          <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>{chip.value}</p>
          <p style={{ margin: 0, fontSize: '0.65rem', color: 'var(--text-dim)' }}>{chip.label}</p>
        </div>
      ))}
    </div>
  );
}
