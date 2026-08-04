import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useViewedUser } from '../contexts/ViewedUserContext';
import {
  subscribeHabits,
  subscribeEntriesForUserInRange,
  createHabit,
  updateHabit,
  updateHabitsOrder,
  archiveHabit,
  setEntry,
  deleteEntry,
  syncRewardPayoutsForEntry,
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

  // Most recent day first (leftmost) - on a narrow phone screen the columns
  // that scroll off to the right are the ones you'd otherwise never see.
  const dateKeys = useMemo(() => [...lastNDays(WINDOW_SIZE)].reverse(), []);
  const rangeStart = dateKeys[dateKeys.length - 1];
  const rangeEnd = dateKeys[0];

  useEffect(() => {
    if (!viewedUid) return undefined;
    setHabits(null);
    const unsub = subscribeHabits(viewedUid, setHabits);
    return unsub;
  }, [viewedUid]);

  useEffect(() => {
    if (!viewedUid) return undefined;
    return subscribeEntriesForUserInRange(viewedUid, rangeStart, rangeEnd, setEntries);
  }, [viewedUid, rangeStart, rangeEnd]);

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
    await syncRewardPayoutsForEntry(viewedUid, habit, dateKey, value);
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

  async function handleReorder(orderedHabitIds) {
    await updateHabitsOrder(orderedHabitIds);
  }

  // Everyone manages their own habits (create/edit/archive/reorder); admin
  // can additionally manage anyone's - matches the Firestore rules below.
  const canManageHabits = isAdmin || isViewingSelf;

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
          onReorder={handleReorder}
        />
      )}

      {isAdmin && sortedHabits && sortedHabits.length > 0 && !isViewingSelf && (
        <p style={{ color: 'var(--text-faint)', fontSize: '0.8rem', marginTop: 12 }}>
          Viewing {users.find((u) => u.id === viewedUid)?.name}'s habits - you can add, edit, or reorder them from
          here, but daily check-offs are hers to log.
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
          />
        </Modal>
      )}
    </div>
  );
}
