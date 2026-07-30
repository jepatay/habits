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
import { lastNDays } from '../utils/dates';
import HabitGrid from '../components/habits/HabitGrid';
import HabitForm from '../components/habits/HabitForm';
import Modal from '../components/common/Modal';
import Spinner from '../components/common/Spinner';

const WINDOW_SIZE = 10;

function habitOrderKey(habit) {
  if (habit.order != null) return habit.order;
  return habit.createdAt?.toMillis ? habit.createdAt.toMillis() : 0;
}

export default function HabitsPage() {
  const { user, isAdmin } = useAuth();
  const { viewedUid, isViewingSelf, users } = useViewedUser();
  const [habits, setHabits] = useState(null);
  const [entries, setEntries] = useState([]);
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

  // Keeps the open edit modal's habit in sync with live updates (e.g. after
  // a move-up/move-down reorder), so a second click reorders again instead
  // of replaying a stale order value.
  useEffect(() => {
    if (!habits) return;
    setEditingHabit((prev) => (prev ? habits.find((h) => h.id === prev.id) || prev : prev));
  }, [habits]);

  // Most recent day first (leftmost) - on a narrow phone screen the columns
  // that scroll off to the right are the ones you'd otherwise never see.
  const dateKeys = useMemo(() => [...lastNDays(WINDOW_SIZE)].reverse(), []);

  const sortedHabits = useMemo(() => {
    if (!habits) return habits;
    return [...habits].sort((a, b) => habitOrderKey(a) - habitOrderKey(b));
  }, [habits]);

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
      const maxOrder = sortedHabits?.length ? Math.max(...sortedHabits.map(habitOrderKey)) : -1;
      await createHabit({ ...data, order: maxOrder + 1 });
    }
    setShowForm(false);
    setEditingHabit(null);
  }

  async function handleArchive(habit) {
    await archiveHabit(habit.id);
    setShowForm(false);
    setEditingHabit(null);
  }

  async function handleMove(habit, direction) {
    const list = sortedHabits;
    const index = list.findIndex((h) => h.id === habit.id);
    const otherIndex = index + direction;
    if (otherIndex < 0 || otherIndex >= list.length) return;
    const other = list[otherIndex];
    await Promise.all([
      updateHabit(habit.id, { order: habitOrderKey(other) }),
      updateHabit(other.id, { order: habitOrderKey(habit) }),
    ]);
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

      {sortedHabits === null ? (
        <Spinner />
      ) : sortedHabits.length === 0 ? (
        <div className="empty-state">No habits yet. {canManageHabits && 'Tap "+ Add" to create your first one.'}</div>
      ) : (
        <HabitGrid
          habits={sortedHabits}
          entriesByHabit={entriesByHabit}
          dateKeys={dateKeys}
          editable={isViewingSelf}
          canManageHabits={canManageHabits}
          onCellChange={handleCellChange}
          onEditHabit={(habit) => {
            setEditingHabit(habit);
            setShowForm(true);
          }}
        />
      )}

      {isAdmin && sortedHabits && sortedHabits.length > 0 && !isViewingSelf && (
        <p style={{ color: 'var(--text-faint)', fontSize: '0.8rem', marginTop: 12 }}>
          Viewing {users.find((u) => u.id === viewedUid)?.name}'s data (read-only).
        </p>
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
            onMoveUp={editingHabit ? () => handleMove(editingHabit, -1) : undefined}
            onMoveDown={editingHabit ? () => handleMove(editingHabit, 1) : undefined}
          />
        </Modal>
      )}
    </div>
  );
}
