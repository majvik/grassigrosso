# GSD-pi project migration — design

## Problem

The repository still stores workflow state in the legacy `.planning/` format and references old `/gsd-*` commands under `~/.cursor/get-shit-done`. It has no canonical `.gsd/` database/projections, while the approved experimentation plan was reviewed against `open-gsd/gsd-pi` 1.20.1.

The user requires the project itself—not only the review process—to use the fresh GSD-pi generation.

## Current findings

- Legacy `.planning/` contained one completed Pages CMS milestone with seven phases and its plans/research/evidence.
- The npm tag and GitHub `main` both report version 1.20.1, but the published package points to an older `gitHead`; the selected build is exact upstream commit `372fea8015fcd0760476d51103a94ff85d67fb68`.
- Official migration imported 1 milestone, 7/7 slices, 7/7 tasks, 15 decisions and 28/28 validated requirements.
- GSD archived the complete legacy tree under `.gsd/migration/legacy/planning/` and retained a local verified backup under `.gsd-backups/`.
- Production TypeScript and several verification scripts imported operational JSON contracts directly from `.planning/`; deleting the legacy tree therefore broke `typecheck` and `build` until those contracts were moved to `src/contracts/pages-cms/`.
- The new experimentation spec/plan lives under `docs/superpowers/` and was intentionally not folded into the completed historical migration milestone.

## Selected approach

1. Build and install the official scoped GSD-pi CLI globally from exact upstream GitHub commit `372fea8015fcd0760476d51103a94ff85d67fb68`. Do not add the agent runtime to the website's application dependencies.
2. Run the official interactive `/gsd migrate` command from the repository root. Accept only a preview that targets this repository, imports at least one milestone and seven slices, creates a verified retained backup, and archives the legacy source.
3. Move operational CMS contracts out of the retired planning directory so application runtime and test harnesses consume stable source-controlled paths.
4. Record canonical validation and completion receipts for the historical migrated milestone, then verify the DB-backed project with `/gsd doctor`, `gsd headless query`, migration audit artifacts and Git status.
5. Commit only team-shareable GSD projections/preferences/audit artifacts allowed by the generated ignore rules. Keep database, locks, activity, quarantine, worktrees and migration backups local.
6. Do not manually edit `.gsd` projections to add the experimentation milestone. GSD's database is canonical. Create that milestone only through a supported GSD workflow when implementation begins.

## Safety boundaries

- No `git push`, pull request, deploy, Timeweb change or remote project mutation.
- Do not delete `.planning/` manually. Let the supported migration retain an archive and backup.
- Do not bypass preview/confirmation or write `.gsd/gsd.db` directly.
- Do not add `@opengsd/gsd-pi` to production dependencies.
- If migration reports zero slices, fatal validation, active-session state or forward-repair choices, stop and resolve the exact evidence instead of forcing it.
- Preserve all unrelated repository changes.

## Success criteria

1. `gsd --version` returns 1.20.1 and installed runtime hashes match exact upstream GitHub commit `372fea8015fcd0760476d51103a94ff85d67fb68`.
2. The project has a DB-backed `.gsd/` migration with milestone/slice/task counts matching its legacy source and a retained verified `.gsd-backups/` snapshot.
3. `/gsd doctor` reports no structural or authority failure, and `gsd headless query` reports the migration milestone complete without a model provider.
4. Legacy `.planning` content is preserved through the generated migration archive/audit; no planning evidence is silently lost.
5. Project ignore rules keep runtime DB/locks/activity/worktrees/backups out of Git while allowing intended shared projections.
6. The application dependency graph is unchanged by the CLI installation; `typecheck`, routes, relevant Pages CMS contract gates and production build pass after retiring `.planning/`.
7. The approved experimentation plan remains separate and is ready to become the next GSD milestone when implementation is explicitly started.
