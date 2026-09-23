-- CreateTable
CREATE TABLE "public"."rate_limit_buckets" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "resetAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rate_limit_buckets_pkey" PRIMARY KEY ("key")
);

-- Same backend-only lockdown as every other table (see the two 2026-09-19 RLS migrations): no
-- policies, so only the backend's own privileged Postgres connection can read/write. Written
-- into this same migration (rather than a separate later one) so this table is never RLS-less
-- for even one deploy.
ALTER TABLE "public"."rate_limit_buckets" ENABLE ROW LEVEL SECURITY;
