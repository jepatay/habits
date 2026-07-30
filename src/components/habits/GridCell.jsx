import { useState } from 'react';

export default function GridCell({ habit, entry, editable, size = 28, onChange }) {
  const [editingValue, setEditingValue] = useState(null);

  if (habit.type === 'measurable') {
    if (editingValue !== null) {
      return (
        <input
          type="number"
          autoFocus
          value={editingValue}
          onChange={(e) => setEditingValue(e.target.value)}
          onBlur={() => commitMeasurable()}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitMeasurable();
            if (e.key === 'Escape') setEditingValue(null);
          }}
          style={{ width: size * 1.4, padding: '4px 6px', textAlign: 'center' }}
        />
      );
    }
    const value = entry?.value;
    const hit = value != null && value >= (habit.target_value ?? 0);
    return (
      <button
        type="button"
        className="grid-cell"
        disabled={!editable}
        onClick={() => editable && setEditingValue(String(value ?? ''))}
        style={cellStyle(value != null, hit, habit.color, size)}
      >
        {value != null ? value : '—'}
      </button>
    );

    function commitMeasurable() {
      const num = editingValue === '' ? null : Number(editingValue);
      setEditingValue(null);
      if (!Number.isNaN(num)) onChange(num);
    }
  }

  // yes/no: cycle none -> success -> fail -> none
  const state = entry?.value === true ? 'success' : entry?.value === false ? 'fail' : 'none';
  const label = state === 'success' ? '✓' : state === 'fail' ? '✕' : '';

  function handleClick() {
    if (!editable) return;
    if (state === 'none') onChange(true);
    else if (state === 'success') onChange(false);
    else onChange(null);
  }

  return (
    <button
      type="button"
      className="grid-cell"
      disabled={!editable}
      onClick={handleClick}
      style={cellStyle(state !== 'none', state === 'success', habit.color, size)}
    >
      {label}
    </button>
  );
}

function cellStyle(hasValue, success, color, size) {
  return {
    width: size,
    height: size,
    borderRadius: Math.round(size * 0.2),
    border: `1px solid ${hasValue ? 'transparent' : 'var(--border)'}`,
    background: hasValue ? (success ? color : 'var(--danger)') : 'transparent',
    color: hasValue ? '#fff' : 'var(--text-faint)',
    fontWeight: 700,
    fontSize: size < 32 ? '0.62rem' : '0.9rem',
    cursor: 'pointer',
    flexShrink: 0,
    padding: 0,
  };
}
