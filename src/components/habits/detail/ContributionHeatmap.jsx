const STATUS_COLOR = {
  success: null, // uses habit color
  fail: 'var(--danger)',
  none: 'var(--bg-elevated)',
  unscheduled: 'transparent',
  before: 'transparent',
  future: 'transparent',
};

const NOT_EDITABLE = new Set(['unscheduled', 'before', 'future']);

const CELL = 11;
const GAP = 2;
const COL_WIDTH = CELL + GAP;

export default function ContributionHeatmap({ weeks, monthLabels, color, editable, onCellClick }) {
  const labelSpans = monthLabels.map((m, idx) => {
    const nextIndex = monthLabels[idx + 1]?.weekIndex ?? weeks.length;
    return { ...m, span: nextIndex - m.weekIndex };
  });

  return (
    <div className="hide-scrollbar" style={{ overflowX: 'auto' }}>
      <div style={{ display: 'inline-flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex' }}>
          {labelSpans.map((m) => (
            <div
              key={m.weekIndex}
              style={{ width: m.span * COL_WIDTH, fontSize: '0.62rem', color: 'var(--text-faint)' }}
            >
              {m.label}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: GAP }}>
          {weeks.map((week, wIdx) => (
            <div key={wIdx} style={{ display: 'flex', flexDirection: 'column', gap: GAP }}>
              {week.map((cell) => {
                const canEdit = editable && !NOT_EDITABLE.has(cell.status);
                return (
                  <button
                    key={cell.date}
                    type="button"
                    disabled={!canEdit}
                    onClick={() => canEdit && onCellClick(cell)}
                    title={`${cell.date}${cell.status === 'success' ? ' ✓' : cell.status === 'fail' ? ' ✕' : ''}`}
                    style={{
                      width: CELL,
                      height: CELL,
                      padding: 0,
                      borderRadius: 2,
                      background: cell.status === 'success' ? color : STATUS_COLOR[cell.status],
                      border:
                        cell.status === 'unscheduled' || cell.status === 'future' || cell.status === 'before'
                          ? '1px solid var(--border)'
                          : 'none',
                      cursor: canEdit ? 'pointer' : 'default',
                    }}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
