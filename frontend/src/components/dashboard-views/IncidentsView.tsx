import { useCallback, useEffect, useState } from "react";
import { RefreshCw, AlertOctagon, Plus, X, Siren } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getObservationsApi, acknowledgeObservationApi, convertObservationApi, getActiveSosApi, getMinesApi, type Page, type Row } from "@/lib/api";
import { useAppStore } from "@/store/useAppStore";

const fmt = (v: unknown) => v === null || v === undefined || v === "" ? "—" : String(v);
const ist = (v: unknown) => { try { return new Date(String(v)).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }); } catch { return fmt(v); } };
const typeColor: Record<string, string> = { incident: "text-red-700 bg-red-50 border-red-200", near_miss: "text-amber-700 bg-amber-50 border-amber-200", unsafe_condition: "text-orange-700 bg-orange-50 border-orange-200", unsafe_act: "text-yellow-700 bg-yellow-50 border-yellow-200", sos: "text-red-800 bg-red-100 border-red-400" };
const severityColor: Record<string, string> = { critical: "text-red-700", high: "text-orange-600", medium: "text-amber-600", low: "text-blue-600" };

function ReportDialog({ mines, close, reload }: { mines: Row[]; close: () => void; reload: () => Promise<void> }) {
  const [type, setType] = useState("near_miss");
  const [category, setCategory] = useState("roof");
  const [text, setText] = useState("");
  const [severity, setSeverity] = useState("medium");
  const [mineId, setMineId] = useState(mines[0] ? fmt(mines[0].id) : "");
  const [anonymous, setAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAppStore();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !mineId) { setError("Fill in all required fields."); return; }
    setSubmitting(true); setError(null);
    try {
      const { createObservationApi } = await import("@/lib/api");
      await createObservationApi({ mine_id: Number(mineId), type, category, text, severity, source: "app", anonymous });
      await reload(); close();
    } catch (err) { setError(err instanceof Error ? err.message : "Failed to submit"); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <section role="dialog" aria-modal="true" className="dashboard-card w-full max-w-lg bg-card p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b pb-3 mb-4">
          <h3 className="font-display text-lg font-bold">Report Observation / Incident</h3>
          <Button variant="ghost" size="icon" onClick={close}><X className="size-4" /></Button>
        </div>
        <form onSubmit={e => void submit(e)} className="space-y-4">
          <label className="block text-sm font-medium">Mine site *
            <select required value={mineId} onChange={e => setMineId(e.target.value)} className="mt-1 block w-full rounded-md border bg-background p-2 text-sm">
              {mines.map(m => <option key={fmt(m.id)} value={fmt(m.id)}>{fmt(m.name)}</option>)}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm font-medium">Type *
              <select value={type} onChange={e => setType(e.target.value)} className="mt-1 block w-full rounded-md border bg-background p-2 text-sm">
                <option value="unsafe_act">Unsafe Act</option>
                <option value="unsafe_condition">Unsafe Condition</option>
                <option value="near_miss">Near Miss</option>
                <option value="incident">Incident</option>
              </select>
            </label>
            <label className="block text-sm font-medium">Severity *
              <select value={severity} onChange={e => setSeverity(e.target.value)} className="mt-1 block w-full rounded-md border bg-background p-2 text-sm">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </label>
          </div>
          <label className="block text-sm font-medium">Category
            <select value={category} onChange={e => setCategory(e.target.value)} className="mt-1 block w-full rounded-md border bg-background p-2 text-sm">
              {["roof","haul_road","conveyor","electrical","fire","water","dust","ppe","machinery","explosives","other"].map(c => <option key={c} value={c}>{c.replace("_", " ")}</option>)}
            </select>
          </label>
          <label className="block text-sm font-medium">Description *
            <textarea required value={text} onChange={e => setText(e.target.value)} rows={3} className="mt-1 block w-full rounded-md border bg-background p-2 text-sm" />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={anonymous} onChange={e => setAnonymous(e.target.checked)} className="rounded" />
            Submit anonymously
          </label>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={close}>Cancel</Button>
            <Button disabled={submitting}>{submitting ? "Submitting…" : "Submit report"}</Button>
          </div>
        </form>
      </section>
    </div>
  );
}

export function IncidentsView() {
  const { user } = useAppStore();
  const [page, setPage] = useState<Page<Row> | null>(null);
  const [activeSos, setActiveSos] = useState<Row[]>([]);
  const [mines, setMines] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<number | null>(null);
  const [reporting, setReporting] = useState(false);
  const [typeFilter, setTypeFilter] = useState("incident");

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [obs, sos, mineList] = await Promise.all([
        getObservationsApi({ type: typeFilter || "incident,near_miss,unsafe_condition,unsafe_act,sos" }),
        getActiveSosApi(),
        getMinesApi(),
      ]);
      setPage(obs); setActiveSos(sos); setMines(mineList);
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to load incidents"); }
    finally { setLoading(false); }
  }, [typeFilter]);

  useEffect(() => { void load(); }, [load]);

  const canAcknowledge = user && ["supervisor", "safety_officer", "mine_manager", "area_gm", "subsidiary_admin", "cil_admin"].includes(user.role);
  const canConvert = user && ["safety_officer", "mine_manager", "area_gm", "subsidiary_admin", "cil_admin"].includes(user.role);

  const acknowledge = async (id: number) => {
    setActing(id);
    try { await acknowledgeObservationApi(id); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : "Acknowledge failed"); }
    finally { setActing(null); }
  };

  const convert = async (id: number) => {
    setActing(id);
    try { await convertObservationApi(id); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : "Convert failed"); }
    finally { setActing(null); }
  };

  const items = page?.items ?? [];

  return (
    <div className="space-y-6">
      {activeSos.length > 0 && (
        <div className="rounded-xl border-2 border-red-500 bg-red-50 p-4 flex items-center gap-3 animate-pulse">
          <Siren className="size-6 text-red-600 shrink-0" />
          <div>
            <p className="font-bold text-red-700">🆘 {activeSos.length} Active SOS — Immediate response required</p>
            <div className="space-y-0.5 mt-1">{activeSos.map(s => <p key={fmt(s.id)} className="text-xs text-red-600">{ist(s.created_at)} · {fmt(s.mine_name)} · {fmt(s.text)}</p>)}</div>
          </div>
        </div>
      )}

      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight flex items-center gap-2"><AlertOctagon className="size-6 text-primary" /> Incidents & Observations</h2>
          <p className="text-sm text-muted-foreground">Field observations and incident reports from the backend.</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => setReporting(true)} className="gap-1"><Plus className="size-4" /> Report</Button>
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-1"><RefreshCw className="size-4" /> Refresh</Button>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {["incident", "near_miss", "unsafe_condition", "unsafe_act", ""].map(t => (
          <button key={t || "all"} onClick={() => setTypeFilter(t)} className={`rounded-full text-xs px-3 py-1 border transition-colors ${typeFilter === t ? "bg-primary text-primary-foreground border-primary" : "border-muted bg-muted/30 hover:bg-muted"}`}>{t || "All"}</button>
        ))}
      </div>

      {error && <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive flex justify-between"><span>{error}</span><Button variant="outline" size="sm" onClick={load}>Retry</Button></div>}

      <div className="space-y-3">
        {loading && <p className="text-muted-foreground text-sm">Loading observations…</p>}
        {!loading && items.length === 0 && <p className="rounded-xl border p-8 text-center text-muted-foreground">No observations found.</p>}
        {items.map(obs => (
          <article key={fmt(obs.id)} className="dashboard-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className={`text-[10px] font-bold border px-1.5 py-0.5 rounded uppercase ${typeColor[fmt(obs.type)] ?? ""}`}>{fmt(obs.type).replace(/_/g, " ")}</span>
                  <span className={`text-xs font-semibold ${severityColor[fmt(obs.severity)] ?? ""}`}>{fmt(obs.severity)}</span>
                  <span className="text-xs text-muted-foreground">{fmt(obs.category).replace(/_/g, " ")}</span>
                  {obs.acknowledged_at && <span className="text-[10px] text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">Acknowledged</span>}
                  {obs.capa_id && <span className="text-[10px] bg-purple-50 border border-purple-200 text-purple-700 px-1.5 py-0.5 rounded">CAPA #{fmt(obs.capa_id)}</span>}
                </div>
                <p className="text-sm font-medium leading-snug">{fmt(obs.text)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{ist(obs.created_at)} · {fmt(obs.mine_name)}</p>
                {obs.reporter_name && <p className="text-xs text-muted-foreground">By: {fmt(obs.reporter_name)}</p>}
              </div>
              <div className="flex flex-col gap-1 shrink-0">
                {!obs.acknowledged_at && canAcknowledge && (
                  <Button size="sm" variant="outline" disabled={acting === Number(obs.id)} onClick={() => void acknowledge(Number(obs.id))} className="text-xs">
                    {acting === Number(obs.id) ? "…" : "Acknowledge"}
                  </Button>
                )}
                {!obs.capa_id && canConvert && (
                  <Button size="sm" variant="outline" disabled={acting === Number(obs.id)} onClick={() => void convert(Number(obs.id))} className="text-xs">
                    Convert to CAPA
                  </Button>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>

      {page && <div className="text-sm text-muted-foreground">Total: <strong>{page.total}</strong></div>}
      {reporting && <ReportDialog mines={mines} close={() => setReporting(false)} reload={load} />}
    </div>
  );
}
