import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Users, AlertTriangle, ChevronDown, ChevronUp, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getContractorsApi, getContractorDetailApi, getContractorWorkersApi, type Row } from "@/lib/api";

const fmt = (v: unknown) => v === null || v === undefined || v === "" ? "—" : String(v);
const licenseClass = (status: unknown) => {
  const s = String(status ?? "").toLowerCase();
  return s === "valid" ? "text-emerald-600 bg-emerald-50 border-emerald-200" : s === "expiring" ? "text-amber-600 bg-amber-50 border-amber-200" : "text-red-600 bg-red-50 border-red-200";
};

function ContractorCard({ contractor, onExpand, expanded }: { contractor: Row; onExpand: () => void; expanded: boolean }) {
  const score = Number(contractor.score ?? 0);
  const scoreColor = score >= 80 ? "text-emerald-600" : score >= 50 ? "text-amber-600" : "text-red-600";
  return (
    <article className="dashboard-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="font-display text-base font-bold">{fmt(contractor.name)}</h3>
            <span className={`text-[10px] font-bold border px-1.5 py-0.5 rounded uppercase ${licenseClass(contractor.licence_status)}`}>{fmt(contractor.licence_status)}</span>
            {Number(contractor.alerts_count) > 0 && <span className="text-[10px] bg-red-50 border border-red-200 text-red-700 px-1.5 py-0.5 rounded font-bold">{contractor.high_alerts} high alert{Number(contractor.high_alerts) !== 1 ? "s" : ""}</span>}
          </div>
          <p className="text-xs text-muted-foreground">{fmt(contractor.mine_name)} · {fmt(contractor.workers_count)} workers</p>
          <p className="text-xs text-muted-foreground mt-0.5">Licence: {fmt(contractor.licence_no)} · Valid till {fmt(contractor.licence_valid_till)}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className={`font-display text-2xl font-bold ${scoreColor}`}>{score.toFixed(0)}<span className="text-sm font-normal text-muted-foreground">/100</span></span>
          <Button variant="outline" size="sm" onClick={onExpand} className="gap-1 text-xs">
            {expanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
            {expanded ? "Collapse" : "Details"}
          </Button>
        </div>
      </div>
      {expanded && <ContractorDetails id={Number(contractor.id)} />}
    </article>
  );
}

function ContractorDetails({ id }: { id: number }) {
  const [detail, setDetail] = useState<Row | null>(null);
  const [workers, setWorkers] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [d, w] = await Promise.all([getContractorDetailApi(id), getContractorWorkersApi(id)]);
        if (!cancelled) { setDetail(d); setWorkers(w); }
      } catch (e) { if (!cancelled) setError(e instanceof Error ? e.message : "Failed"); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [id]);

  if (loading) return <div className="mt-4 text-sm text-muted-foreground">Loading contractor details…</div>;
  if (error) return <div className="mt-4 text-sm text-red-600">{error}</div>;
  const stats = detail?.stats as Record<string, unknown> | undefined;
  const alerts = (detail?.alerts as Row[]) ?? [];

  return (
    <div className="mt-4 border-t pt-4 space-y-4">
      {stats && (
        <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
          {[
            ["Total workers", fmt((stats.workers_total))],
            ["Active", fmt(stats.workers_active)],
            ["Training expired", fmt((stats.training as Record<string,unknown>)?.expired ?? 0)],
            ["Medical expired", fmt((stats.medical as Record<string,unknown>)?.expired ?? 0)],
            ["Below min wage", fmt(stats.below_min_wage)],
            ["Invalid attendance (30d)", fmt((stats.attendance_30d as Record<string,unknown>)?.invalid ?? 0)],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-lg border p-2"><p className="text-muted-foreground">{label}</p><p className="font-bold mt-0.5">{value}</p></div>
          ))}
        </div>
      )}
      {alerts.length > 0 && (
        <div>
          <p className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wider">Alerts</p>
          <div className="space-y-2">
            {alerts.map(a => (
              <div key={fmt(a.id)} className={`rounded-lg border p-3 text-xs ${String(a.severity) === "high" ? "border-red-200 bg-red-50 text-red-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
                <strong>{fmt(a.title)}</strong><p className="mt-0.5 text-[11px] opacity-80">{fmt(a.description)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      {workers.length > 0 && (
        <div>
          <p className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wider">Workers ({workers.length})</p>
          <div className="overflow-x-auto"><table className="dashboard-table min-w-full text-xs">
            <thead><tr><th>Name</th><th>Phone</th><th>Wage</th><th>Training</th><th>Medical</th><th>Flags</th></tr></thead>
            <tbody>
              {workers.slice(0, 20).map(w => (
                <tr key={fmt(w.id)}>
                  <td className="font-semibold">{fmt(w.name)}</td>
                  <td>{fmt(w.phone)}</td>
                  <td>₹{fmt(w.daily_wage)}{w.below_min_wage ? " ⚠️" : ""}</td>
                  <td className={fmt(w.training_status) === "valid" ? "text-emerald-600" : "text-red-600"}>{fmt(w.training_status)}</td>
                  <td className={fmt(w.medical_status) === "valid" ? "text-emerald-600" : "text-red-600"}>{fmt(w.medical_status)}</td>
                  <td>{Array.isArray(w.flags) && w.flags.length ? w.flags.join(", ") : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
          {workers.length > 20 && <p className="text-xs text-muted-foreground mt-1">Showing 20 of {workers.length}</p>}
        </div>
      )}
    </div>
  );
}

export function ContractorsView() {
  const [contractors, setContractors] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { setContractors(await getContractorsApi()); }
    catch (e) { setError(e instanceof Error ? e.message : "Failed to load contractors"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const visible = contractors.filter(c => !q || fmt(c.name).toLowerCase().includes(q.toLowerCase()) || fmt(c.mine_name).toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight flex items-center gap-2"><Building2 className="size-6 text-primary" /> Contractors</h2>
          <p className="text-sm text-muted-foreground">Contractor roster with compliance scores, alerts, and worker details.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-1"><RefreshCw className="size-4" /> Refresh</Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="dashboard-card p-4"><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Total contractors</p><p className="font-display text-3xl font-bold">{contractors.length}</p></div>
        <div className="dashboard-card p-4"><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">With alerts</p><p className="font-display text-3xl font-bold text-amber-600">{contractors.filter(c => Number(c.alerts_count) > 0).length}</p></div>
        <div className="dashboard-card p-4"><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Expired licence</p><p className="font-display text-3xl font-bold text-red-600">{contractors.filter(c => fmt(c.licence_status) === "expired").length}</p></div>
      </div>

      <div className="dashboard-card p-3">
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search contractor or mine…" className="w-full rounded-md border bg-background px-3 py-2 text-sm" />
      </div>

      {error && <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive flex justify-between"><span>{error}</span><Button variant="outline" size="sm" onClick={load}>Retry</Button></div>}
      {loading && <p className="text-muted-foreground text-sm">Loading contractors…</p>}
      {!loading && visible.length === 0 && <p className="rounded-xl border p-8 text-center text-muted-foreground">No contractors found.</p>}
      <div className="space-y-4">
        {visible.map(c => (
          <ContractorCard
            key={fmt(c.id)}
            contractor={c}
            expanded={expanded === Number(c.id)}
            onExpand={() => setExpanded(prev => prev === Number(c.id) ? null : Number(c.id))}
          />
        ))}
      </div>
    </div>
  );
}
