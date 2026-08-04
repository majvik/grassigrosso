# Production submit queue and browser CLI — execution plan

## Phase A — contract and harness — complete

- Add a focused static/runtime regression for fast durable acceptance.
- Assert the client accepts `202` and retains the catalog download behavior.
- Verify the test fails against the old synchronous handler.

## Phase B — implementation — complete

- Change `/api/submit` to durable enqueue + immediate `202`.
- Trigger the existing queue worker without blocking the response.
- Move confirmation email to the successful worker path.
- Pin `agent-browser` in dev dependencies and expose `browser:smoke`.

## Phase C — verify — complete

- Run the focused queue regression.
- Run `check:download-catalog-sales`.
- Run `npm exec agent-browser -- --help`.
- Run `npm run build` and `git diff --check`.
- Review exact commit range; push only after all checks pass.

## Verification result

- Old handler: regression timed out at 2 seconds as expected.
- New handler: `202` in 10 ms while SMTP greeting was delayed by 2.5 seconds.
- Durable state: pending count was 1 during delivery, then returned to 0.
- SMTP harness received exactly two messages: lead notification and user confirmation.
- `agent-browser` help, real `about:blank` open/read/close smoke: PASS.
- Sales gate, production build, and whitespace check: PASS.
