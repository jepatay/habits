import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { app, useEmulator } from './config';
import { createUserDoc } from './firestore';

// Firebase's client SDK signs in as whatever account it just created, which
// would kick the admin out of their own session. A short-lived secondary app
// instance isolates that side effect, then gets torn down immediately after.
export async function adminCreateUser({ name, email, password, role, colorTheme }) {
  const secondaryApp = initializeApp(app.options, `admin-create-${Date.now()}`);
  const secondaryAuth = getAuth(secondaryApp);
  if (useEmulator) connectAuthEmulator(secondaryAuth, 'http://127.0.0.1:9099', { disableWarnings: true });
  try {
    const credential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    await createUserDoc(credential.user.uid, { name, email, role, colorTheme });
    return credential.user.uid;
  } finally {
    await signOut(secondaryAuth).catch(() => {});
    await deleteApp(secondaryApp).catch(() => {});
  }
}
