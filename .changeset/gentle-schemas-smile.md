---
'astro': patch
---

Fixes generated JSON schema for `file()` loader collections to validate both array and object data shapes. Previously, the schema always used `type: "object"`, causing VS Code to flag top-level array JSON/YAML files as invalid. The schema now uses `anyOf` to accept both formats.
