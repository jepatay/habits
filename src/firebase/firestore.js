import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  writeBatch,
} from 'firebase/firestore';
import { db } from './config';

// ---- users ----

export async function getUserDoc(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function createUserDoc(uid, { name, email, role = 'member', colorTheme = '#22c55e' }) {
  await setDoc(doc(db, 'users', uid), {
    name,
    email,
    role,
    colorTheme,
    createdAt: serverTimestamp(),
  });
}

export function subscribeUsers(callback) {
  return onSnapshot(collection(db, 'users'), (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

export async function updateUserDoc(uid, data) {
  await updateDoc(doc(db, 'users', uid), data);
}

export async function addPushToken(uid, token) {
  await updateDoc(doc(db, 'users', uid), { pushTokens: arrayUnion(token) });
}

export async function removePushToken(uid, token) {
  await updateDoc(doc(db, 'users', uid), { pushTokens: arrayRemove(token) });
}

// ---- habits ----

export function subscribeHabits(uid, callback, { includeArchived = false } = {}) {
  const q = uid
    ? query(collection(db, 'habits'), where('owner_uid', '==', uid))
    : collection(db, 'habits');
  return onSnapshot(q, (snap) => {
    let habits = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    if (!includeArchived) habits = habits.filter((h) => !h.archived);
    callback(habits);
  });
}

export async function getHabit(habitId) {
  const snap = await getDoc(doc(db, 'habits', habitId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function createHabit(habit) {
  // Imports back-date createdAt to the earliest historical entry so streak/stat
  // calculations (which treat createdAt as the walk start) still cover that history.
  const { createdAt, archived, ...rest } = habit;
  const ref = await addDoc(collection(db, 'habits'), {
    ...rest,
    archived: archived ?? false,
    createdAt: createdAt instanceof Date ? createdAt : serverTimestamp(),
  });
  return ref.id;
}

export async function updateHabit(habitId, data) {
  await updateDoc(doc(db, 'habits', habitId), data);
}

export async function archiveHabit(habitId) {
  await updateDoc(doc(db, 'habits', habitId), { archived: true });
}

export async function deleteHabit(habitId) {
  await deleteDoc(doc(db, 'habits', habitId));
}

// Rewrites every habit's order to its index in the given array, all in one
// batch. Reassigning everyone's order (rather than swapping just two values)
// keeps things consistent even for habits that never had an explicit order
// before (e.g. anything created prior to drag-to-reorder existing).
export async function updateHabitsOrder(orderedHabitIds) {
  const batch = writeBatch(db);
  orderedHabitIds.forEach((habitId, index) => {
    batch.update(doc(db, 'habits', habitId), { order: index });
  });
  await batch.commit();
}

// ---- entries ----

function entryDocId(habitId, userId, date) {
  return `${habitId}_${userId}_${date}`;
}

export function subscribeEntriesForUser(userId, callback) {
  const q = query(collection(db, 'entries'), where('user_id', '==', userId));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

export function subscribeEntriesForHabit(habitId, userId, callback) {
  const q = query(
    collection(db, 'entries'),
    where('habit_id', '==', habitId),
    where('user_id', '==', userId),
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

export async function setEntry(habitId, userId, date, value) {
  const id = entryDocId(habitId, userId, date);
  await setDoc(doc(db, 'entries', id), {
    habit_id: habitId,
    user_id: userId,
    date,
    value,
    loggedAt: serverTimestamp(),
  });
}

// Bulk imports can mean thousands of entries - writing them one at a time
// (a round trip each) is impractically slow. Firestore batches cap at 500
// operations, so this chunks just under that and commits in parallel.
export async function setEntriesBatch(userId, entries) {
  const CHUNK_SIZE = 450;
  const chunks = [];
  for (let i = 0; i < entries.length; i += CHUNK_SIZE) chunks.push(entries.slice(i, i + CHUNK_SIZE));

  await Promise.all(
    chunks.map((chunk) => {
      const batch = writeBatch(db);
      for (const { habitId, date, value } of chunk) {
        const id = entryDocId(habitId, userId, date);
        batch.set(doc(db, 'entries', id), {
          habit_id: habitId,
          user_id: userId,
          date,
          value,
          loggedAt: serverTimestamp(),
        });
      }
      return batch.commit();
    }),
  );
}

export async function deleteEntry(habitId, userId, date) {
  const id = entryDocId(habitId, userId, date);
  await deleteDoc(doc(db, 'entries', id));
}

export async function getAllEntriesForUser(userId) {
  const q = query(collection(db, 'entries'), where('user_id', '==', userId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ---- rewards ----

export function subscribeRewards(uid, callback) {
  const q = uid
    ? query(collection(db, 'rewards'), where('owner_uid', '==', uid))
    : collection(db, 'rewards');
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

export async function createReward(reward) {
  const ref = await addDoc(collection(db, 'rewards'), {
    ...reward,
    status: 'locked',
    progress_current: 0,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateReward(rewardId, data) {
  await updateDoc(doc(db, 'rewards', rewardId), data);
}

export async function deleteReward(rewardId) {
  await deleteDoc(doc(db, 'rewards', rewardId));
}

export { orderBy };
