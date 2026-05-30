self.addEventListener("push", (event) => {
  let data = { title: "Glide", body: "You have a new update", url: "/" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    /* ignore */
  }

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(data.title, {
        body: data.body,
        icon: "/logo-mark.png",
        badge: "/logo-mark.png",
        data: { url: data.url },
      }),
      // Tell every open Glide tab to refresh its wallet state immediately,
      // so balances update without the user tapping the refresh button.
      self.clients
        .matchAll({ type: "window", includeUncontrolled: true })
        .then((list) => {
          for (const client of list) {
            client.postMessage({ type: "glide:refresh-wallet" });
          }
        }),
    ]),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ("focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    }),
  );
});
