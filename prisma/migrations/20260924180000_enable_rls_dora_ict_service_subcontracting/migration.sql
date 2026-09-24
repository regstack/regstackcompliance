-- The two DORA register tables added in 20260920020000_dora_register_gaps were missed by the
-- earlier RLS sweeps because they didn't exist yet. Same "backend only" RLS posture as every
-- other table: enabled with no policies, so only the backend's service-role connection (which
-- bypasses RLS) can reach them — PostgREST/anon/authenticated cannot.
ALTER TABLE "public"."ict_services" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."ict_subcontracting" ENABLE ROW LEVEL SECURITY;
