export const HABIT_COLORS = [
  '#22c55e',
  '#3b82f6',
  '#a855f7',
  '#f59e0b',
  '#ef4444',
  '#06b6d4',
  '#ec4899',
  '#84cc16',
];

export default function ColorPicker({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
      {HABIT_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          onClick={() => onChange(color)}
          aria-label={`Choose ${color}`}
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: color,
            border: value === color ? '3px solid var(--text)' : '3px solid transparent',
            cursor: 'pointer',
          }}
        />
      ))}
    </div>
  );
}
