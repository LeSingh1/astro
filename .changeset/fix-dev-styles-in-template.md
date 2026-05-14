---
'astro': patch
---

Fixes dev-mode styles missing from content collection entries that use `.astro` components with scoped styles

Content entry styles are now collected at render time instead of being baked into the module at transform time. Previously, if the Vite module graph was incomplete when the `?astroPropagatedAssets` module was first transformed, styles were permanently missing until a dev server restart. Also prevents head content from rendering inside inert `<template>` elements in layouts.
