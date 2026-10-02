---
version: 1
language: ru
planning_depth: deep
verification_commands:
  - npm run typecheck
  - npm run check:routes
  - npm run build
verification_auto_fix: false
git:
  auto_push: false
  push_branches: false
  snapshots: true
  pre_merge_check: true
  isolation: none
  auto_pr: false
  manage_gitignore: true
---

# Project workflow preferences

GSD-pi must follow the repository-level `AGENTS.md`. Work locally, keep
runtime state out of Git, and use task-specific verification in addition to
the baseline commands above.
