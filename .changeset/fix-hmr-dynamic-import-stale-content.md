---
'astro': patch
---

Fixes HMR for dynamically imported `.astro` components (e.g. via `import.meta.glob`). Previously, editing a dynamically imported component's markup would not be reflected in the dev server — you had to restart the server to see the change. CSS-only edits were unaffected.

The root cause was in the `astro:hmr-reload` Vite plugin: when SSR-only modules changed, the plugin correctly told the browser to reload but did not propagate the invalidation to Vite's SSR module runner, leaving stale evaluated modules in its cache. The fix returns the changed modules from the `hotUpdate` hook so that Vite's built-in `updateModules()` flow notifies the runner to clear its cache.
