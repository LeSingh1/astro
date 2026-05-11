---
'astro': patch
---

Fixes dev-mode styles missing on pages that share a layout containing a `<template>` element (e.g. a theme-provider icon sprite)

In dev, Vite's `resolveId` cache could prevent `containsHead` from propagating to pages loaded after the first one. When the flag was missing, `maybeRenderHead()` fired inside an inert `<template>` element, causing all styles and scripts to be invisible to the browser. The fix falls back to scanning all component metadata for a `containsHead` entry, and adds a `templateDepth` guard so head content is never rendered inside `<template>`.
