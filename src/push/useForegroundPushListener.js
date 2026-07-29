import { useEffect } from 'react';
import { listenForegroundMessages } from '../firebase/messaging';

// Shows a browser Notification for pushes that arrive while the tab is
// focused, since the service worker's onBackgroundMessage only fires when it isn't.
export function useForegroundPushListener() {
  useEffect(() => {
    let unsubscribe;
    listenForegroundMessages((payload) => {
      if (Notification.permission !== 'granted') return;
      const { title, body } = payload.notification || {};
      new Notification(title || 'Habit reminder', {
        body: body || "Don't forget to check off today's habits.",
        icon: '/pwa-192.png',
      });
    }).then((unsub) => {
      unsubscribe = unsub;
    });
    return () => unsubscribe?.();
  }, []);
}
