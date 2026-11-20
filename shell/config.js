// Shell configuration.
window.KIDVO_CONFIG = {
  repoUrl: 'https://github.com/AlparKacso/kidvo',
  // Shown to parents and teachers in the "For grown-ups" window.
  contactEmail: 'hello@kidvo.eu',
  // Per-app storage limit (bytes of JSON) kept in the visitor's browser.
  storeLimit: 32 * 1024,
  // The game the welcome window's "Start playing" opens.
  startApp: 'maze',
  // Max bus messages per second a single app may send before it is muted.
  emitRate: 40,
  // Largest event payload (bytes of JSON) the bus will forward.
  maxPayload: 4096,
  // Counting game plays without names or IDs (counter/README.md). Sent only when the page is served from `host`;
  // the address must also be in connect-src in index.html.
  count: { url: 'https://kidvo-count.kidvo-counter.workers.dev/play', host: 'kidvo.eu' }
};
