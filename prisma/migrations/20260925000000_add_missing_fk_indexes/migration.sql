-- Adds covering indexes for foreign key columns flagged by Supabase's performance advisor
-- (unindexed_foreign_keys lint) after the 2026-09-24/25 migrations. Purely additive, no data
-- or behavior change.

-- CreateIndex
CREATE INDEX "compliance_aenderungen_quelleId_idx" ON "compliance_aenderungen"("quelleId");

-- CreateIndex
CREATE INDEX "compliance_funktionswechsel_funktionId_idx" ON "compliance_funktionswechsel"("funktionId");

-- CreateIndex
CREATE INDEX "compliance_norm_risiken_risikoId_idx" ON "compliance_norm_risiken"("risikoId");

-- CreateIndex
CREATE INDEX "compliance_risiko_kontrollen_kontrolleId_idx" ON "compliance_risiko_kontrollen"("kontrolleId");

-- CreateIndex
CREATE INDEX "ics_control_processes_businessProcessId_idx" ON "ics_control_processes"("businessProcessId");

-- CreateIndex
CREATE INDEX "ics_policy_processes_businessProcessId_idx" ON "ics_policy_processes"("businessProcessId");

-- CreateIndex
CREATE INDEX "ics_policy_controls_controlId_idx" ON "ics_policy_controls"("controlId");

-- CreateIndex
CREATE INDEX "accounting_balance_sheets_previousVersionId_idx" ON "accounting_balance_sheets"("previousVersionId");

-- CreateIndex
CREATE INDEX "accounting_income_statements_previousVersionId_idx" ON "accounting_income_statements"("previousVersionId");

-- CreateIndex
CREATE INDEX "accounting_notes_previousVersionId_idx" ON "accounting_notes"("previousVersionId");

-- CreateIndex
CREATE INDEX "accounting_management_reports_previousVersionId_idx" ON "accounting_management_reports"("previousVersionId");

-- CreateIndex
CREATE INDEX "nachweise_previousVersionId_idx" ON "nachweise"("previousVersionId");

-- CreateIndex
CREATE INDEX "revision_sonderwissen_pruefungId_idx" ON "revision_sonderwissen"("pruefungId");
