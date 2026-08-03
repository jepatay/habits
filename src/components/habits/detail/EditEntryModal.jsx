import { useState } from 'react';
import Modal from '../../common/Modal';

export default function EditEntryModal({ habit, date, currentValue, onSave, onClear, onClose }) {
  const [numberValue, setNumberValue] = useState(currentValue != null ? String(currentValue) : '');
  const label = new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <Modal title={label} onClose={onClose}>
      {habit.type === 'measurable' ? (
        <div>
          <label htmlFor="edit-entry-value">{habit.unit ? `Value (${habit.unit})` : 'Value'}</label>
          <input
            id="edit-entry-value"
            type="number"
            autoFocus
            value={numberValue}
            onChange={(e) => setNumberValue(e.target.value)}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button
              type="button"
              className="btn"
              style={{ flex: 1 }}
              onClick={() => {
                const num = Number(numberValue);
                if (numberValue !== '' && !Number.isNaN(num)) onSave(num);
              }}
            >
              Save
            </button>
            {currentValue != null && (
              <button type="button" className="btn danger" onClick={onClear}>
                Clear
              </button>
            )}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="btn" style={{ flex: 1 }} onClick={() => onSave(true)}>
            ✓ Done
          </button>
          <button type="button" className="btn danger" style={{ flex: 1 }} onClick={() => onSave(false)}>
            ✕ Missed
          </button>
          {currentValue != null && (
            <button type="button" className="btn secondary" onClick={onClear}>
              Clear
            </button>
          )}
        </div>
      )}
    </Modal>
  );
}
