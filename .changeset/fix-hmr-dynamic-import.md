---
'astro': patch
---

Fixes HMR for dynamically imported components in dev mode.

Previously, editing the HTML of a component loaded via `await import()` in an `.astro` page's frontmatter would not reflect changes unless the dev server was restarted. This was because the `astro:hmr-reload` plugin returned an empty module list after invalidating SSR modules, which prevented Vite from propagating the invalidation to the SSR module runner's internal cache.

The fix returns the SSR-only modules from the `hotUpdate` handler so that Vite's `updateModules()` can process them and properly notify the module runner to clear its stale cache.
