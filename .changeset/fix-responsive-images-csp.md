---
'astro': patch
---

Fixes responsive images violating Content Security Policy (CSP) when `image.layout` and `security.csp` are both enabled.

Previously, PR #16236 added inline `style="object-position: center"` attributes to every responsive `<img>` tag. This violated CSP because inline style attributes require `'unsafe-hashes'` (a CSP Level 3 feature that Astro does not support), and Astro's CSP system only hashes `<style>` elements, not style attributes.

The fix removes the inline style injection and instead delivers `object-position` CSS through a virtual CSS module (`virtual:astro:image-position-styles.css`). This module is processed by Vite, injected as a `<style>` tag in the `<head>`, and automatically hashed by Astro's CSP system — maintaining full CSP compliance. The existing `data-astro-image-pos` data attribute continues to be set on `<img>` tags for CSS targeting.
