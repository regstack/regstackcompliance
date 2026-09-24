# DORA Register of Information — preliminary field gap analysis

**Status: PRELIMINARY. Do not present this as a verified compliance check.** This was compiled on
2026-09-19/20, then given a follow-up pass on 2026-09-24 (see bottom), without direct access to the
authoritative source (the EBA's official "Data Model for DORA RoI" PDF and Commission Implementing
Regulation (EU) 2024/2956, Annexes). Every sandbox this has been written from so far blocks *all*
outbound HTTP fetches wholesale — confirmed again on 2026-09-24 against eba.europa.eu,
eur-lex.europa.eu, and three independent third-party regulatory-guide domains, all `EGRESS_BLOCKED`.
Only search-engine result snippets get through, not the full authoritative text or any direct page
fetch. Everything below is inference from those snippets, cross-checked against
`prisma/schema.prisma`. **Before any real filing or a compliance-sensitive customer conversation,
get the actual EBA Data Model PDF (link below) and re-verify field-by-field, from an environment
that isn't network-restricted this way.**

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
| 6 | No arrangement "type" (standalone / master agreement / sub-arrangement) | **Upgraded to high confidence 2026-09-24** — a snippet quoting the ITS text itself describes the reference-number field covering "overarching or framework arrangements" (incl. master/framework) and "subsequent or associated arrangements" (incl. implementing arrangements, subservice arrangements, order forms) — a 3-way taxonomy, not exactly the 3 guessed originally, but confirms the field exists and is required. |
| 7 | No governing law field | **Corrected 2026-09-24, high confidence**: a real EBA Single Rulebook Q&A citation surfaced (publicId `2024_7279`, "Template specific instructions – field **B_02.02.0130** (Country of the governing law of the contractual arrangement)") — this field lives on **B_02.02**, not B_02.01 as originally guessed. Worth double-checking which other "B_02.01" gaps below actually belong on B_02.02 once the primary text is in hand. |
| 8 | No substitutability assessment, distinct from `supportsCriticalFunction` | Snippets describe substitutability as its own flag alongside the criticality flag, not the same thing. |
| 9 | No explicit "open-ended" boolean | Currently a null `contractEnd` is ambiguous between "not yet entered" and "genuinely open-ended contract" — the register appears to want this stated explicitly. |
| 10 | No renewal-terms field | **Upgraded to high confidence 2026-09-24** — a snippet paraphrasing B_02.01 lists "start/end dates, renewal terms, governing law, and notice period" together as key fields (though per #7 above, governing law itself may actually sit on B_02.02 — the snippet may be conflating the two linked templates). |
| 11 | No annual cost/expense field on `IctArrangement` | **New 2026-09-24, resolves the open question below**: a snippet directly confirms "the annual expense or estimated cost (or intragroup transfer) of the ICT service arrangement for the past year" is a real register data point, "expressed in a specific currency." Note: PR #10 (open, see git history) already adds `annualCostEur` to `IctArrangement` for exactly this — this finding supports keeping that addition regardless of how PR #10's other overlap with master gets resolved. |

## Needs direct verification — not enough evidence either way

- Whether the register requires structured data-storage/processing-location detail beyond the
  current free-text `dataCategories` field — **partially resolved 2026-09-24**: a snippet states
  B_02.02 covers "data storage and processing locations" and calls it a mandatory field "among
  other information required in contractual arrangements templates," but doesn't say whether that's
  mandatory for every arrangement or only criticality-flagged ones. Lean toward assuming mandatory
  until the primary text confirms otherwise.
- The complete, authoritative field list and data types for both templates — only a handful of
  fields were confirmed via snippets, not the full ~200-field set. This remains the biggest gap;
  nothing found on 2026-09-24 closes it, since every attempt to fetch the actual Annex I text
  (including a site — springlex.eu — that appears to host it directly) hit the same network block.

## Recommended next step

Don't restructure the schema off this document alone. Get the actual EBA PDF (link above) or the
CSSF/national-regulator submission guides also referenced in tonight's search results, do a real
line-by-line pass, and only then decide which gaps are worth closing before any customer
conversation that touches DORA register accuracy specifically. For a first sales conversation, the
existing module ("first version, not yet verified 1:1 against the ITS templates," as the README
already states) is honestly positioned — just don't let that caveat quietly disappear.
