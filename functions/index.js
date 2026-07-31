const { onSchedule } = require('firebase-functions/v2/scheduler');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');

initializeApp();
const db = getFirestore();

function todayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Runs hourly. Reminder times are matched to the current UTC hour, which is
// a deliberate simplification - per-user timezones aren't modeled yet (see
// README "Known limitations").
exports.habitReminders = onSchedule('0 * * * *', async () => {
  const currentHour = new Date().getUTCHours();
  const date = todayKey();

  // Filtering archived + hour-of-day in JS (rather than a second equality
  // filter) avoids needing a composite index for this one-off query.
  const habitsSnap = await db.collection('habits').where('reminder.enabled', '==', true).get();

  const dueHabits = habitsSnap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((h) => !h.archived && Number(h.reminder?.time?.split(':')?.[0]) === currentHour);

  if (!dueHabits.length) return;

  const usersNeeded = [...new Set(dueHabits.map((h) => h.owner_uid))];
  const userDocs = await Promise.all(usersNeeded.map((uid) => db.collection('users').doc(uid).get()));
  const usersById = new Map(userDocs.filter((d) => d.exists).map((d) => [d.id, d.data()]));

  for (const habit of dueHabits) {
    const existingEntry = await db
      .collection('entries')
      .doc(`${habit.id}_${habit.owner_uid}_${date}`)
      .get();
    if (existingEntry.exists) continue;

    const user = usersById.get(habit.owner_uid);
    if (!user) continue;

    const title = 'Habit reminder';
    const body = habit.question || `Time to check off "${habit.name}".`;

    if (user.pushTokens?.length) {
      await getMessaging()
        .sendEachForMulticast({
          tokens: user.pushTokens,
          notification: { title, body },
        })
        .catch(() => null);
    } else {
      await db.collection('mail').add({
        to: user.email,
        message: { subject: title, text: body },
      });
    }
  }
});

// Lets a signed-in user verify the full push pipeline (token -> Firestore ->
// this function -> FCM -> browser) immediately, rather than waiting for a
// habit reminder's scheduled hour to come around.
exports.sendTestNotification = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in first.');
  }

  const userDoc = await db.collection('users').doc(request.auth.uid).get();
  const tokens = userDoc.data()?.pushTokens || [];
  if (!tokens.length) {
    throw new HttpsError('failed-precondition', 'No push token registered on this device yet.');
  }

  const response = await getMessaging().sendEachForMulticast({
    tokens,
    notification: {
      title: 'Test notification',
      body: 'Push notifications are working.',
    },
  });

  if (response.successCount === 0) {
    const reason = response.responses.find((r) => r.error)?.error?.message || 'Unknown error';
    throw new HttpsError('internal', `Delivery failed: ${reason}`);
  }

  return { successCount: response.successCount, failureCount: response.failureCount };
});
