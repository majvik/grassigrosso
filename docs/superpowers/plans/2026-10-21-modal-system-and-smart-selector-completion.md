# Modal System and Smart Selector Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify every supported public-site modal under one branded shell and make the smart selector's completed state and fixed action footer unmistakable.

**Architecture:** Add semantic modal tokens and opt-in shared shell classes without replacing existing modal controllers. Migrate legacy form/video and catalog modal surfaces onto that contract, while the CSS-module smart selector consumes the same tokens and owns its quiz-completion state locally.

**Tech Stack:** Vite, React, TypeScript, CSS Modules, legacy HTML/CSS/JavaScript, Chrome DevTools Protocol smoke tests.

**Spec:** `docs/superpowers/specs/2026-10-21-modal-system-and-smart-selector-completion-design.md`

## Global Constraints

- Work locally only; do not push, deploy, open a pull request, or change Timeweb.
- Cookie consent and the mobile menu are excluded and must retain their computed presentation.
- Preserve every existing modal controller, form workflow, catalog coordinator, accessible label, and content layout.
- Desktop modal viewport clearance is 48 px; mobile clearance is 16 px.
- Smart-selector glow runs once, expands outward, disappears completely, and never loops.
- `prefers-reduced-motion: reduce` suppresses the glow animation.
- Every behavior change follows RED → GREEN and all relevant local gates must pass.

## Review Focus

- A short modal that fits the viewport must keep natural height rather than stretch to the maximum.
- A tall modal must scroll its content without moving or covering its fixed action region.
- Completing, going back, removing a required tag, and clearing the smart profile must transition completion visuals consistently.
- The product modal must preserve its desktop two-column layout and responsive mobile collapse after adopting the shell.
- Shared close styling must not leak into the cookie banner or mobile menu.

---

### Task 1: Shared modal-shell contract and legacy form/video consumers

**Files:**
- Create: `scripts/check-modal-system.mjs`
- Modify: `package.json`
- Modify: `src/styles/tokens.css`
- Modify: `src/styles/components.css`
- Modify: `index.html`
- Modify: `hotels.html`
- Modify: `documents.html`
- Modify: `dealers.html`

**Interfaces:**
- Produces: semantic `--modal-*` tokens and opt-in `.site-modal-*` shell classes.
- Produces: `npm run check:modal-system`, a browser regression command used by Tasks 2 and 3.
- Consumes: existing `.modal-overlay`, `.modal-content`, and `.modal-close` behavior hooks without renaming or replacing them.

- [x] **Step 1: Write the failing modal-system browser test**

Add real-browser assertions that supported legacy form/video modal elements expose the opt-in shell contract, use the shared backdrop/radius/shadow/white circular close button, preserve natural height, and respect 48 px desktop clearance. Assert that `.cookie-banner` and `.mobile-menu` do not carry shell classes and retain their existing close/menu selectors.

- [x] **Step 2: Run the new test and verify RED**

Run: `npm run check:modal-system`  
Expected: FAIL because the semantic tokens/classes and migrated consumers do not exist.

- [x] **Step 3: Implement the shared tokens and opt-in shell**

Define the exact shared visual values in `tokens.css`; implement overlay, surface, media-surface, and close-control classes in `components.css`. Add these classes to supported legacy form/video modal markup in the four HTML entry files. Do not broaden legacy `.modal-close` rules in a way that reaches cookies.

- [x] **Step 4: Run the modal-system test and verify GREEN**

Run: `npm run check:modal-system`  
Expected: PASS for all migrated legacy consumers and exclusions.

- [x] **Step 5: Run page and type gates**

Run: `npm run check:routes && npm run typecheck`  
Expected: both commands PASS.

- [x] **Step 6: Commit Task 1**

```bash
git add package.json scripts/check-modal-system.mjs src/styles/tokens.css src/styles/components.css index.html hotels.html documents.html dealers.html
git commit -m "feat(ui): add shared modal shell"
```

---

### Task 2: Smart selector completion cue and edge-to-edge fixed footer

**Files:**
- Modify: `scripts/check-catalog-smart-selector.mjs`
- Modify: `src/components/catalog-page/smart-selector.tsx`
- Modify: `src/components/catalog-page/smart-selector.module.css`

**Interfaces:**
- Consumes: Task 1 `--modal-*` tokens.
- Produces: `data-smart-selector-complete` completion state, completed-tag styling, semantic bold status copy, and one-shot button glow.
- Preserves: existing `quizComplete` as the only authority for the completed presentation.

- [ ] **Step 1: Add failing smart-selector completion and footer assertions**

Extend the real-browser test to assert: final branch answer sets the completion marker; all tags become pale green; `Профиль заполнен` is a `strong` element; the button animation is finite and disappears; back/removal/clear restore yellow/incomplete state; reduced-motion disables animation. Assert footer edge-to-edge geometry, upward shadow, and immobility while the scroll region moves.

- [ ] **Step 2: Run the smart-selector test and verify RED**

Run: `npm run check:catalog-smart-selector`  
Expected: FAIL on the new completion and full-width footer assertions.

- [ ] **Step 3: Implement completion presentation and footer geometry**

Render explicit completion state hooks from `quizComplete`, split the status into bold lead and regular continuation, add green completed-tag styling, and use a one-shot pseudo-element/keyframe glow with a reduced-motion override. Make the footer compensate for popup inline/bottom padding, align its contents back to the content column, and draw a full-width separator with a soft upward gradient shadow.

- [ ] **Step 4: Run smart-selector and shared-shell tests and verify GREEN**

Run: `npm run check:catalog-smart-selector && npm run check:modal-system`  
Expected: both commands PASS.

- [ ] **Step 5: Run typecheck**

Run: `npm run typecheck`  
Expected: PASS.

- [ ] **Step 6: Commit Task 2**

```bash
git add scripts/check-catalog-smart-selector.mjs src/components/catalog-page/smart-selector.tsx src/components/catalog-page/smart-selector.module.css
git commit -m "feat(catalog): clarify completed smart profile"
```

---

### Task 3: Catalog modal consumers and full local verification

**Files:**
- Modify: `catalog.html`
- Modify: `src/styles/catalog-page.css`
- Modify: `scripts/check-modal-system.mjs`
- Modify: `scripts/check-catalog-ui.mjs`
- Modify: `docs/superpowers/plans/2026-10-21-modal-system-and-smart-selector-completion.md`

**Interfaces:**
- Consumes: Task 1 shared shell classes/tokens.
- Preserves: catalog modal IDs/classes used by `catalog-modals-bootstrap.ts`, `catalog-image-modal.ts`, `catalog-filter-help-modal.ts`, `catalog-favourites-clear-modal.ts`, and the modal coordinator.
- Produces: shared visual shell for product/contact, filter-help, and favourites-clear catalog modals.

- [ ] **Step 1: Add failing catalog modal-shell and layout assertions**

Extend browser coverage for product, filter-help, and favourites-clear modals. Assert shared backdrop/surface/close styling, 48 px desktop clearance where the layout permits it, preserved product two-column grid, existing open/close behavior, and responsive single-column behavior.

- [ ] **Step 2: Run catalog tests and verify RED**

Run: `npm run check:modal-system && npm run check:catalog-ui`  
Expected: FAIL on catalog shell consumers while existing functional assertions remain green.

- [ ] **Step 3: Migrate catalog modal markup and scoped CSS**

Add opt-in shared shell classes to catalog modal markup and replace conflicting visual shell declarations with shared tokens. Preserve specialized dimensions, content scrolling, product grid, contact form, and modal stacking/coordinator behavior.

- [ ] **Step 4: Run catalog tests and verify GREEN**

Run: `npm run check:modal-system && npm run check:catalog-ui && npm run check:catalog-smart-selector`  
Expected: all commands PASS.

- [ ] **Step 5: Run the complete relevant local gate**

Run: `npm run check:routes && npm run check:pages-cms-hydrate-dom && npm run typecheck && npm run build:web`  
Expected: every command PASS with no new warnings or contract failures.

- [ ] **Step 6: Perform local desktop/mobile visual smoke**

Inspect smart selector completed/incomplete states, one form modal, video modal, product modal, filter-help modal, favourites-clear modal, cookie banner, and mobile menu. Record viewport sizes and results below; this supplements automated tests.

- [ ] **Step 7: Update this plan with test evidence and commit Task 3**

```bash
git add catalog.html src/styles/catalog-page.css scripts/check-modal-system.mjs scripts/check-catalog-ui.mjs docs/superpowers/plans/2026-10-21-modal-system-and-smart-selector-completion.md
git commit -m "feat(catalog): unify catalog modal styling"
```

## Execution Results

### Task 1

- RED: `npm run check:modal-system` exited 1 because every legacy consumer lacked the shared shell and the natural-height geometry probe had no shell styles.
- GREEN: `npm run check:modal-system` exited 0 (`Modal system ok`).
- Gate: `npm run check:routes && npm run typecheck` exited 0; 12 route contracts and 9 form labels passed, followed by a clean TypeScript check.
