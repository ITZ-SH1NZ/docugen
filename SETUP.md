# Setup — Document Automation Platform

Full-stack SaaS: upload PDF templates, place fields on a canvas, batch-generate
personalized PDFs from CSV, review flagged documents, and download results.

**Stack:** Next.js (App Router, TypeScript) · Supabase (Auth + Postgres + Storage,
with RLS) · `pdf-lib` generation engine · `react-konva` editor.

> **No queue / no Redis.** Batches generate *in-process* on the Next.js server,
> kicked off after the HTTP response via Next's `after()`. Progress is written to the
> `batches` row and streamed to the browser over SSE. This is the right call at small
> scale — one less service, zero cost. (Upgrade path if you ever need durable
> background jobs without Redis: `pg-boss`, which runs a queue on the Supabase
> Postgres you already have.)
>
> The engine is Node + `pdf-lib` (not the C/libharu binary some specs mention):
> libharu cannot overlay onto an existing template PDF, and `pdf-lib` runs inline in
> the same Node process.

---

## Prerequisites

- Node.js **18.18+** (20/22/24 fine)
- A **Supabase** project (free tier is fine)

That's it — no Redis, no worker process.

## 1. Install

```bash
npm install --legacy-peer-deps
```

## 2. Supabase

1. Create a project at https://supabase.com.
2. **SQL Editor** → paste and run [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql).
   This creates the tables, RLS policies, and the private `templates` + `batches`
   storage buckets.
3. **Project Settings → API** → copy the Project URL, the `anon` key, and the
   `service_role` key.
4. (Optional) **Authentication → Providers → Email**: turn *off* "Confirm email"
   for the smoothest local signup, or leave it on and confirm via the emailed link.

## 3. Environment

```bash
cp .env.example .env.local
```

Fill in:

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...        # server only — never exposed to the browser
```

## 4. Run

```bash
npm run dev
```

Open http://localhost:3000 → sign up → you're in. A single process serves the UI,
the API, and runs generation.

---

## Using it

1. **Templates** → *New template*: upload a PDF, name it. You're taken to the editor.
2. **Editor**: click **+ Add field**, then drag/resize the box on the canvas. In the
   right panel set the **CSV column**, label, font, alignment, color, min/max font
   size, transform, and wrap. Click **Save fields**.
3. **Generate**: pick the template, upload a header-less CSV (one row per document),
   review the preview/warnings, click **Generate**.
4. **Progress**: live via SSE. When done it flips to the **review** view.
5. **Review**: see flagged rows (shrunk / wrapped / truncated), preview each PDF
   inline, **Edit text → Save & regenerate** a single PDF, or **Download all (.zip)**.

A ready-made sample lives in [`test/`](test/) — generate the sample template PDF with
`npm run engine:sample`, then upload `test/certificate_template.pdf` and use
`test/test_data.csv`.

---

## How it fits together

```
Browser (Next.js + react-konva editor, CSV upload, SSE progress, review)
   │  HTTP
Next.js API routes  ──upload──▶ Supabase Storage (templates / batches, private)
   │                            Supabase Postgres (RLS: each user sees only theirs)
   │  after(response): processBatch(batchId)   ← runs in the same Node process
   ▼
processBatch:  download template+CSV → pdf-lib engine (src/) → upload per-row PDFs
               + results.zip + metadata.json → write batch_pdfs / flagged_pdfs,
               update progress (polled by the SSE endpoint)
```

- **RLS** gates every table by `auth.uid()`; child tables (fields, flagged, batch_pdfs)
  are gated through their parent's `user_id`.
- **Storage** buckets are private; the browser only ever gets short-lived **signed
  URLs** minted server-side.
- Generation uses the service-role key (bypasses RLS) to write results.

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Next.js dev server (UI + API + generation) |
| `npm run build` / `npm start` | Production build / serve |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run engine:test` | Standalone engine smoke test (no Supabase needed) |
| `npm run cli -- --template t.json --csv d.csv --output-dir ./out` | Engine CLI |

---

## What I verified vs. what needs your services

- ✅ `npm run build` passes (18 routes, types valid); `tsc --noEmit` clean.
- ✅ The `pdf-lib` engine is unit-tested (`npm run engine:test`) incl. shrink/wrap/truncate.
- ⚠️ The end-to-end flow (auth → upload → generate → review) was **not** run by me
  because it requires *your* Supabase project. The first run is the moment to watch the
  dev-server console — most first-time issues are env/RLS/bucket related.

## A note on deployment

Because generation runs in-process via `after()`, deploy on a **persistent Node
server** (`npm start` on Railway / Render / Fly / a small VM) so long batches finish.
**Serverless (e.g. Vercel functions)** can freeze or time-out `after()` work mid-batch
— if you must deploy there, that's the point to introduce `pg-boss` (queue on Supabase
Postgres) + a small always-on worker. For your current scale, a single Node instance
is simplest and free.

## Not implemented (from the v2 "nice to have" list)

Rate limiting, virus scanning (ClamAV), QR/image/barcode field types, team sharing,
webhooks, payments, analytics. The schema leaves room (`field_type`) for the richer
field types.
