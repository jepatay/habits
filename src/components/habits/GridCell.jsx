import { useState } from 'react';

export default function GridCell({ habit, entry, editable, onChange }) {
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
          style={{ width: 56, padding: '4px 6px', textAlign: 'center' }}
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
        style={cellStyle(value != null, hit, habit.color)}
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
      style={cellStyle(state !== 'none', state === 'success', habit.color)}
    >
      {label}
    </button>
  );
}

function cellStyle(hasValue, success, color) {
  return {
    width: 40,
    height: 40,
    borderRadius: 8,
    border: `1px solid ${hasValue ? 'transparent' : 'var(--border)'}`,
    background: hasValue ? (success ? color : 'var(--danger)') : 'transparent',
    color: hasValue ? '#fff' : 'var(--text-faint)',
    fontWeight: 700,
    fontSize: '0.9rem',
    cursor: 'pointer',
    flexShrink: 0,
  };
}
