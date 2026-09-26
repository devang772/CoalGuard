import { useCallback, useEffect, useState } from "react";
import { ClipboardCheck, RefreshCw, Plus, Eye, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getInspectionsApi, getInspectionDetailApi, getMinesApi, getChecklistsApi, startInspectionApi, type Page, type Row } from "@/lib/api";
import { useAppStore } from "@/store/useAppStore";

const fmt = (v: unknown) => v === null || v === undefined || v === "" ? "—" : String(v);
const ist = (v: unknown) => { try { return new Date(String(v)).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }); } catch { return fmt(v); } };
const statusClass: Record<string, string> = { submitted: "text-emerald-700 bg-emerald-50 border-emerald-200", in_progress: "text-amber-700 bg-amber-50 border-amber-200" };
const typeClass: Record<string, string> = { internal: "text-blue-700 bg-blue-50 border-blue-200", statutory: "text-purple-700 bg-purple-50 border-purple-200", dgms: "text-orange-700 bg-orange-50 border-orange-200", spcb: "text-teal-700 bg-teal-50 border-teal-200" };

function InspectionDetail({ id, close }: { id: number; close: () => void }) {
  const [detail, setDetail] = useState<Row | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getInspectionDetailApi(id).then(d => { if (!cancelled) setDetail(d); }).catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : "Failed"); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  const findings = Array.isArray(detail?.findings) ? detail.findings as Row[] : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <section role="dialog" aria-modal="true" className="dashboard-card w-full max-w-2xl bg-card p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between border-b pb-3 mb-4">
          <div><p className="text-xs text-muted-foreground">Inspection #{id}</p><h2 className="font-display text-xl font-bold">{detail ? fmt(detail.mine_name) : "Loading…"}</h2></div>
          <Button variant="ghost" size="icon" onClick={close}><X className="size-4" /></Button>
        </div>
        {loading && <p className="text-muted-foreground">Loading…</p>}
        {error && <p className="text-red-600 text-sm">{error}</p>}
        {detail && !loading && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              {[["Type", fmt(detail.type)], ["Status", fmt(detail.status)], ["Inspector", fmt(detail.inspector_name)], ["Findings", fmt(detail.findings_count)]].map(([l, v]) => (
                <div key={String(l)} className="rounded-lg border p-2 text-xs"><p className="text-muted-foreground">{l}</p><p className="font-semibold mt-0.5">{v}</p></div>
              ))}
            </div>
            <div className="text-xs text-muted-foreground">{ist(detail.started_at)} → {detail.submitted_at ? ist(detail.submitted_at) : "In progress"}</div>
            {detail.notes && <div className="rounded-lg bg-muted/30 p-3 text-sm"><p className="font-semibold mb-1">Notes</p><p className="text-muted-foreground">{fmt(detail.notes)}</p></div>}
            {findings.length > 0 && (
              <div>
                <p className="font-semibold text-sm mb-2">Findings ({findings.length})</p>
                <div className="space-y-2">
                  {findings.map(f => (
                    <div key={fmt(f.id)} className={`rounded-lg border p-3 text-xs ${fmt(f.severity) === "critical" ? "border-red-200 bg-red-50" : ""}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold uppercase">{fmt(f.category)}</span>
                        <span className={fmt(f.severity) === "critical" ? "text-red-700 font-semibold" : "text-amber-700"}>{fmt(f.severity)}</span>
                        {f.capa_id && <span className="text-purple-700">CAPA #{fmt(f.capa_id)}</span>}
                      </div>
                      <p>{fmt(f.description)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function StartInspectionDialog({ mines, close, reload }: { mines: Row[]; close: () => void; reload: () => Promise<void> }) {
  const [mineId, setMineId] = useState(mines[0] ? fmt(mines[0].id) : "");
  const [type, setType] = useState("internal");
  const [checklists, setChecklists] = useState<Row[]>([]);
  const [checklistId, setChecklistId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!mineId) return;
    void getChecklistsApi(Number(mineId)).then(cl => { setChecklists(cl); setChecklistId(cl[0] ? fmt(cl[0].id) : ""); }).catch(() => setChecklists([]));
  }, [mineId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mineId) { setError("Select a mine."); return; }
    setSubmitting(true); setError(null);
    try {
      await startInspectionApi({ mine_id: Number(mineId), type, checklist_id: checklistId ? Number(checklistId) : undefined });
      await reload(); close();
    } catch (err) { setError(err instanceof Error ? err.message : "Failed to start inspection"); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <section role="dialog" aria-modal="true" className="dashboard-card w-full max-w-lg bg-card p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b pb-3 mb-4">
          <h3 className="font-display text-lg font-bold">Start Inspection</h3>
          <Button variant="ghost" size="icon" onClick={close}><X className="size-4" /></Button>
        </div>
        <form onSubmit={e => void submit(e)} className="space-y-4">
          <label className="block text-sm font-medium">Mine *
            <select required value={mineId} onChange={e => setMineId(e.target.value)} className="mt-1 block w-full rounded-md border bg-background p-2 text-sm">
              {mines.map(m => <option key={fmt(m.id)} value={fmt(m.id)}>{fmt(m.name)}</option>)}
            </select>
          </label>
          <label className="block text-sm font-medium">Type *
            <select value={type} onChange={e => setType(e.target.value)} className="mt-1 block w-full rounded-md border bg-background p-2 text-sm">
              <option value="internal">Internal</option>
              <option value="statutory">Statutory</option>
              <option value="dgms">DGMS</option>
              <option value="spcb">SPCB</option>
            </select>
          </label>
          {checklists.length > 0 && (
            <label className="block text-sm font-medium">Checklist
              <select value={checklistId} onChange={e => setChecklistId(e.target.value)} className="mt-1 block w-full rounded-md border bg-background p-2 text-sm">
                <option value="">No checklist</option>
                {checklists.map(cl => <option key={fmt(cl.id)} value={fmt(cl.id)}>{fmt(cl.name)}</option>)}
              </select>
            </label>
          )}
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={close}>Cancel</Button>
            <Button disabled={submitting}>{submitting ? "Starting…" : "Start inspection"}</Button>
          </div>
        </form>
      </section>
    </div>
  );
}

export function InspectionsView() {
  const { user } = useAppStore();
  const [page, setPage] = useState<Page<Row> | null>(null);
  const [mines, setMines] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<number | null>(null);
  const [starting, setStarting] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const params: Record<string, string | number | undefined> = {};
      if (statusFilter) params.status = statusFilter;
      if (typeFilter) params.type = typeFilter;
      const [insp, mineList] = await Promise.all([getInspectionsApi(params), getMinesApi()]);
      setPage(insp); setMines(mineList);
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to load inspections"); }
    finally { setLoading(false); }
  }, [statusFilter, typeFilter]);

  useEffect(() => { void load(); }, [load]);

  const canStart = user && ["supervisor", "safety_officer", "mine_manager", "area_gm", "subsidiary_admin", "cil_admin", "regulator"].includes(user.role);
  const items = page?.items ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight flex items-center gap-2"><ClipboardCheck className="size-6 text-primary" /> Inspections</h2>
          <p className="text-sm text-muted-foreground">Mine safety inspections, findings, and CAPA status from the backend.</p>
        </div>
        <div className="flex gap-2">
          {canStart && <Button size="sm" onClick={() => setStarting(true)} className="gap-1"><Plus className="size-4" /> Start inspection</Button>}
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-1"><RefreshCw className="size-4" /> Refresh</Button>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap items-center">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="rounded-md border bg-background px-3 py-2 text-sm">
          <option value="">All statuses</option>
          <option value="in_progress">In progress</option>
          <option value="submitted">Submitted</option>
        </select>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="rounded-md border bg-background px-3 py-2 text-sm">
          <option value="">All types</option>
          <option value="internal">Internal</option>
          <option value="statutory">Statutory</option>
          <option value="dgms">DGMS</option>
          <option value="spcb">SPCB</option>
        </select>
      </div>

      {error && <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive flex justify-between"><span>{error}</span><Button variant="outline" size="sm" onClick={load}>Retry</Button></div>}

      <div className="dashboard-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="dashboard-table min-w-full">
            <thead><tr><th>#</th><th>Mine</th><th>Type</th><th>Status</th><th>Inspector</th><th>Findings</th><th>Critical</th><th>Date</th><th></th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={9} className="p-6 text-center text-muted-foreground">Loading inspections…</td></tr>
                : items.length === 0 ? <tr><td colSpan={9} className="p-6 text-center text-muted-foreground">No inspections found.</td></tr>
                : items.map(insp => (
                  <tr key={fmt(insp.id)}>
                    <td className="font-mono text-xs text-primary font-bold">#{fmt(insp.id)}</td>
                    <td className="font-semibold">{fmt(insp.mine_name)}</td>
                    <td><span className={`text-[10px] font-bold border px-1.5 py-0.5 rounded uppercase ${typeClass[fmt(insp.type)] ?? ""}`}>{fmt(insp.type)}</span></td>
                    <td><span className={`text-[10px] font-bold border px-1.5 py-0.5 rounded uppercase ${statusClass[fmt(insp.status)] ?? ""}`}>{fmt(insp.status).replace("_", " ")}</span></td>
                    <td className="text-xs">{fmt(insp.inspector_name)}</td>
                    <td className="text-center">{fmt(insp.findings_count)}</td>
                    <td className="text-center">{Number(insp.critical_count) > 0 ? <span className="text-red-600 font-bold">{fmt(insp.critical_count)}</span> : "0"}</td>
                    <td className="text-xs text-muted-foreground">{ist(insp.started_at)}</td>
                    <td><Button size="sm" variant="ghost" onClick={() => setDetail(Number(insp.id))}><Eye className="size-3 mr-1" />View</Button></td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {page && <div className="text-sm text-muted-foreground">Total: <strong>{page.total}</strong></div>}
      {detail !== null && <InspectionDetail id={detail} close={() => setDetail(null)} />}
      {starting && <StartInspectionDialog mines={mines} close={() => setStarting(false)} reload={load} />}
    </div>
  );
}
