import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { requestPushToken, clearPushToken, sendTestNotification } from '../firebase/messaging';
import { addPushToken, removePushToken } from '../firebase/firestore';

const supported =
  typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window;

function describeError(err) {
  if (err?.code === 'messaging/permission-blocked') return 'Notifications are blocked for this site.';
  if (err?.code === 'functions/failed-precondition') return err.message;
  if (err?.code === 'functions/unauthenticated') return 'Sign in again and retry.';
  if (err?.message) return err.message;
  return 'Something went wrong - see the browser console for details.';
}

export function usePushSubscription() {
  const { user, profile } = useAuth();
  const [permission, setPermission] = useState(supported ? Notification.permission : 'unsupported');
  const [busy, setBusy] = useState(false);
  const [currentToken, setCurrentToken] = useState(null);
  const [error, setError] = useState(null);
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    if (!supported) return;
    setPermission(Notification.permission);
    if (Notification.permission === 'granted') {
      requestPushToken().then((token) => token && setCurrentToken(token));
    }
  }, [profile]);

  async function enablePush() {
    if (!supported) return;
    setBusy(true);
    setError(null);
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result !== 'granted') return;
      const token = await requestPushToken();
      if (!token) {
        setError('Could not get a push token from this browser. Try again, or check that push is not blocked.');
        return;
      }
      await addPushToken(user.uid, token);
      setCurrentToken(token);
    } catch (err) {
      setError(describeError(err));
    } finally {
      setBusy(false);
    }
  }

  async function disablePush() {
    setBusy(true);
    setError(null);
    try {
      if (currentToken) await removePushToken(user.uid, currentToken);
      await clearPushToken();
      setCurrentToken(null);
    } catch (err) {
      setError(describeError(err));
    } finally {
      setBusy(false);
    }
  }

  async function testPush() {
    setBusy(true);
    setError(null);
    setTestResult(null);
    try {
      const result = await sendTestNotification();
      setTestResult(result);
    } catch (err) {
      setError(describeError(err));
    } finally {
      setBusy(false);
    }
  }

  return {
    supported,
    permission,
    enabled: permission === 'granted' && Boolean(currentToken),
    busy,
    error,
    testResult,
    enablePush,
    disablePush,
    testPush,
  };
}
