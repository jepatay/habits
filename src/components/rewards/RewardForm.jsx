import { useEffect, useState } from 'react';
import { subscribeHabits } from '../../firebase/firestore';

export default function RewardForm({ reward, users, defaultOwnerUid, onSave, onCancel }) {
  const [type, setType] = useState(reward?.type || 'milestone');
  const [name, setName] = useState(reward?.name || '');
  const [description, setDescription] = useState(reward?.description || '');
  const [rewardText, setRewardText] = useState(reward?.reward_text || '');
  const [ownerUid, setOwnerUid] = useState(reward?.owner_uid || defaultOwnerUid || users?.[0]?.id || '');
  const [habitId, setHabitId] = useState(reward?.condition?.habit_id || '');
  const [metric, setMetric] = useState(reward?.condition?.metric || 'count');
  const [target, setTarget] = useState(reward?.condition?.target ?? 1);
  const [withinDays, setWithinDays] = useState(reward?.condition?.within_days ?? '');
  const [habits, setHabits] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!ownerUid) return undefined;
    return subscribeHabits(ownerUid, setHabits);
  }, [ownerUid]);

  useEffect(() => {
    if (habits.length && !habitId) setHabitId(habits[0].id);
  }, [habits, habitId]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        type,
        name: name.trim(),
        description: description.trim(),
        reward_text: rewardText.trim(),
        owner_uid: ownerUid,
        condition:
          type === 'recurring'
            ? { habit_id: habitId }
            : {
                habit_id: habitId,
                metric,
                target: Number(target) || 0,
                within_days: withinDays === '' ? null : Number(withinDays),
              },
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor="reward-type">Type</label>
      <select id="reward-type" value={type} onChange={(e) => setType(e.target.value)}>
        <option value="milestone">Milestone - unlock once after reaching a target</option>
        <option value="recurring">Per completion - pay out every time she does it</option>
      </select>

      <label htmlFor="reward-name">Name</label>
      <input id="reward-name" type="text" value={name} onChange={(e) => setName(e.target.value)} required />

      <label htmlFor="reward-owner">For</label>
      <select id="reward-owner" value={ownerUid} onChange={(e) => setOwnerUid(e.target.value)}>
        {users.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name}
          </option>
        ))}
      </select>

      <label htmlFor="reward-habit">Habit</label>
      <select id="reward-habit" value={habitId} onChange={(e) => setHabitId(e.target.value)} required>
        {habits.map((h) => (
          <option key={h.id} value={h.id}>
            {h.name}
          </option>
        ))}
      </select>

      {type === 'milestone' && (
        <>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label htmlFor="reward-metric">Metric</label>
              <select id="reward-metric" value={metric} onChange={(e) => setMetric(e.target.value)}>
                <option value="count">Count of successes</option>
                <option value="sum">Sum of values</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label htmlFor="reward-target">Target</label>
              <input
                id="reward-target"
                type="number"
                min="1"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                required
              />
            </div>
          </div>

          <label htmlFor="reward-within">Within days (blank = all-time)</label>
          <input
            id="reward-within"
            type="number"
            min="1"
            placeholder="e.g. 365"
            value={withinDays}
            onChange={(e) => setWithinDays(e.target.value)}
          />
        </>
      )}

      <label htmlFor="reward-text">{type === 'recurring' ? 'Reward per completion' : 'Reward'}</label>
      <input
        id="reward-text"
        type="text"
        placeholder='e.g. "€20" or "new cleats"'
        value={rewardText}
        onChange={(e) => setRewardText(e.target.value)}
        required
      />

      <label htmlFor="reward-description">Description</label>
      <textarea
        id="reward-description"
        rows={2}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
        <button type="submit" className="btn" style={{ flex: 1 }} disabled={saving}>
          {saving ? 'Saving…' : reward ? 'Save changes' : 'Create reward'}
        </button>
        <button type="button" className="btn secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
