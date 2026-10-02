self.addEventListener('push', (event) => {
  let data = {};

  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }

  event.waitUntil(
    Promise.all([
      self.clients
        .matchAll({ type: 'window', includeUncontrolled: true })
        .then((windows) => {
          for (const client of windows) client.postMessage({ type: 'push' });
        }),
      self.registration.showNotification(data.title ?? 'Polycord', {
        body: data.body ?? '',
        icon: '/icon-192.png',
        data: { url: data.url ?? '/' },
      }),
    ]),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow(event.notification.data?.url ?? '/'));
});
