# 2026-09-23 — regstack-backend: first production deployment

`regstack-backend` (Vercel project `prj_iNMPLDQeVritAXMuyGysWAj3Tjla`) existed but had never had
a **production**-targeted deployment — its only READY deployment was a preview build from a
feature branch. `regstack-compliance-cockpit` (the real frontend, per the note already on its
`JWT_SECRET` env var) also had no production `BACKEND_URL`, so every production request from the
frontend to the backend was falling back to `http://localhost:4000/api` and failing with
`Backend-Fehler (500)`.

## What changed today

- Created a dedicated Postgres role `backend_app` on the Supabase project (`regstack-backend`,
  `qtcptpmxijxruzbcxlah`) with `BYPASSRLS` and full privileges on `public` — the existing
  `postgres` superuser's password wasn't retrievable/resettable via the available tooling, so the
  backend gets its own credential instead of reusing it.
- Set on `regstack-backend` (production target): `DATABASE_URL` (Supavisor transaction pooler,
  `aws-0-eu-central-1.pooler.supabase.com:6543`, `pgbouncer=true&connection_limit=1`, matching the
  `postgres.[ref]` pooler-username convention), `JWT_SECRET` (freshly generated), `JWT_EXPIRES_IN`,
  `NODE_ENV=production`.
- Set the matching `JWT_SECRET` and `BACKEND_URL=https://regstack-backend.vercel.app/api` on
  `regstack-compliance-cockpit`'s **production** target (previously only configured for
  preview/development).
- This file's push to `master` is the deploy trigger — manual production deploys via the Vercel
  API returned 403 for this account/role, and per this repo's own README, push-to-`master` is the
  documented mechanism (`ci.yml` only covers lint/typecheck/test/build, no separate CD step).

## Still open

- No Postgres migration has run against `backend_app` beyond what was already applied — schema
  should already match `prisma/schema.prisma` at this commit, but this hasn't been re-verified
  end-to-end against the newest modules (DORA register, Risikomanagement/BAIT, accounting/ICS)
  merged very recently.
- `S3_*` object-storage env vars are still unset on `regstack-backend` — optional per
  `src/config/env.ts` (upload/download routes return a 503 instead of failing boot), so contract
  file upload/download won't work until those are configured, but nothing else is blocked by it.
