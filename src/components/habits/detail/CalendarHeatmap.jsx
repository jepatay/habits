const STATUS_COLOR = {
  success: null, // uses habit color
  fail: 'var(--danger)',
  none: 'var(--bg-elevated)',
  unscheduled: 'transparent',
  future: 'transparent',
};

export default function CalendarHeatmap({ months, color }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {months.map((month) => (
        <div key={month.label}>
          <p style={{ margin: '0 0 8px', fontSize: '0.85rem', fontWeight: 600 }}>{month.label}</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
            {Array.from({ length: month.firstWeekday }).map((_, idx) => (
              <div key={`pad-${idx}`} />
            ))}
            {month.cells.map((cell) => (
              <div
                key={cell.date}
                title={cell.date}
                style={{
                  aspectRatio: '1',
                  borderRadius: 4,
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
