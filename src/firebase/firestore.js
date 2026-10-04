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
import { isSuccess } from '../utils/streaks';
import { everyNSuccessDates, milestoneFulfilledCount } from '../utils/rewards';

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

// Every entries subscription in the app is scoped to a bounded date range
// (the habits grid's visible window, or a reward's lookback window) rather
// than a user's entire history, which can be years' worth of entries for an
// import like Loop's. Requires a composite index on (user_id, date) - see
// firestore.indexes.json.
export function subscribeEntriesForUserInRange(userId, startDate, endDate, callback) {
  const q = query(
    collection(db, 'entries'),
    where('user_id', '==', userId),
    where('date', '>=', startDate),
    where('date', '<=', endDate),
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

// Admin-only: every user's entries in a date range, for aggregating reward
// progress across everyone without picking a profile first. Rules only let
// this succeed for an admin (owner-only otherwise), same as the unfiltered
// habits/rewards subscriptions below.
export function subscribeEntriesInRange(startDate, endDate, callback) {
  const q = query(collection(db, 'entries'), where('date', '>=', startDate), where('date', '<=', endDate));
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

// Milestones restart after each round, so fulfilling one bumps the round
// counter on the reward itself (see milestoneRound) and logs the date - one
// entry per Notifications line.
export async function markMilestoneFulfilled(reward) {
  const count = milestoneFulfilledCount(reward);
  await updateDoc(doc(db, 'rewards', reward.id), {
    fulfilled_count: count + 1,
    fulfilled_dates: [...(reward.fulfilled_dates || []), new Date().toISOString()],
    status: 'active',
  });
}

export async function deleteReward(rewardId) {
  await deleteDoc(doc(db, 'rewards', rewardId));
}

// ---- reward payouts (per-completion and every-N rewards) ----

export function subscribeRewardPayouts(ownerUid, callback) {
  const q = ownerUid
    ? query(collection(db, 'reward_payouts'), where('owner_uid', '==', ownerUid))
    : collection(db, 'reward_payouts');
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

export async function markPayoutPaid(payoutId) {
  await updateDoc(doc(db, 'reward_payouts', payoutId), { status: 'paid', paidAt: serverTimestamp() });
}

// Called right after an entry is checked/unchecked by hand (grid tap, or the
// heatmap edit modal) - bulk imports go through setEntriesBatch instead and
// deliberately skip this, so importing years of history doesn't flood the
// payout ledger with hundreds of "pending" rewards.
export async function syncRewardPayoutsForEntry(ownerUid, habit, date, value) {
  const rewardsSnap = await getDocs(
    query(
      collection(db, 'rewards'),
      where('owner_uid', '==', ownerUid),
      where('type', 'in', ['recurring', 'every_n']),
    ),
  );
  const rewards = rewardsSnap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((r) => r.condition?.habit_id === habit.id);
  if (!rewards.length) return;

  await Promise.all(
    rewards.map((reward) =>
      reward.type === 'every_n'
        ? syncEveryNPayouts(ownerUid, habit, reward, date, value)
        : syncPerCompletionPayout(ownerUid, habit, reward, date, value),
    ),
  );
}

async function syncPerCompletionPayout(ownerUid, habit, reward, date, value) {
  const ref = doc(db, 'reward_payouts', `${reward.id}_${date}`);
  const snap = await getDoc(ref);
  if (isSuccess(habit, { value })) {
    if (!snap.exists()) {
      await setDoc(ref, {
        reward_id: reward.id,
        habit_id: habit.id,
        owner_uid: ownerUid,
        date,
        name: reward.name,
        reward_text: reward.reward_text,
        status: 'pending',
        createdAt: serverTimestamp(),
      });
    }
  } else if (snap.exists() && snap.data().status === 'pending') {
    // Unchecking right after a mis-tap shouldn't leave a stray payout -
    // but once it's marked paid it's a done deal, so leave it alone.
    await deleteDoc(ref);
  }
}

// One payout per full block of N successes since the reward's start date
// (30th read -> payout #1, 60th -> #2, ...). Recounts from the entries so
// a mis-tap that drops the count back under a threshold removes the
// still-pending payout it minted.
async function syncEveryNPayouts(ownerUid, habit, reward, date, value) {
  const every = Number(reward.condition?.every) || 0;
  if (every < 1) return;

  const entriesSnap = await getDocs(
    query(collection(db, 'entries'), where('habit_id', '==', habit.id), where('user_id', '==', ownerUid)),
  );
  // Overlay the entry just written/deleted in case the read raced it.
  const entries = entriesSnap.docs.map((d) => d.data()).filter((e) => e.date !== date);
  if (value !== null && value !== undefined) entries.push({ habit_id: habit.id, date, value });

  const dates = everyNSuccessDates(reward, habit, entries);
  const earned = Math.floor(dates.length / every);

  const payoutsSnap = await getDocs(
    query(collection(db, 'reward_payouts'), where('owner_uid', '==', ownerUid), where('reward_id', '==', reward.id)),
  );
  const existing = new Map(payoutsSnap.docs.map((d) => [d.id, d.data()]));

  const writes = [];
  for (let i = 1; i <= earned; i += 1) {
    const id = `${reward.id}_n${i}`;
    if (!existing.has(id)) {
      writes.push(
        setDoc(doc(db, 'reward_payouts', id), {
          reward_id: reward.id,
          habit_id: habit.id,
          owner_uid: ownerUid,
          date: dates[i * every - 1],
          cycle: i,
          name: reward.name,
          reward_text: reward.reward_text,
          status: 'pending',
          createdAt: serverTimestamp(),
        }),
      );
    }
  }
  for (const [id, payout] of existing) {
    if (payout.cycle > earned && payout.status === 'pending') {
      writes.push(deleteDoc(doc(db, 'reward_payouts', id)));
    }
  }
  await Promise.all(writes);
}

export { orderBy };
