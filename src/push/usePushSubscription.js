import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { requestPushToken, clearPushToken } from '../firebase/messaging';
import { addPushToken, removePushToken } from '../firebase/firestore';

const supported =
  typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window;

export function usePushSubscription() {
  const { user, profile } = useAuth();
  const [permission, setPermission] = useState(supported ? Notification.permission : 'unsupported');
  const [busy, setBusy] = useState(false);
  const [currentToken, setCurrentToken] = useState(null);

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
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result !== 'granted') return;
      const token = await requestPushToken();
      if (token) {
        await addPushToken(user.uid, token);
        setCurrentToken(token);
      }
    } finally {
      setBusy(false);
    }
  }

  async function disablePush() {
    setBusy(true);
    try {
      if (currentToken) await removePushToken(user.uid, currentToken);
      await clearPushToken();
      setCurrentToken(null);
    } finally {
      setBusy(false);
    }
  }

  return {
    supported,
    permission,
    enabled: permission === 'granted' && Boolean(currentToken),
    busy,
    enablePush,
    disablePush,
  };
}
