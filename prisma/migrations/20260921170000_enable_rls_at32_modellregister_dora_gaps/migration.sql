-- The four tables added after 20260919200000_enable_rls_new_module_tables_backend_only
-- (AT 3.2 AufsichtsorganBericht, AT 4.3.4 Modellregister, DORA IctService/IctSubcontracting)
-- were missed by that sweep because they didn't exist yet. Same "backend only" RLS posture
-- as every other table: enabled with no policies, so only the backend's service-role
-- connection (which bypasses RLS) can reach them — PostgREST/anon/authenticated cannot.
ALTER TABLE "public"."rm_aufsichtsorgan_berichte" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."rm_modellregister" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."ict_services" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."ict_subcontracting" ENABLE ROW LEVEL SECURITY;
