import { getMessaging, getToken, deleteToken, isSupported, onMessage } from 'firebase/messaging';
import { app } from './config';

let messagingInstance = null;

export async function getMessagingIfSupported() {
  if (messagingInstance) return messagingInstance;
  const supported = await isSupported().catch(() => false);
  if (!supported) return null;
  messagingInstance = getMessaging(app);
  return messagingInstance;
}

export async function requestPushToken() {
  const messaging = await getMessagingIfSupported();
  if (!messaging) return null;
  // No serviceWorkerRegistration passed deliberately: the SDK self-registers
  // /firebase-messaging-sw.js at its own dedicated scope, so it doesn't
  // fight with vite-plugin-pwa's app-shell service worker for control of '/'.
  return getToken(messaging, {
    vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
  });
}

export async function clearPushToken() {
  const messaging = await getMessagingIfSupported();
  if (!messaging) return;
  await deleteToken(messaging);
}

// onBackgroundMessage in firebase-messaging-sw.js only fires while the tab
// isn't focused - a foreground listener is required for the other case.
export async function listenForegroundMessages(callback) {
  const messaging = await getMessagingIfSupported();
  if (!messaging) return () => {};
  return onMessage(messaging, callback);
}
