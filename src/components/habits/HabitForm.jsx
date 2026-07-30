import { useState } from 'react';
import ColorPicker, { HABIT_COLORS } from '../common/ColorPicker';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function HabitForm({
  habit,
  users,
  currentUid,
  isAdmin,
  onSave,
  onCancel,
  onDelete,
  onMoveUp,
  onMoveDown,
}) {
  const [name, setName] = useState(habit?.name || '');
  const [question, setQuestion] = useState(habit?.question || '');
  const [type, setType] = useState(habit?.type || 'yes_no');
  const [negative, setNegative] = useState(habit?.negative || false);
  const [targetValue, setTargetValue] = useState(habit?.target_value ?? '');
  const [unit, setUnit] = useState(habit?.unit || '');
  const [frequencyType, setFrequencyType] = useState(habit?.frequency?.type || 'daily');
  const [days, setDays] = useState(habit?.frequency?.days || [1, 2, 3, 4, 5, 6, 0]);
  const [color, setColor] = useState(habit?.color || HABIT_COLORS[0]);
  const [reminderEnabled, setReminderEnabled] = useState(habit?.reminder?.enabled || false);
  const [reminderTime, setReminderTime] = useState(habit?.reminder?.time || '08:00');
  const [notes, setNotes] = useState(habit?.notes || '');
  const [ownerUid, setOwnerUid] = useState(habit?.owner_uid || currentUid);
  const [saving, setSaving] = useState(false);

  function toggleDay(d) {
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        question: question.trim(),
        type,
        negative,
        target_value: type === 'measurable' ? Number(targetValue) || 0 : null,
        unit: type === 'measurable' ? unit.trim() : null,
        frequency: frequencyType === 'daily' ? { type: 'daily' } : { type: 'custom', days },
        color,
        reminder: { enabled: reminderEnabled, time: reminderTime },
        notes: notes.trim(),
        owner_uid: ownerUid,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor="habit-name">Name</label>
      <input id="habit-name" type="text" value={name} onChange={(e) => setName(e.target.value)} required />

      <label htmlFor="habit-question">Question / prompt</label>
      <input
        id="habit-question"
        type="text"
        placeholder='e.g. "Did you avoid negativity today?"'
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
      />

      <label htmlFor="habit-type">Type</label>
      <select id="habit-type" value={type} onChange={(e) => setType(e.target.value)}>
        <option value="yes_no">Yes / No</option>
        <option value="measurable">Measurable</option>
      </select>

      {type === 'measurable' && (
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label htmlFor="habit-target">Target value</label>
            <input
              id="habit-target"
              type="number"
              value={targetValue}
              onChange={(e) => setTargetValue(e.target.value)}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label htmlFor="habit-unit">Unit</label>
            <input id="habit-unit" type="text" placeholder="reps, km…" value={unit} onChange={(e) => setUnit(e.target.value)} />
          </div>
        </div>
      )}

      <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
        <input type="checkbox" checked={negative} onChange={(e) => setNegative(e.target.checked)} />
        <span style={{ color: 'var(--text)' }}>Negative habit (something to avoid)</span>
      </label>

      <label htmlFor="habit-frequency">Frequency</label>
      <select id="habit-frequency" value={frequencyType} onChange={(e) => setFrequencyType(e.target.value)}>
        <option value="daily">Every day</option>
        <option value="custom">Specific days</option>
      </select>

      {frequencyType === 'custom' && (
        <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
          {WEEKDAYS.map((label, idx) => (
            <button
              type="button"
              key={label}
              onClick={() => toggleDay(idx)}
              className={days.includes(idx) ? 'btn' : 'btn secondary'}
              style={{ padding: '6px 10px', fontSize: '0.8rem' }}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      <label>Color</label>
      <ColorPicker value={color} onChange={setColor} />

      <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
        <input type="checkbox" checked={reminderEnabled} onChange={(e) => setReminderEnabled(e.target.checked)} />
        <span style={{ color: 'var(--text)' }}>Daily reminder</span>
      </label>
      {reminderEnabled && (
        <input type="time" value={reminderTime} onChange={(e) => setReminderTime(e.target.value)} />
      )}

      <label htmlFor="habit-notes">Notes</label>
      <textarea id="habit-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />

      {isAdmin && users?.length > 0 && (
        <>
          <label htmlFor="habit-owner">Assign to</label>
          <select id="habit-owner" value={ownerUid} onChange={(e) => setOwnerUid(e.target.value)}>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </>
      )}

      {habit && (onMoveUp || onMoveDown) && (
        <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
          <button type="button" className="btn secondary" style={{ flex: 1 }} onClick={onMoveUp}>
            ↑ Move up
          </button>
          <button type="button" className="btn secondary" style={{ flex: 1 }} onClick={onMoveDown}>
            ↓ Move down
          </button>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
        <button type="submit" className="btn" style={{ flex: 1 }} disabled={saving}>
          {saving ? 'Saving…' : habit ? 'Save changes' : 'Create habit'}
        </button>
        <button type="button" className="btn secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
      {habit && onDelete && (
        <button
          type="button"
          className="btn danger block"
          style={{ marginTop: 10 }}
          onClick={() => onDelete(habit)}
        >
          Archive habit
        </button>
      )}
    </form>
  );
}
