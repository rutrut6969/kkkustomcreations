self.addEventListener("push", (event) => {
  const fallback = {
    title: "K&K Admin",
    body: "There is a new admin notification.",
    url: "/admin"
  };
  const data = event.data ? event.data.json() : fallback;
  event.waitUntil(
    self.registration.showNotification(data.title || fallback.title, {
      body: data.body || fallback.body,
      icon: "/android-chrome-192x192.png",
      badge: "/favicon-32x32.png",
      data: { url: data.url || fallback.url }
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/admin";
  event.waitUntil(clients.openWindow(url));
});
