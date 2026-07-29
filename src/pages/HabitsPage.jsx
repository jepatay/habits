import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useViewedUser } from '../contexts/ViewedUserContext';
import {
  subscribeHabits,
  subscribeEntriesForUser,
  createHabit,
  updateHabit,
  archiveHabit,
  setEntry,
  deleteEntry,
} from '../firebase/firestore';
import { addDays, lastNDays, todayKey } from '../utils/dates';
import HabitGrid from '../components/habits/HabitGrid';
import HabitForm from '../components/habits/HabitForm';
import Modal from '../components/common/Modal';
import Spinner from '../components/common/Spinner';

const WINDOW_SIZE = 10;

export default function HabitsPage() {
  const { user, isAdmin } = useAuth();
  const { viewedUid, isViewingSelf, users } = useViewedUser();
  const [habits, setHabits] = useState(null);
  const [entries, setEntries] = useState([]);
  const [windowEnd, setWindowEnd] = useState(todayKey());
  const [showForm, setShowForm] = useState(false);
  const [editingHabit, setEditingHabit] = useState(null);

  useEffect(() => {
    if (!viewedUid) return undefined;
    setHabits(null);
    const unsub = subscribeHabits(viewedUid, setHabits);
    return unsub;
  }, [viewedUid]);

  useEffect(() => {
    if (!viewedUid) return undefined;
    return subscribeEntriesForUser(viewedUid, setEntries);
  }, [viewedUid]);

  const dateKeys = useMemo(() => lastNDays(WINDOW_SIZE, windowEnd), [windowEnd]);

  const entriesByHabit = useMemo(() => {
    const map = new Map();
    for (const e of entries) {
      if (!map.has(e.habit_id)) map.set(e.habit_id, new Map());
      map.get(e.habit_id).set(e.date, e);
    }
    return map;
  }, [entries]);

  async function handleCellChange(habit, dateKey, value) {
    if (value === null) {
      await deleteEntry(habit.id, viewedUid, dateKey);
    } else {
      await setEntry(habit.id, viewedUid, dateKey, value);
    }
  }

  async function handleSaveHabit(data) {
    if (editingHabit) {
      await updateHabit(editingHabit.id, data);
    } else {
      await createHabit(data);
    }
    setShowForm(false);
    setEditingHabit(null);
  }

  async function handleArchive(habit) {
    await archiveHabit(habit.id);
    setShowForm(false);
    setEditingHabit(null);
  }

  // Habits are admin-managed only (create/edit/archive); members just check
  // off entries for their own habits - matches the Firestore rules below.
  const canManageHabits = isAdmin;

  return (
    <div>
      <div className="page-header">
        <h1>Habits</h1>
        {canManageHabits && (
          <button
            className="btn"
            onClick={() => {
              setEditingHabit(null);
              setShowForm(true);
            }}
          >
            + Add
          </button>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <button className="btn ghost" onClick={() => setWindowEnd((d) => addDays(d, -WINDOW_SIZE))}>
          ← Earlier
        </button>
        <button className="btn ghost" onClick={() => setWindowEnd(todayKey())}>
          Today
        </button>
        <button
          className="btn ghost"
          disabled={windowEnd === todayKey()}
          onClick={() => setWindowEnd((d) => addDays(d, WINDOW_SIZE))}
        >
          Later →
        </button>
      </div>

      {habits === null ? (
        <Spinner />
      ) : habits.length === 0 ? (
        <div className="empty-state">No habits yet. {canManageHabits && 'Tap "+ Add" to create your first one.'}</div>
      ) : (
        <HabitGrid
          habits={habits}
          entriesByHabit={entriesByHabit}
          dateKeys={dateKeys}
          editable={isViewingSelf}
          onCellChange={handleCellChange}
        />
      )}

      {isAdmin && habits && habits.length > 0 && !isViewingSelf && (
        <p style={{ color: 'var(--text-faint)', fontSize: '0.8rem', marginTop: 12 }}>
          Viewing {users.find((u) => u.id === viewedUid)?.name}'s data (read-only).
        </p>
      )}

      {canManageHabits && habits && habits.length > 0 && (
        <div style={{ marginTop: 16 }}>
          {habits.map((h) => (
            <button
              key={h.id}
              className="btn secondary"
              style={{ marginRight: 8, marginBottom: 8, fontSize: '0.8rem', padding: '6px 10px' }}
              onClick={() => {
                setEditingHabit(h);
                setShowForm(true);
              }}
            >
              Edit "{h.name}"
            </button>
          ))}
        </div>
      )}

      {showForm && (
        <Modal
          title={editingHabit ? 'Edit habit' : 'New habit'}
          onClose={() => {
            setShowForm(false);
            setEditingHabit(null);
          }}
        >
          <HabitForm
            habit={editingHabit}
            users={users}
            currentUid={user.uid}
            isAdmin={isAdmin}
            onSave={handleSaveHabit}
            onCancel={() => {
              setShowForm(false);
              setEditingHabit(null);
            }}
            onDelete={handleArchive}
          />
        </Modal>
      )}
    </div>
  );
}
