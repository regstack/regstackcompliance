# DORA Register of Information — preliminary field gap analysis

**Status: PRELIMINARY. Do not present this as a verified compliance check.** This was compiled on
2026-09-19/20 without direct access to the authoritative source (the EBA's official "Data Model for
DORA RoI" PDF and Commission Implementing Regulation (EU) 2024/2956, Annexes). The sandbox this was
written in blocks outbound access to eba.europa.eu, eur-lex.europa.eu, and every industry-guide
domain tried — only search-engine result snippets were available, not the full authoritative text.
Everything below is inference from those snippets, cross-checked against `prisma/schema.prisma`.
**Before any real filing or a compliance-sensitive customer conversation, get the actual EBA Data
Model PDF (link below) and re-verify field-by-field.**

Source to fetch when unblocked: `https://www.eba.europa.eu/sites/default/files/2025-04/035dd2b6-c7e3-4c7d-954f-6ffd41903de2/Data%20Model%20for%20DORA%20RoI.pdf`
("Data Model for DORA RoI.pdf")

## What the official register looks like (from available snippets)

15 interconnected templates, ~200 fields total, submitted as xBRL-CSV, grouped:
01 entity/scope, 02 contractual arrangements, 03 signatories, 04 entities using services,
05 providers/supply chain, 06 functions, 07 assessments, 99 definitions.

Two templates are most directly comparable to `IctProvider`/`IctArrangement`:

- **B_05.01** — provider master list/identification (every direct provider, intra-group provider,
  subcontractor, and ultimate parent, each as its own registered entity)
- **B_02.01** — contractual arrangement general information (the "hub" record other templates
  reference by a shared contract reference number)

## Current model

`IctProvider`: `name`, `legalEntityIdentifier` (optional), `country`, `providerType`
(`DIREKT`/`KONZERNINTERN` only), `parentUndertaking` (free text).

`IctArrangement`: `functionDescription`, `supportsCriticalFunction`, `criticalityReason`,
`contractStart`/`contractEnd`, `terminationNoticeMonths`, `dataCategories` (free text),
`hasSubcontracting`, `subcontractingNote` (free text), `status`.

## Likely gaps (moderate-to-high confidence from snippets — verify before acting)

| # | Gap | Why it likely matters |
|---|---|---|
| 1 | No CTPP (Critical ICT Third-Party Provider) designation field on `IctProvider` | The register is the ESAs' primary data source for CTPP designation under Art. 31 — a required flag per snippet evidence. |
| 2 | No "type of identification code" fallback when LEI is absent | `legalEntityIdentifier` is just an optional string; the official template (B_05.01 c0020 per snippets) expects an explicit code-type indicator when LEI isn't used, not a silently-empty field. |
| 3 | `parentUndertaking` is free text, not a structured reference | The register appears to want the parent as its own registered provider entity (with its own LEI/code), linked by reference — not a text field on the child. |
| 4 | `providerType` enum too narrow (`DIREKT`/`KONZERNINTERN` only) | The register's provider taxonomy (direct / intra-group / subcontractor-as-own-entity / ultimate parent) doesn't map cleanly onto 2 values — subcontractors here are only a free-text note on the arrangement (`subcontractingNote`), not a registered provider entity with their own identity, country, LEI. |
| 5 | No stable, business-facing contract reference number on `IctArrangement` | Per snippets, B_02.01 assigns a reference number reused consistently across all 15 templates — the DB `id` (UUID) isn't that; a mismatch/inconsistent reference is called out as "one of the most common errors" in register submissions. |
| 6 | No arrangement "type" (standalone / master agreement / sub-arrangement) | Referenced as a required B_02.01 field in snippets. |
| 7 | No governing law field | Referenced as a required B_02.01 field in snippets. |
| 8 | No substitutability assessment, distinct from `supportsCriticalFunction` | Snippets describe substitutability as its own flag alongside the criticality flag, not the same thing. |
| 9 | No explicit "open-ended" boolean | Currently a null `contractEnd` is ambiguous between "not yet entered" and "genuinely open-ended contract" — the register appears to want this stated explicitly. |
| 10 | No renewal-terms field | Referenced in snippets as part of B_02.01. |

## Needs direct verification — not enough evidence either way

- Whether the register requires structured data-storage/processing-location detail beyond the
  current free-text `dataCategories` field (one snippet mentioned a linked template, B_02.02,
  covering exactly this — unconfirmed whether it's mandatory for all arrangements or only
  criticality-flagged ones).
- Whether an annual cost/expense figure per arrangement is required (common in comparable EU
  registers; not confirmed for this one from available snippets).
- The complete, authoritative field list and data types for both templates — only a handful of
  fields were confirmed via snippets, not the full ~200-field set.

## Recommended next step

Don't restructure the schema off this document alone. Get the actual EBA PDF (link above) or the
CSSF/national-regulator submission guides also referenced in tonight's search results, do a real
line-by-line pass, and only then decide which gaps are worth closing before any customer
conversation that touches DORA register accuracy specifically. For a first sales conversation, the
existing module ("first version, not yet verified 1:1 against the ITS templates," as the README
already states) is honestly positioned — just don't let that caveat quietly disappear.
