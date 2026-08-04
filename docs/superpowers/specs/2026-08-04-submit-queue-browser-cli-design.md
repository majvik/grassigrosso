# Production submit queue and browser CLI — design

## Problem

The production `/download-catalog` form can show a client timeout after 25 seconds even though the lead is eventually delivered. `/api/submit` currently waits for Telegram and SMTP sequentially. The project instructions also reference `agent-browser`, but the CLI is not installed in the workspace.

## Root cause

- A lead is durably inserted into SQLite before delivery, but the HTTP response still waits for both external channels.
- External channel latency can exceed the client timeout.
- Retry delivery works, so the visible timeout is a false failure and can cause duplicate sales leads.
- `agent-browser` is documented as a standard QA tool but is absent from `node_modules/.bin`.

## Design

1. Treat SQLite as the durable acceptance boundary.
2. After validation and insert, respond immediately with `202 { success, delivery: "queued", queued: true, leadId }`.
3. Trigger the existing queue processor immediately without awaiting it; retain the interval as recovery.
4. Send the user confirmation only after the queue processor records successful lead delivery.
5. Add `agent-browser@0.33.2` as a pinned dev dependency and expose a deterministic smoke command. The current Node 22 runtime emits the package's Node 24 engine warning during install, but the CLI entrypoint is verified locally; upgrading the project runtime remains a separate infrastructure task.
6. Bound Telegram and SMTP connection/greeting/socket waits so one external channel cannot hold the queue worker forever.

## Success criteria

- Submit response does not wait for SMTP or Telegram.
- A newly accepted row is pending before delivery and becomes delivered through the worker.
- Failed delivery remains pending for retry.
- Every external delivery attempt finishes within the configured channel timeout.
- User confirmation is attempted only after successful lead delivery.
- Production form treats `202` as success and starts the PDF download.
- `npm exec agent-browser -- --help` works locally.
- Focused regression, sales gate, build, and whitespace checks pass before push.
