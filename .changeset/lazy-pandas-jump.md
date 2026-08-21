---
"mp-pong-2020": patch
---

Fix GitHub Releases not being created: bump changesets/action to v2, which reads the CLI's structured CHANGESETS_OUTPUT instead of parsing stdout in a format the installed @changesets/cli no longer produces.
