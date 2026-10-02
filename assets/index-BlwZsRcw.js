/* Compatibility bridge for clients whose previous service worker cached the
 * former index.html.  That document still requests this hashed module after a
 * deployment has replaced it.  Remove the obsolete worker and caches, then
 * reload once so the current app shell and its matching assets can load. */
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
  url.searchParams.set("classo-refresh", "70dd281");
  window.location.replace(url.toString());
});
