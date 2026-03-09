import { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { toast } from 'sonner';

export const usePushNotifications = () => {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    if (!Capacitor.isNativePlatform()) return;

    initialized.current = true;

    const setup = async () => {
      const permStatus = await PushNotifications.checkPermissions();

      if (permStatus.receive === 'prompt') {
        const result = await PushNotifications.requestPermissions();
        if (result.receive !== 'granted') return;
      } else if (permStatus.receive !== 'granted') {
        return;
      }

      await PushNotifications.register();

      PushNotifications.addListener('registration', (token) => {
        console.log('Push registration token:', token.value);
        // TODO: Send token to your backend to store for sending notifications
      });

      PushNotifications.addListener('registrationError', (error) => {
        console.error('Push registration error:', error);
      });

      PushNotifications.addListener('pushNotificationReceived', (notification) => {
        toast(notification.title ?? 'Notification', {
          description: notification.body,
        });
      });

      PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
        console.log('Push notification action:', action);
      });
    };

    setup();

    return () => {
      PushNotifications.removeAllListeners();
    };
  }, []);
};
