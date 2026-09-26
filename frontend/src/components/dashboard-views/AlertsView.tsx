import { useCallback, useEffect, useState } from "react";
import { Bell, BellOff, CheckCheck, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getNotificationsApi, markNotificationReadApi, markAllNotificationsReadApi, type Page, type Row } from "@/lib/api";

const fmt = (v: unknown) => !v ? "—" : String(v);
const ist = (v: unknown) => { try { return new Date(String(v)).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }); } catch { return fmt(v); } };
const levelClass: Record<string, string> = { critical: "bg-red-500/10 border-red-500/30 text-red-700", warning: "bg-amber-500/10 border-amber-500/30 text-amber-700", info: "bg-blue-500/10 border-blue-500/30 text-blue-600" };
const kindIcon: Record<string, string> = { sos: "🆘", incident: "⚠️", finding: "🔍", capa: "🛡️", grievance: "📣", reminder: "⏰", escalation: "🪜", digest: "☀️", general: "🔔" };

export function AlertsView() {
  const [page, setPage] = useState<Page<Row> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<number | null>(null);
  const [filter, setFilter] = useState<string>("");

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { setPage(await getNotificationsApi(filter ? { unread: filter } : {})); }
    catch (e) { setError(e instanceof Error ? e.message : "Failed to load notifications"); }
    finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { void load(); }, [load]);

  const markOne = async (id: number) => {
    setActing(id);
    try { await markNotificationReadApi(id); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : "Mark failed"); }
    finally { setActing(null); }
  };

  const markAll = async () => {
    setActing(-1);
    try { await markAllNotificationsReadApi(); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : "Mark all failed"); }
    finally { setActing(null); }
  };

  const items = page?.items ?? [];
  const unread = items.filter(n => !n.read).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight flex items-center gap-2">
            <Bell className="text-primary size-6" /> Notifications & Alerts
          </h2>
          <p className="text-sm text-muted-foreground">Live alerts from the backend. Unread: <strong>{unread}</strong></p>
        </div>
        <div className="flex gap-2">
          <select value={filter} onChange={e => setFilter(e.target.value)} className="rounded-md border bg-background px-3 py-2 text-sm">
            <option value="">All</option>
            <option value="true">Unread only</option>
          </select>
          <Button variant="outline" size="sm" onClick={markAll} disabled={acting === -1 || unread === 0} className="gap-1"><CheckCheck className="size-4" /> Mark all read</Button>
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-1"><RefreshCw className="size-4" /> Refresh</Button>
        </div>
      </div>

      {error && <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive flex justify-between items-center">{error}<Button variant="outline" size="sm" onClick={load}>Retry</Button></div>}

      <div className="space-y-3">
        {loading && <p className="text-muted-foreground text-sm">Loading notifications…</p>}
        {!loading && items.length === 0 && (
          <div className="rounded-xl border p-12 text-center text-muted-foreground">
            <BellOff className="size-10 mx-auto mb-3 opacity-30" />
            <p>No notifications in this scope.</p>
          </div>
        )}
        {items.map(n => (
          <article key={fmt(n.id)} className={`dashboard-card flex items-start gap-4 p-4 border ${levelClass[fmt(n.level)] ?? levelClass.info} ${!n.read ? "ring-1 ring-primary/20" : "opacity-70"}`}>
            <span className="text-2xl shrink-0">{kindIcon[fmt(n.kind)] ?? "🔔"}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <strong className="text-sm">{fmt(n.title)}</strong>
                <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full ${levelClass[fmt(n.level)] ?? levelClass.info}`}>{fmt(n.level)}</span>
                {!n.read && <span className="size-2 rounded-full bg-primary shrink-0" />}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{fmt(n.body)}</p>
              <p className="text-[11px] text-muted-foreground mt-1">{ist(n.created_at)}</p>
            </div>
            {!n.read && (
              <Button size="sm" variant="outline" disabled={acting === Number(n.id)} onClick={() => void markOne(Number(n.id))} className="shrink-0 text-xs">
                {acting === Number(n.id) ? "…" : "Mark read"}
              </Button>
            )}
          </article>
        ))}
      </div>

      {page && page.total > (page.page_size ?? page.size ?? 20) && (
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>Showing {items.length} of {page.total}</span>
        </div>
      )}
    </div>
  );
}
