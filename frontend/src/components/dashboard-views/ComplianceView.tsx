import { useCallback, useEffect, useState } from "react";
import { CheckCircle, Clock, AlertTriangle, RefreshCw, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getTasksApi, getTaskSummaryApi, completeTaskApi, getMinesApi, type Page, type Row } from "@/lib/api";
import { useAppStore } from "@/store/useAppStore";

const fmt = (v: unknown) => v === null || v === undefined || v === "" ? "—" : String(v);
const statusColor: Record<string, string> = { done: "text-emerald-600 bg-emerald-50 border-emerald-200", overdue: "text-red-600 bg-red-50 border-red-200", pending: "text-amber-600 bg-amber-50 border-amber-200" };
const severityColor: Record<string, string> = { critical: "text-red-700", high: "text-orange-600", medium: "text-amber-600", low: "text-blue-600" };

function TaskSummaryCard({ label, value, icon }: { label: string; value: unknown; icon: React.ReactNode }) {
  return (
    <div className="dashboard-card p-4">
      <div className="flex items-center justify-between text-muted-foreground mb-2"><span className="text-xs font-semibold uppercase tracking-wider">{label}</span>{icon}</div>
      <p className="font-display text-3xl font-bold">{fmt(value)}</p>
    </div>
  );
}

export function ComplianceView() {
  const { user } = useAppStore();
  const [page, setPage] = useState<Page<Row> | null>(null);
  const [summary, setSummary] = useState<Row | null>(null);
  const [mines, setMines] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState<number | null>(null);
  const [completeMsg, setCompleteMsg] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [mineFilter, setMineFilter] = useState(user?.mineId ? String(user.mineId) : "");

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const params: Record<string, string | number | undefined> = {};
      if (statusFilter) params.status = statusFilter;
      if (mineFilter) params.mine_id = mineFilter;
      const [tasks, sum, mineList] = await Promise.all([
        getTasksApi(params),
        getTaskSummaryApi(undefined, mineFilter ? Number(mineFilter) : undefined),
        getMinesApi(),
      ]);
      setPage(tasks); setSummary(sum); setMines(mineList);
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to load compliance tasks"); }
    finally { setLoading(false); }
  }, [statusFilter, mineFilter, user]);

  useEffect(() => { void load(); }, [load]);

  const canComplete = (role: string) => ["supervisor", "safety_officer", "mine_manager"].includes(role);

  const complete = async (taskId: number) => {
    setCompleting(taskId); setCompleteMsg(null); setError(null);
    try {
      await completeTaskApi(taskId, { remarks: "Completed via dashboard" });
      setCompleteMsg(`Task #${taskId} marked complete.`);
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Task completion failed"); }
    finally { setCompleting(null); }
  };

  const items = page?.items ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight">Compliance Tasks</h2>
          <p className="text-sm text-muted-foreground">Statutory obligations and their task status. Backend-computed.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-1"><RefreshCw className="size-4" /> Refresh</Button>
      </div>

      {summary && (
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <TaskSummaryCard label="Overdue" value={summary.overdue} icon={<AlertTriangle className="size-4 text-red-500" />} />
          <TaskSummaryCard label="Due today" value={summary.due_today} icon={<Clock className="size-4 text-amber-500" />} />
          <TaskSummaryCard label="Due this week" value={summary.due_this_week} icon={<Clock className="size-4 text-blue-500" />} />
          <TaskSummaryCard label="Done today" value={summary.done_today} icon={<CheckCircle className="size-4 text-emerald-500" />} />
          <TaskSummaryCard label="Pending" value={summary.pending} icon={<Clock className="size-4 text-muted-foreground" />} />
        </div>
      )}

      <div className="dashboard-card p-4 flex flex-wrap gap-3 items-center">
        <Filter className="size-4 text-muted-foreground" />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="rounded-md border bg-background px-3 py-2 text-sm">
          <option value="">All statuses</option>
          <option value="overdue">Overdue</option>
          <option value="pending">Pending</option>
          <option value="done">Done</option>
        </select>
        <select value={mineFilter} onChange={e => setMineFilter(e.target.value)} className="rounded-md border bg-background px-3 py-2 text-sm">
          <option value="">All mines</option>
          {mines.map(m => <option key={fmt(m.id)} value={fmt(m.id)}>{fmt(m.name)}</option>)}
        </select>
      </div>

      {error && <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive flex justify-between"><span>{error}</span><Button variant="outline" size="sm" onClick={load}>Retry</Button></div>}
      {completeMsg && <p role="status" className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm text-emerald-700">{completeMsg}</p>}

      <div className="space-y-3">
        {loading && <p className="text-muted-foreground text-sm">Loading tasks…</p>}
        {!loading && items.length === 0 && <p className="rounded-xl border p-8 text-center text-sm text-muted-foreground">No tasks match the selected filters.</p>}
        {items.map(task => {
          const ob = task.obligation as Row | undefined;
          const status = fmt(task.status);
          return (
            <article key={fmt(task.id)} className={`dashboard-card p-4 border ${status === "overdue" ? "border-red-200" : status === "done" ? "border-emerald-200" : ""}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border ${statusColor[status] ?? ""}`}>{status}</span>
                    {ob && <span className={`text-xs font-semibold ${severityColor[fmt(ob.severity)] ?? ""}`}>{fmt(ob.severity)}</span>}
                    {ob && <code className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono">{fmt(ob.code)}</code>}
                    {Number(task.escalation_level) > 0 && <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">Level {fmt(task.escalation_level)} escalation</span>}
                  </div>
                  <p className="font-semibold text-sm leading-snug">{ob ? fmt(ob.title) : `Task #${fmt(task.id)}`}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{ob ? fmt(ob.law_ref) : ""} · Due: {fmt(task.due_date)} · Mine: {fmt(task.mine_name)}</p>
                  {task.done_by_name && <p className="text-xs text-emerald-600 mt-0.5">✓ Completed by {fmt(task.done_by_name)}</p>}
                  {Number(task.days_overdue) > 0 && <p className="text-xs text-red-600 mt-0.5">Overdue by {task.days_overdue} days</p>}
                </div>
                {status !== "done" && user && canComplete(user.role) && (
                  <Button size="sm" disabled={completing === Number(task.id)} onClick={() => void complete(Number(task.id))} className="shrink-0">
                    {completing === Number(task.id) ? "Saving…" : "Mark done"}
                  </Button>
                )}
              </div>
            </article>
          );
        })}
      </div>
      {page && <div className="text-sm text-muted-foreground">Total: <strong>{page.total}</strong> tasks</div>}
    </div>
  );
}
