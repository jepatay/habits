const STATUS_COLOR = {
  success: null, // uses habit color
  fail: 'var(--danger)',
  none: 'var(--bg-elevated)',
  unscheduled: 'transparent',
  future: 'transparent',
};

// 16 columns fits every day of a 31-day month into 2 rows. Days are laid
// out in plain chronological order rather than aligned to weekday, which is
// what makes that fit possible - a proper calendar grid needs up to 6 rows
// to accommodate the month-start offset.
const COLUMNS = 16;

export default function CalendarHeatmap({ months, color }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {months.map((month) => (
        <div key={month.label}>
          <p style={{ margin: '0 0 4px', fontSize: '0.78rem', fontWeight: 600 }}>{month.label}</p>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${COLUMNS}, 1fr)`, gap: 2 }}>
            {month.cells.map((cell) => (
              <div
                key={cell.date}
                title={cell.date}
                style={{
                  aspectRatio: '1',
                  borderRadius: 2,
                  background: cell.status === 'success' ? color : STATUS_COLOR[cell.status],
                  border: cell.status === 'unscheduled' || cell.status === 'future' ? '1px dashed var(--border)' : 'none',
                }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
