export type PushEnableResult = 'enabled' | 'denied' | 'unsupported' | 'error';

const urlBase64ToUint8Array = (base64: string): Uint8Array<ArrayBuffer> => {
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
  const binary = atob(padded.replaceAll('-', '+').replaceAll('_', '/'));
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
};

export const isPushSupported = () =>
  typeof window !== 'undefined' &&
  'serviceWorker' in navigator &&
  'PushManager' in window &&
  'Notification' in window;

export const enablePushNotifications = async (): Promise<PushEnableResult> => {
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  if (!isPushSupported() || !vapidKey) {
    return 'unsupported';
  }

  try {
    const permission = await Notification.requestPermission();

    if (permission !== 'granted') {
      return 'denied';
    }

    const registration = await navigator.serviceWorker.register('/sw.js');
    const subscription =
      (await registration.pushManager.getSubscription()) ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      }));

    const response = await fetch('/api/push/subscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription: subscription.toJSON() }),
    });

    return response.ok ? 'enabled' : 'error';
  } catch {
    return 'error';
  }
};

export const disablePushNotifications = async (): Promise<void> => {
  try {
    const registration =
      await navigator.serviceWorker.getRegistration('/sw.js');
    const subscription = await registration?.pushManager.getSubscription();
    await subscription?.unsubscribe();
  } catch {}

  try {
    await fetch('/api/push/subscription', { method: 'DELETE' });
  } catch {}
};
