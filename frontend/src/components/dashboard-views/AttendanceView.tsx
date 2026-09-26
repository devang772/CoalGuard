import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Users, UserCheck, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAttendanceApi, getAttendanceSummaryApi, type Page, type Row } from "@/lib/api";

const fmt = (v: unknown) => v === null || v === undefined || v === "" ? "—" : String(v);
const ist = (v: unknown) => { try { return new Date(String(v)).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }); } catch { return fmt(v); } };
const today = new Date().toISOString().slice(0, 10);

function SummaryCard({ label, value, sub, icon }: { label: string; value: string | number; sub?: string; icon: React.ReactNode }) {
  return (
    <div className="dashboard-card p-4">
      <div className="flex items-center justify-between text-muted-foreground mb-2"><span className="text-xs font-semibold uppercase tracking-wider">{label}</span>{icon}</div>
      <p className="font-display text-3xl font-bold">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

export function AttendanceView() {
  const [page, setPage] = useState<Page<Row> | null>(null);
  const [summary, setSummary] = useState<Row | null>(null);
  const [date, setDate] = useState(today);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [att, sum] = await Promise.all([
        getAttendanceApi({ date }),
        getAttendanceSummaryApi({ date }),
      ]);
      setPage(att); setSummary(sum);
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to load attendance"); }
    finally { setLoading(false); }
  }, [date]);

  useEffect(() => { void load(); }, [load]);

  const items = page?.items ?? [];
  const sum = summary as Record<string, unknown> | null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight">Attendance Monitor</h2>
          <p className="text-sm text-muted-foreground">Worker attendance records from the backend for the selected date.</p>
        </div>
        <div className="flex items-center gap-2">
          <input type="date" value={date} max={today} onChange={e => setDate(e.target.value)} className="rounded-md border bg-background px-3 py-2 text-sm" />
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-1"><RefreshCw className="size-4" /> Refresh</Button>
        </div>
      </div>

      {sum && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard label="Present" value={fmt(sum.present)} icon={<Users className="size-4 text-emerald-500" />} />
          <SummaryCard label="Invalid records" value={fmt(sum.invalid)} icon={<AlertTriangle className="size-4 text-amber-500" />} sub="Outside boundary / failed checks" />
          <SummaryCard label="No gate entry" value={fmt(sum.without_gate_entry)} icon={<UserCheck className="size-4 text-muted-foreground" />} />
          <SummaryCard label="Expired training" value={fmt(sum.expired_training)} icon={<AlertTriangle className="size-4 text-red-500" />} />
        </div>
      )}

      {error && <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive flex justify-between"><span>{error}</span><Button variant="outline" size="sm" onClick={load}>Retry</Button></div>}

      <div className="dashboard-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="dashboard-table min-w-full">
            <thead><tr><th>#</th><th>Worker</th><th>Contractor</th><th>Mine</th><th>Time (IST)</th><th>Source</th><th>Valid</th><th>Gate entry</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">Loading attendance records…</td></tr>
                : items.length === 0 ? <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">No attendance records for this date.</td></tr>
                : items.map((row, i) => (
                  <tr key={fmt(row.id)}>
                    <td className="font-mono text-xs text-muted-foreground">{i + 1}</td>
                    <td className="font-semibold">{fmt(row.worker_name)}</td>
                    <td className="text-xs text-muted-foreground">{fmt(row.contractor_name)}</td>
                    <td>{fmt(row.mine_name)}</td>
                    <td className="text-xs">{ist(row.time)}</td>
                    <td><span className="text-xs uppercase font-medium">{fmt(row.source)}</span></td>
                    <td>{row.valid ? <span className="text-emerald-600 font-semibold text-xs">✓ Valid</span> : <span className="text-red-600 text-xs" title={fmt(row.reason)}>✗ Invalid</span>}</td>
                    <td>{row.gate_entry ? <span className="text-emerald-600 text-xs">✓ Yes</span> : <span className="text-muted-foreground text-xs">No</span>}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {page && <div className="text-sm text-muted-foreground">Total records: <strong>{page.total}</strong></div>}
    </div>
  );
}
