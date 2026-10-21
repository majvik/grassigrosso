# Unified Modal System and Smart Selector Completion Design

**Date:** 2026-10-21  
**Status:** Approved design, pending implementation plan  
**Scope:** Public-site modal shells and the completion state of the catalog smart selector

## Problem

The public site currently uses several visually independent modal implementations. Their backdrops, surfaces, viewport margins, shadows, radii, scrolling behavior, and close controls differ. The smart selector is the accepted visual baseline, but its completion state does not clearly tell users that the questionnaire is finished and that they should press the selection button.

The smart selector also needs a visually continuous fixed action area. When the dialog content overflows, the current inner-width divider makes the transition into the fixed footer look clipped.

## Goals

1. Make the smart selector's completed state unmistakable without persistent or distracting animation.
2. Keep the selector action button, profile status, and AI disclaimer fixed at the bottom of the dialog while only the content above them scrolls.
3. Give the fixed action area a full-width separator and a soft upward gradient shadow that visually masks scrolling content.
4. Establish one reusable visual shell for all public-site modals while preserving each modal's specialized internal layout and behavior.
5. Preserve accessibility, keyboard dismissal, focus behavior, responsive layouts, and existing form/catalog workflows.

## Non-goals

- Do not change the cookie banner or any of its styles or behavior.
- Do not change the mobile menu or treat it as a modal-system consumer.
- Do not redesign the content, fields, actions, or business logic inside existing modal windows.
- Do not migrate all legacy modal behavior to React or Base UI as part of this work.
- Do not change catalog ranking, filtering, form submission, or email routing.

## Modal Inventory

The shared shell applies to:

- Catalog smart selector.
- Commercial-offer modal.
- Catalog, document, and help request form modals.
- Video modal.
- Catalog product modal, including its contact state.
- Catalog filter-help modal.
- Catalog favourites-clear confirmation modal.
- Welcome modal if it is rendered again in a supported page state.

The cookie banner and mobile menu are explicit exceptions.

## Selected Architecture

Use a shared CSS modal-shell contract rather than converting every implementation to one framework component.

The contract consists of semantic modal design tokens and reusable shell classes for:

- viewport overlay and backdrop;
- modal surface;
- close control;
- desktop and mobile viewport margins;
- radius and shadow;
- constrained height and internal scrolling.

Existing modal markup receives the shared shell classes where practical. CSS Modules, including the smart selector, consume the same tokens and may retain local layout classes. This keeps behavior owned by the existing JavaScript or React implementation while removing visual divergence.

## Shared Visual Contract

### Overlay

- Full viewport coverage.
- Shared dark-green translucent backdrop with restrained blur.
- Modal content centered in the viewport.
- Minimum desktop viewport clearance: 48 px on every applicable edge.
- Minimum mobile viewport clearance: 16 px.

### Surface

- Brand beige surface based on existing design tokens.
- Radius: 24 px on desktop; responsive reduction is allowed where space requires it.
- One shared soft elevation shadow.
- Natural content height when content fits; no forced stretching.
- Maximum height derived from the viewport clearance.
- Overflow occurs inside the designated content region, not on the complete surface, when a fixed footer is present.

### Close control

- White circular control, visually matching the accepted smart-selector treatment.
- Dark-green cross centered geometrically in the circle.
- Consistent hover, focus-visible, and active states.
- Desktop target size between 42 and 48 px; never below an accessible touch target on mobile.
- Existing accessible labels remain intact.

### Specialized layouts

- The catalog product modal keeps its two-column desktop layout, media region, contact state, and existing responsive collapse.
- Video retains a media-first surface. It receives the shared backdrop, corner treatment, elevation, and close control without an unnecessary beige frame around the video.
- Form modals retain their fields, steps, validation, and submit behavior.
- Confirmation and help modals retain their content hierarchy and action arrangement.

## Smart Selector Completion State

The completion visual state is driven only by `quizComplete`. Free text or a partially completed branch may enable preliminary matching, but must not receive the completed-quiz presentation.

When the final branch answer is selected:

- all current tags change from the existing pale-yellow treatment to a pale brand-green treatment;
- the words `Профиль заполнен` are bold while the explanatory continuation remains regular;
- the primary button receives one short, soft green glow that expands outward to attract attention;
- after the single impulse finishes, the glow disappears completely and the button returns to its normal active appearance;
- the animation never loops, pulses, or leaves the button permanently illuminated;
- `prefers-reduced-motion: reduce` disables the animation while retaining the green tags and bold status.

When the user goes back, removes an answer that reopens the questionnaire, or clears the profile:

- `quizComplete` becomes false;
- tags immediately return to the existing pale-yellow treatment;
- the status returns to the incomplete copy and regular weight;
- the button returns to its normal visual state.

## Smart Selector Fixed Footer

The fixed footer contains, in order:

1. profile status;
2. `Подобрать матрас` button;
3. AI disclaimer and manager link.

The footer:

- is a non-scrolling flex child pinned to the bottom of the modal surface;
- spans the full inner width of the modal, including the area otherwise occupied by surface padding;
- uses equivalent internal horizontal padding so its content remains aligned with the scrollable content;
- has a full-width top separator;
- renders a soft gradient shadow upward from the separator;
- remains visually attached to the modal bottom at every supported height;
- must not cover focusable content in the scroll region.

Only the content above this footer scrolls. The dialog remains naturally sized when its complete content fits within the viewport.

## Accessibility and Interaction

- Preserve existing dialog roles, accessible names, Escape behavior, backdrop dismissal behavior, and focus restoration.
- The completion animation must not be the only completion cue; color and typography provide persistent cues.
- Green and yellow tag treatments must retain readable text contrast.
- Close buttons retain or gain visible focus indicators.
- No animation is required for reduced-motion users.
- Existing nested catalog-modal coordination must continue to prevent conflicting open layers.

## Testing Strategy

Implementation follows test-driven development.

### Smart selector regression coverage

- The final quiz answer sets the completion state.
- Completed tags use the green state and the status contains bold `Профиль заполнен`.
- The button exposes the one-shot glow class/state only while the quiz is complete.
- Going back, deleting a required answer, and clearing the profile restore the yellow/incomplete state.
- Reduced-motion styling suppresses the glow animation.
- Scrolling the content region does not move the footer.
- The separator and footer span the modal surface width while footer content stays aligned.
- Desktop dialog clearance is at least 48 px and mobile clearance is at least 16 px.

### Shared modal-shell coverage

- Each included modal has the shared overlay/surface/close contract or consumes the same shell tokens.
- Product modal still opens, renders specifications, preserves two columns at desktop width, and closes normally.
- Form and help modals preserve their current open/close behavior.
- Video modal preserves playable media behavior and uses the common close control.
- Cookie banner and mobile menu selectors and computed shell styles remain unchanged.

### Required local verification

- New modal-system contract test.
- Updated smart-selector browser regression test.
- Existing `check:catalog-ui`.
- Existing relevant form/page contract checks.
- `npm run typecheck`.
- `npm run build:web`.
- Manual local visual smoke at desktop and mobile widths supplements but does not replace automated checks.

## Success Criteria

- Users receive a clear, persistent completion cue and an optional one-shot motion cue after the final answer.
- Returning to an incomplete state removes every completion treatment.
- The smart-selector footer never scrolls away or appears visually clipped.
- All included public-site modals visibly belong to one system while retaining their functional layouts.
- The product modal remains fully usable in both desktop and mobile layouts.
- Cookie consent and the mobile menu are byte-for-byte untouched by the implementation unless a test-only selector is required outside their source files; their computed presentation must remain unchanged.
- All required local automated checks pass before the task is considered complete.
