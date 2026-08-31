# Cooperative Gig Platform (v2 — standalone, no n8n)

A complete rebuild that replaces the entire n8n workflow with real code in
this project. Nothing here depends on n8n, so it keeps working after your
n8n trial ends. Data lives in Supabase Postgres instead of Google Sheets.

## What changed from the n8n version

- **Data store**: Supabase Postgres tables (`jobs`, `interests`,
  `worker_details`, `profiles`) instead of Google Sheets.
- **Orchestration**: plain Next.js API routes (`app/api/gigs/*`) instead of
  n8n webhooks — the exact same logic I'd fixed in the n8n workflow
  (eligibility matching, 12-hour cooldown, fair assignment, notifications)
  is reimplemented here in TypeScript.
- **Identity**: worker/customer identity comes from the authenticated
  Supabase session, not from client-supplied IDs in a request body — a bit
  more secure than the old webhook design.
- **UI**: dashboards now show real job lists and statuses directly (old
  version only had two static cards).
- **Availability field dropped**: the old "Busy/Available" toggle was a
  source of bugs (I'd fixed one instance of it giving workers the wrong
  status). The new design relies solely on the 12h cooldown for fairness —
  simpler and there's nothing to get out of sync.

## 1. Database

Already set up if you're continuing from before — the Supabase project
`nenrviuiplkmrywcyipm` already has this schema applied. If you ever need to
rebuild from scratch (new project), run `supabase/schema.sql` in the SQL
editor.

## 2. Environment variables

```bash
cp .env.local.example .env.local
```

Fill in:

- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Project
  Settings → API.
- `SUPABASE_SERVICE_ROLE_KEY` — same page, the **service_role** secret.
  This is powerful (bypasses all security rules) — never expose it to the
  browser or commit it. It's only read inside `app/api/**` route handlers.
- `NEXT_PUBLIC_SITE_URL` — your deployed domain (or `http://localhost:3000`
  while developing). Used to build the links inside notification
  emails/WhatsApp messages.
- `GMAIL_USER` / `GMAIL_APP_PASSWORD` — an
  [App Password](https://myaccount.google.com/apppasswords), not your
  normal Gmail password.
- `WHATSAPP_TOKEN` / `WHATSAPP_PHONE_NUMBER_ID` — use a **permanent**
  token from a Meta System User (Business Settings → System Users →
  Generate Token → expiration "Never"), not the 24-hour quickstart token.
  This is the same fix needed for the n8n version, just reused here.

## 3. Install and run

```bash
npm install
npm run dev
```

## How it works, end to end

1. **Customer signs up**, fills out a gig request
   (`app/dashboard/customer/request`) → `POST /api/gigs/create`.
2. That route saves the job, finds eligible workers (matching skill +
   location, active membership, not in cooldown), and emails/WhatsApps each
   one a link straight to `dashboard/worker/jobs/[jobCode]`.
3. **Worker signs up** (collects trade, service area, WhatsApp number),
   sees the job either via that link or directly on their own dashboard
   (open jobs matching their profile), and clicks "I'm interested" →
   `POST /api/gigs/accept`.
4. **Customer** opens `dashboard/customer/jobs/[jobCode]` to see everyone
   interested → `GET /api/gigs/[jobCode]/interested` → picks one → hires via
   `POST /api/gigs/hire`, which assigns the job, puts the worker on a 12h
   cooldown, marks other applicants as released, and emails both sides.

## Notes on reliability

- Notification sending (email/WhatsApp) is `await`ed before the API
  response, wrapped in try/catch, so a WhatsApp failure can never turn a
  successful job creation into an error for the customer — but it does mean
  the request takes a couple of seconds while emails go out. This is more
  reliable across hosting platforms than "fire and forget after responding,"
  which can get silently killed on serverless hosts.
- Every mutation route re-derives the caller's identity from their Supabase
  session — nothing trusts a client-supplied worker/customer ID.
