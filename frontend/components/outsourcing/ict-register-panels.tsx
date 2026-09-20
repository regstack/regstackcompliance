"use client";

import { useState, useTransition } from "react";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import {
  addIctArrangement,
  addIctProvider,
  addIctService,
  deleteIctProvider,
  updateIctArrangement,
  updateIctProvider,
  type ArrangementInput,
  type ProviderInput,
  type ServiceInput,
} from "@/app/(app)/outsourcing/ict-register/actions";
import { IctSubcontractingTree } from "@/components/outsourcing/ict-subcontracting-tree";
import type { IctArrangement, IctProvider, IctService, IctSubcontracting } from "@/lib/regstack/ict-register";

const inputClass =
  "rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs normal-case text-foreground disabled:opacity-50";

const emptyProvider = (): ProviderInput => ({ name: "", legalEntityIdentifier: "", country: "", providerType: "DIREKT", parentUndertaking: "" });

function ProviderForm({ initial, onDone, onCancel }: { initial?: IctProvider; onDone: () => void; onCancel: () => void }) {
  const [form, setForm] = useState<ProviderInput>(() =>
    initial
      ? {
          name: initial.name,
          legalEntityIdentifier: initial.legalEntityIdentifier ?? "",
          country: initial.country ?? "",
          providerType: initial.providerType,
          parentUndertaking: initial.parentUndertaking ?? "",
        }
      : emptyProvider()
  );
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        if (initial) await updateIctProvider(initial.id, form);
        else await addIctProvider(form);
        onDone();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
      }
    });
  }

  return (
    <div className="rounded-md border border-border-strong bg-graphite-950 p-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <input placeholder="Name des Anbieters" value={form.name} disabled={pending}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={inputClass} />
        <input placeholder="LEI (falls vorhanden)" value={form.legalEntityIdentifier} disabled={pending}
          onChange={(e) => setForm((f) => ({ ...f, legalEntityIdentifier: e.target.value }))} className={inputClass} />
        <input placeholder="Land" value={form.country} disabled={pending}
          onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))} className={inputClass} />
        <select value={form.providerType} disabled={pending}
          onChange={(e) => setForm((f) => ({ ...f, providerType: e.target.value as ProviderInput["providerType"] }))} className={inputClass}>
          <option value="DIREKT">Direkter Anbieter</option>
          <option value="KONZERNINTERN">Konzernintern</option>
        </select>
        {form.providerType === "KONZERNINTERN" && (
          <input placeholder="Mutterunternehmen" value={form.parentUndertaking} disabled={pending}
            onChange={(e) => setForm((f) => ({ ...f, parentUndertaking: e.target.value }))} className={inputClass} />
        )}
      </div>
      {error && <p className="mt-2 text-xs text-status-danger">{error}</p>}
      <div className="mt-2 flex gap-2">
        <Button className="px-2.5 py-1 text-xs" disabled={pending || !form.name.trim()} onClick={submit}>
          {pending ? "Speichert…" : "Speichern"}
        </Button>
        <Button variant="ghost" className="px-2.5 py-1 text-xs" disabled={pending} onClick={onCancel}>Abbrechen</Button>
      </div>
    </div>
  );
}

export function IctProvidersPanel({ providers, canWrite }: { providers: IctProvider[]; canWrite: boolean }) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function remove(id: string) {
    setDeleteError(null);
    startTransition(async () => {
      try {
        await deleteIctProvider(id);
      } catch (e) {
        setDeleteError(e instanceof Error ? e.message : "Löschen fehlgeschlagen.");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>IKT-Drittanbieter</CardTitle>
        {canWrite && !adding && <Button variant="secondary" className="px-2.5 py-1 text-xs" onClick={() => setAdding(true)}>+ Anbieter</Button>}
      </CardHeader>
      <CardBody>
        {adding && <div className="mb-3"><ProviderForm onDone={() => setAdding(false)} onCancel={() => setAdding(false)} /></div>}
        {deleteError && <p className="mb-2 text-xs text-status-danger">{deleteError}</p>}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">LEI</th>
                <th className="px-3 py-2 font-medium">Land</th>
                <th className="px-3 py-2 font-medium">Typ</th>
                {canWrite && <th className="px-3 py-2" />}
              </tr>
            </thead>
            <tbody>
              {providers.map((p) =>
                editingId === p.id ? (
                  <tr key={p.id}><td colSpan={5} className="px-3 py-3"><ProviderForm initial={p} onDone={() => setEditingId(null)} onCancel={() => setEditingId(null)} /></td></tr>
                ) : (
                  <tr key={p.id} className="border-b border-border-subtle last:border-0">
                    <td className="px-3 py-2 font-medium text-foreground">{p.name}</td>
                    <td className="px-3 py-2 text-muted-foreground">{p.legalEntityIdentifier ?? "—"}</td>
                    <td className="px-3 py-2 text-muted-foreground">{p.country ?? "—"}</td>
                    <td className="px-3 py-2 text-muted-foreground">{p.providerType === "KONZERNINTERN" ? "Konzernintern" : "Direkt"}</td>
                    {canWrite && (
                      <td className="px-3 py-2 text-right">
                        <Button variant="ghost" className="px-2 py-1 text-xs" onClick={() => setEditingId(p.id)}>Bearbeiten</Button>
                        <Button variant="ghost" className="px-2 py-1 text-xs text-status-danger" disabled={pending} onClick={() => remove(p.id)}>Löschen</Button>
                      </td>
                    )}
                  </tr>
                )
              )}
              {providers.length === 0 && (
                <tr><td colSpan={5} className="px-3 py-6 text-center text-xs text-muted-foreground">Noch keine Anbieter erfasst.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </CardBody>
    </Card>
  );
}

const emptyArrangement = (providerId: string): ArrangementInput => ({
  providerId,
  functionDescription: "",
  supportsCriticalFunction: false,
  criticalityReason: "",
  contractStart: "",
  contractEnd: "",
  terminationNoticeMonths: "",
  annualCostEur: "",
  exitStrategyNote: "",
  dataCategories: "",
  hasSubcontracting: false,
  subcontractingNote: "",
  status: "AKTIV",
});

function ArrangementForm({
  initial, providers, onDone, onCancel,
}: {
  initial?: IctArrangement;
  providers: IctProvider[];
  onDone: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<ArrangementInput>(() =>
    initial
      ? {
          providerId: initial.providerId,
          functionDescription: initial.functionDescription,
          supportsCriticalFunction: initial.supportsCriticalFunction,
          criticalityReason: initial.criticalityReason ?? "",
          contractStart: initial.contractStart?.slice(0, 10) ?? "",
          contractEnd: initial.contractEnd?.slice(0, 10) ?? "",
          terminationNoticeMonths: initial.terminationNoticeMonths?.toString() ?? "",
          annualCostEur: initial.annualCostEur?.toString() ?? "",
          exitStrategyNote: initial.exitStrategyNote ?? "",
          dataCategories: initial.dataCategories ?? "",
          hasSubcontracting: initial.hasSubcontracting,
          subcontractingNote: initial.subcontractingNote ?? "",
          status: initial.status,
        }
      : emptyArrangement(providers[0]?.id ?? "")
  );
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        if (initial) await updateIctArrangement(initial.id, form);
        else await addIctArrangement(form);
        onDone();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
      }
    });
  }

  return (
    <div className="rounded-md border border-border-strong bg-graphite-950 p-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <select value={form.providerId} disabled={pending}
          onChange={(e) => setForm((f) => ({ ...f, providerId: e.target.value }))} className={inputClass}>
          <option value="" disabled>— Anbieter wählen —</option>
          {providers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select value={form.status} disabled={pending}
          onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as ArrangementInput["status"] }))} className={inputClass}>
          <option value="AKTIV">Aktiv</option>
          <option value="BEENDET">Beendet</option>
        </select>
        <input placeholder="Erbrachte IKT-Funktion/-Dienstleistung" value={form.functionDescription} disabled={pending}
          onChange={(e) => setForm((f) => ({ ...f, functionDescription: e.target.value }))} className={`${inputClass} sm:col-span-2`} />
        <label className="flex flex-col gap-1 text-[10.5px] font-medium uppercase tracking-wide text-muted-foreground">
          Vertragsbeginn
          <input type="date" value={form.contractStart} disabled={pending}
            onChange={(e) => setForm((f) => ({ ...f, contractStart: e.target.value }))} className={inputClass} />
        </label>
        <label className="flex flex-col gap-1 text-[10.5px] font-medium uppercase tracking-wide text-muted-foreground">
          Vertragsende
          <input type="date" value={form.contractEnd} disabled={pending}
            onChange={(e) => setForm((f) => ({ ...f, contractEnd: e.target.value }))} className={inputClass} />
        </label>
        <input type="number" placeholder="Kündigungsfrist (Monate)" value={form.terminationNoticeMonths} disabled={pending}
          onChange={(e) => setForm((f) => ({ ...f, terminationNoticeMonths: e.target.value }))} className={inputClass} />
        <input type="number" placeholder="Jahreskosten (EUR)" value={form.annualCostEur} disabled={pending}
          onChange={(e) => setForm((f) => ({ ...f, annualCostEur: e.target.value }))} className={inputClass} />
        <input placeholder="Datenkategorien" value={form.dataCategories} disabled={pending}
          onChange={(e) => setForm((f) => ({ ...f, dataCategories: e.target.value }))} className={inputClass} />
        <input placeholder="Exit-Strategie" value={form.exitStrategyNote} disabled={pending}
          onChange={(e) => setForm((f) => ({ ...f, exitStrategyNote: e.target.value }))} className={inputClass} />
      </div>

      <label className="mt-2 flex items-center gap-2 text-xs text-foreground">
        <input type="checkbox" checked={form.supportsCriticalFunction} disabled={pending}
          onChange={(e) => setForm((f) => ({ ...f, supportsCriticalFunction: e.target.checked }))} />
        Unterstützt eine kritische oder wichtige Funktion (Art. 28 Abs. 3)
      </label>
      {form.supportsCriticalFunction && (
        <textarea placeholder="Begründung — Pflichtfeld" value={form.criticalityReason} disabled={pending} rows={2}
          onChange={(e) => setForm((f) => ({ ...f, criticalityReason: e.target.value }))}
          className={`${inputClass} mt-2 w-full`} />
      )}

      <label className="mt-2 flex items-center gap-2 text-xs text-foreground">
        <input type="checkbox" checked={form.hasSubcontracting} disabled={pending}
          onChange={(e) => setForm((f) => ({ ...f, hasSubcontracting: e.target.checked }))} />
        Weiterverlagerung an Subunternehmer
      </label>
      {form.hasSubcontracting && (
        <textarea placeholder="Hinweis zur Weiterverlagerungskette" value={form.subcontractingNote} disabled={pending} rows={2}
          onChange={(e) => setForm((f) => ({ ...f, subcontractingNote: e.target.value }))}
          className={`${inputClass} mt-2 w-full`} />
      )}

      {error && <p className="mt-2 text-xs text-status-danger">{error}</p>}
      <div className="mt-2 flex gap-2">
        <Button className="px-2.5 py-1 text-xs" disabled={pending || !form.providerId || !form.functionDescription.trim()} onClick={submit}>
          {pending ? "Speichert…" : "Speichern"}
        </Button>
        <Button variant="ghost" className="px-2.5 py-1 text-xs" disabled={pending} onClick={onCancel}>Abbrechen</Button>
      </div>
    </div>
  );
}

const emptyService: ServiceInput = { serviceDescription: "", serviceLevelObjective: "" };

// ITS-Ebene 4 — mehrere separate IKT-Dienstleistungen je Vertragsverhältnis mit eigenen
// Service-Level-Objectives, additiv zur Kurzbeschreibung in functionDescription.
function IctServicesList({ arrangementId, services, canWrite }: { arrangementId: string; services: IctService[]; canWrite: boolean }) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<ServiceInput>(emptyService);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        await addIctService(arrangementId, form);
        setForm(emptyService);
        setAdding(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
      }
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-graphite-500">IKT-Dienstleistungen</h4>
        {canWrite && !adding && <Button variant="ghost" className="px-2 py-0.5 text-xs" onClick={() => setAdding(true)}>+ Dienstleistung</Button>}
      </div>
      {services.length === 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">Keine separaten Dienstleistungen erfasst.</p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {services.map((s) => (
            <li key={s.id} className="rounded-md border border-border-subtle bg-graphite-900/60 px-3 py-2 text-xs">
              <span className="text-foreground">{s.serviceDescription}</span>
              {s.serviceLevelObjective && <span className="ml-2 text-muted-foreground">— SLO: {s.serviceLevelObjective}</span>}
            </li>
          ))}
        </ul>
      )}
      {adding && (
        <div className="mt-2 space-y-2 rounded-md border border-border-strong bg-graphite-950 p-3">
          <input value={form.serviceDescription} disabled={pending} placeholder="Dienstleistung"
            onChange={(e) => setForm({ ...form, serviceDescription: e.target.value })} className={`${inputClass} w-full`} />
          <input value={form.serviceLevelObjective ?? ""} disabled={pending} placeholder="Service-Level-Objective (optional)"
            onChange={(e) => setForm({ ...form, serviceLevelObjective: e.target.value })} className={`${inputClass} w-full`} />
          {error && <p className="text-xs text-status-danger">{error}</p>}
          <div className="flex gap-2">
            <Button className="px-2.5 py-1 text-xs" disabled={pending || !form.serviceDescription.trim()} onClick={submit}>Speichern</Button>
            <Button variant="ghost" className="px-2.5 py-1 text-xs" disabled={pending} onClick={() => setAdding(false)}>Abbrechen</Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function IctArrangementsPanel({
  arrangements, providers, servicesByArrangement, subcontractingByArrangement, canWrite,
}: {
  arrangements: IctArrangement[];
  providers: IctProvider[];
  servicesByArrangement: Record<string, IctService[]>;
  subcontractingByArrangement: Record<string, IctSubcontracting[]>;
  canWrite: boolean;
}) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vertragsverhältnisse</CardTitle>
        <div className="flex items-center gap-2">
          {/* A real file download (Content-Disposition: attachment) from a Route Handler, not a
              page navigation — next/link's client-side routing isn't the right tool here. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/outsourcing/ict-register/export" className="text-xs text-copper-400 hover:underline">Export (CSV)</a>
          {canWrite && !adding && providers.length > 0 && (
            <Button variant="secondary" className="px-2.5 py-1 text-xs" onClick={() => setAdding(true)}>+ Vertragsverhältnis</Button>
          )}
        </div>
      </CardHeader>
      <CardBody>
        {providers.length === 0 && (
          <p className="mb-3 text-xs text-muted-foreground">Zuerst mindestens einen Anbieter oben anlegen.</p>
        )}
        {adding && <div className="mb-3"><ArrangementForm providers={providers} onDone={() => setAdding(false)} onCancel={() => setAdding(false)} /></div>}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2 font-medium">Anbieter</th>
                <th className="px-3 py-2 font-medium">Funktion</th>
                <th className="px-3 py-2 font-medium">Kritisch/Wichtig</th>
                <th className="px-3 py-2 font-medium">Jahreskosten</th>
                <th className="px-3 py-2 font-medium">Vertragsende</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {arrangements.map((a) =>
                editingId === a.id ? (
                  <tr key={a.id}><td colSpan={7} className="px-3 py-3"><ArrangementForm initial={a} providers={providers} onDone={() => setEditingId(null)} onCancel={() => setEditingId(null)} /></td></tr>
                ) : (
                  <>
                    <tr key={a.id} className="border-b border-border-subtle last:border-0">
                      <td className="px-3 py-2 font-medium text-foreground">{a.provider.name}</td>
                      <td className="px-3 py-2 text-muted-foreground">{a.functionDescription}</td>
                      <td className="px-3 py-2">{a.supportsCriticalFunction ? <StatusPill status="wesentlich" label="Kritisch/wichtig" /> : "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground">{a.annualCostEur != null ? `${a.annualCostEur.toLocaleString("de-DE")} €` : "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground">{a.contractEnd?.slice(0, 10) ?? "—"}</td>
                      <td className="px-3 py-2"><StatusPill status={a.status === "AKTIV" ? "aktiv" : "beendet"} /></td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        <Button variant="ghost" className="px-2 py-1 text-xs" onClick={() => setExpandedId(expandedId === a.id ? null : a.id)}>
                          {expandedId === a.id ? "Details schließen" : "Details"}
                        </Button>
                        {canWrite && <Button variant="ghost" className="px-2 py-1 text-xs" onClick={() => setEditingId(a.id)}>Bearbeiten</Button>}
                      </td>
                    </tr>
                    {expandedId === a.id && (
                      <tr key={`${a.id}-details`} className="border-b border-border-subtle last:border-0">
                        <td colSpan={7} className="space-y-4 bg-graphite-950/40 px-4 py-4">
                          <IctServicesList arrangementId={a.id} services={servicesByArrangement[a.id] ?? []} canWrite={canWrite} />
                          {a.exitStrategyNote && (
                            <div>
                              <h4 className="text-xs font-semibold uppercase tracking-wide text-graphite-500">Exit-Strategie</h4>
                              <p className="mt-1 text-xs text-foreground">{a.exitStrategyNote}</p>
                            </div>
                          )}
                          <IctSubcontractingTree arrangementId={a.id} chain={subcontractingByArrangement[a.id] ?? []} canWrite={canWrite} />
                        </td>
                      </tr>
                    )}
                  </>
                )
              )}
              {arrangements.length === 0 && (
                <tr><td colSpan={7} className="px-3 py-6 text-center text-xs text-muted-foreground">Noch keine Vertragsverhältnisse erfasst.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </CardBody>
    </Card>
  );
}
