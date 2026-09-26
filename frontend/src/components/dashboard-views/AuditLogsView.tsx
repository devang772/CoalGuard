import { useCallback, useEffect, useState } from "react";
import { Shield, ShieldAlert, RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAuditLogsApi, verifyAuditChainApi, type Page, type Row } from "@/lib/api";

const fmt = (v: unknown) => v === null || v === undefined || v === "" ? "—" : String(v);
const ist = (v: unknown) => { try { return new Date(String(v)).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }); } catch { return fmt(v); } };
const actionColor: Record<string, string> = { create: "text-emerald-600", update: "text-amber-600", delete: "text-red-600", seed: "text-blue-600" };

export function AuditLogsView() {
  const [page, setPage] = useState<Page<Row> | null>(null);
  const [chain, setChain] = useState<Row | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { setPage(await getAuditLogsApi()); }
    catch (e) { setError(e instanceof Error ? e.message : "Failed to load audit logs"); }
    finally { setLoading(false); }
  }, []);

  const verify = async () => {
    setVerifying(true); setError(null);
    try { setChain(await verifyAuditChainApi()); }
    catch (e) { setError(e instanceof Error ? e.message : "Chain verification failed"); }
    finally { setVerifying(false); }
  };

  useEffect(() => { void load(); }, [load]);

  const items = (page?.items ?? []).filter(r =>
    !q || [r.table_name, r.action, r.user_name].some(v => fmt(v).toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight">Tamper-Proof Audit Trail</h2>
          <p className="text-sm text-muted-foreground">Hash-chained audit records from the backend. Every change is recorded.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={verify} disabled={verifying} className="gap-1">
            <Shield className="size-4" /> {verifying ? "Verifying…" : "Verify chain"}
          </Button>
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-1"><RefreshCw className="size-4" /> Refresh</Button>
        </div>
      </div>

      {chain && (
        <div className={`rounded-xl border p-4 text-sm ${chain.ok ? "border-emerald-500/30 bg-emerald-500/5" : "border-red-500/30 bg-red-500/5"}`}>
          <div className="flex items-center gap-2 mb-2">
            {chain.ok ? <Shield className="size-5 text-emerald-600" /> : <ShieldAlert className="size-5 text-red-600" />}
            <strong className={chain.ok ? "text-emerald-700" : "text-red-700"}>{chain.ok ? "Audit chain intact" : "Chain integrity issue detected"}</strong>
          </div>
          <p className="text-muted-foreground text-xs">Total entries: {fmt(chain.total_entries)} · Checked: {fmt(chain.records_checked)} · Head hash: <code className="font-mono">{fmt(chain.head_hash).slice(0, 16)}…</code></p>
          {Array.isArray(chain.records_changed_outside_app) && chain.records_changed_outside_app.length > 0 && (
            <div className="mt-2">
              <p className="text-red-700 font-semibold text-xs">Records changed outside the app:</p>
              {chain.records_changed_outside_app.map((r: unknown) => { const rec = r as Row; return <p key={fmt(rec.table_name) + fmt(rec.record_id)} className="text-xs text-red-600">{fmt(rec.table_name)} #{fmt(rec.record_id)}: {fmt(rec.problem)}</p>; })}
            </div>
          )}
        </div>
      )}

      {error && <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive flex justify-between"><span>{error}</span><Button variant="outline" size="sm" onClick={load}>Retry</Button></div>}

      <div className="dashboard-card p-3">
        <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Filter by table, action or user…" className="w-full pl-9 pr-4 py-2 rounded-md border bg-background text-sm" /></div>
      </div>

      <div className="dashboard-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="dashboard-table min-w-full">
            <thead><tr><th>ID</th><th>Table</th><th>Record</th><th>Action</th><th>User</th><th>Time (IST)</th><th>Hash</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">Loading audit records…</td></tr>
                : items.length === 0 ? <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No records match.</td></tr>
                : items.map(r => (
                  <tr key={fmt(r.id)}>
                    <td className="font-mono text-xs text-muted-foreground">#{fmt(r.id)}</td>
                    <td className="font-mono text-xs">{fmt(r.table_name)}</td>
                    <td className="text-xs">{fmt(r.record_id)}</td>
                    <td><span className={`text-xs font-semibold uppercase ${actionColor[fmt(r.action)] ?? ""}`}>{fmt(r.action)}</span></td>
                    <td className="text-xs">{fmt(r.user_name)}</td>
                    <td className="text-xs text-muted-foreground">{ist(r.created_at)}</td>
                    <td className="font-mono text-[10px] text-muted-foreground max-w-24 truncate">{fmt(r.hash).slice(0, 12)}…</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
      {page && <div className="text-sm text-muted-foreground">Total: <strong>{page.total}</strong> records</div>}
    </div>
  );
}
