import { getDocs, collection, query, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import { createHabit, setEntry } from '../firebase/firestore';

export async function exportUserData(uid) {
  const [habitsSnap, entriesSnap, rewardsSnap] = await Promise.all([
    getDocs(query(collection(db, 'habits'), where('owner_uid', '==', uid))),
    getDocs(query(collection(db, 'entries'), where('user_id', '==', uid))),
    getDocs(query(collection(db, 'rewards'), where('owner_uid', '==', uid))),
  ]);

  const toPlain = (d) => {
    const data = d.data();
    if (data.createdAt?.toDate) data.createdAt = data.createdAt.toDate().toISOString();
    if (data.loggedAt?.toDate) data.loggedAt = data.loggedAt.toDate().toISOString();
    return { id: d.id, ...data };
  };

  return {
    exportedAt: new Date().toISOString(),
    habits: habitsSnap.docs.map(toPlain),
    entries: entriesSnap.docs.map(toPlain),
    rewards: rewardsSnap.docs.map(toPlain),
  };
}

export function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Detects our own previous export shape ({ habits, entries }) vs. an
// arbitrary flat array of records from a different app.
export function detectImportShape(data) {
  if (data && Array.isArray(data.habits) && Array.isArray(data.entries)) return 'native';
  if (Array.isArray(data)) return 'records';
  return 'unknown';
}

export function distinctFieldKeys(records) {
  const keys = new Set();
  for (const r of records.slice(0, 50)) Object.keys(r).forEach((k) => keys.add(k));
  return Array.from(keys);
}

function coerceValue(raw, valueType) {
  if (raw == null || raw === '') return null;
  if (valueType === 'boolean') {
    if (typeof raw === 'boolean') return raw;
    const s = String(raw).trim().toLowerCase();
    return ['1', 'true', 'yes', 'y', 'done', 'x'].includes(s);
  }
  const num = Number(raw);
  return Number.isNaN(num) ? null : num;
}

function coerceDateKey(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// mapping: { dateField, habitField, valueField, valueType }
// habitAssignments: { [rawHabitLabel]: { mode: 'existing'|'new', habitId?, name?, type? } }
export async function importGenericRecords(uid, records, mapping, habitAssignments) {
  const habitIdCache = {};
  let created = 0;
  let imported = 0;
  let skipped = 0;

  // Resolve/create habits first, back-dating createdAt to each habit's earliest row.
  for (const [label, assignment] of Object.entries(habitAssignments)) {
    if (assignment.mode === 'existing') {
      habitIdCache[label] = assignment.habitId;
      continue;
    }
    const rowsForLabel = records.filter((r) => String(r[mapping.habitField] ?? '') === label);
    const dateKeys = rowsForLabel.map((r) => coerceDateKey(r[mapping.dateField])).filter(Boolean).sort();
    const earliest = dateKeys[0] ? new Date(dateKeys[0]) : new Date();
    const habitId = await createHabit({
      name: assignment.name || label,
      question: '',
      type: assignment.type || 'yes_no',
      negative: false,
      target_value: assignment.type === 'measurable' ? assignment.targetValue || 0 : null,
      unit: assignment.unit || null,
      frequency: { type: 'daily' },
      color: assignment.color || '#22c55e',
      reminder: { enabled: false, time: '08:00' },
      notes: 'Imported from previous app.',
      owner_uid: uid,
      createdAt: earliest,
    });
    habitIdCache[label] = habitId;
    created += 1;
  }

  for (const record of records) {
    const label = String(record[mapping.habitField] ?? '');
    const habitId = habitIdCache[label];
    const dateKey = coerceDateKey(record[mapping.dateField]);
    const value = coerceValue(record[mapping.valueField], mapping.valueType);
    if (!habitId || !dateKey || value == null) {
      skipped += 1;
      continue;
    }
    await setEntry(habitId, uid, dateKey, value);
    imported += 1;
  }

  return { created, imported, skipped };
}

// Re-imports our own export format, remapping old habit ids to freshly
// created ones (Firestore doc ids can't be reused across a fresh import).
export async function importNativeFormat(uid, data) {
  const idMap = {};
  for (const habit of data.habits) {
    // eslint-disable-next-line no-unused-vars
    const { id, owner_uid: _owner_uid, ...rest } = habit;
    const createdAt = rest.createdAt ? new Date(rest.createdAt) : new Date();
    const newId = await createHabit({ ...rest, owner_uid: uid, createdAt });
    idMap[id] = newId;
  }

  let imported = 0;
  let skipped = 0;
  for (const entry of data.entries) {
    const newHabitId = idMap[entry.habit_id];
    if (!newHabitId || !entry.date || entry.value == null) {
      skipped += 1;
      continue;
    }
    await setEntry(newHabitId, uid, entry.date, entry.value);
    imported += 1;
  }

  return { created: data.habits.length, imported, skipped };
}
