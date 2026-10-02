Promise.all([
  navigator.serviceWorker
    ? navigator.serviceWorker.getRegistrations().then((registrations) =>
        Promise.all(registrations.map((registration) => registration.unregister())),
      )
    : Promise.resolve(),
  window.caches
    ? caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
    : Promise.resolve(),
]).finally(() => {
  const url = new URL(window.location.href);
  url.searchParams.set("classo-refresh", "77b2264");
  window.location.replace(url.toString());
});
