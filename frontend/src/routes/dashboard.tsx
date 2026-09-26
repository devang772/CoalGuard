import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle, Bell, BrainCircuit, ClipboardCheck, FileBarChart, Files, Gauge,
  Globe, LogOut, Map, Menu, Mountain, RefreshCw, ScrollText, Settings,
  ShieldCheck, Sparkles, Trophy, TrendingDown, TrendingUp, UserCheck, Users, X, Siren,
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Button } from "@/components/ui/button";
import { getAttendanceApi, getDashboardSummaryApi, getMinesApi, getRiskApi } from "@/lib/api";
import { getAuthToken, getApiBase } from "@/lib/api";
import { useAppStore } from "@/store/useAppStore";
import { ScopeSwitcher } from "@/components/common/ScopeSwitcher";
import { AskNetraFloating } from "@/components/common/AskNetraFloating";
import { MinesView } from "@/components/dashboard-views/MinesView";
import { InspectionsView } from "@/components/dashboard-views/InspectionsView";
import { ComplianceView } from "@/components/dashboard-views/ComplianceView";
import { RiskIntelligenceView } from "@/components/dashboard-views/RiskIntelligenceView";
import { GISMapView } from "@/components/dashboard-views/GISMapView";
import { DocumentsView } from "@/components/dashboard-views/DocumentsView";
import { IncidentsView } from "@/components/dashboard-views/IncidentsView";
import { ReportsView } from "@/components/dashboard-views/ReportsView";
import { AlertsView } from "@/components/dashboard-views/AlertsView";
import { UsersView } from "@/components/dashboard-views/UsersView";
import { SettingsView } from "@/components/dashboard-views/SettingsView";
import { AuditLogsView } from "@/components/dashboard-views/AuditLogsView";
import { RuleStudioView } from "@/components/dashboard-views/RuleStudioView";
import { ContractorsView } from "@/components/dashboard-views/ContractorsView";
import { AttendanceView } from "@/components/dashboard-views/AttendanceView";
import { GrievancesView } from "@/components/dashboard-views/GrievancesView";
import { LeaderboardView } from "@/components/dashboard-views/LeaderboardView";

export const Route = createFileRoute("/dashboard")({ component: CoalGuardDashboard });
type Tab = { label: string; icon: typeof Gauge };
const tabs: Tab[] = [
  { label: "Dashboard", icon: Gauge }, { label: "GIS Map", icon: Map }, { label: "Leaderboard", icon: Trophy },
  { label: "Mine Profile & Rules", icon: Sparkles }, { label: "Mines", icon: Mountain },
  { label: "Inspections", icon: ClipboardCheck }, { label: "Compliance", icon: ShieldCheck },
  { label: "Risk Intelligence", icon: BrainCircuit }, { label: "Contractors", icon: Users },
  { label: "Attendance", icon: UserCheck }, { label: "Grievances", icon: AlertTriangle },
  { label: "Documents", icon: Files }, { label: "Incidents", icon: AlertTriangle },
  { label: "Reports", icon: FileBarChart }, { label: "Alerts", icon: Bell },
  { label: "Users", icon: Users }, { label: "Settings", icon: Settings }, { label: "Audit Logs", icon: ScrollText },
];
/** Sidebar section headings, shown above the first tab of each group. */
const sectionStarts: Record<string, string> = {
  Dashboard: "Monitor", Contractors: "Workforce", Documents: "Records", Users: "Administration",
};
const components: Record<string, () => React.ReactElement> = {
  "Mines": MinesView, "Inspections": InspectionsView, "Compliance": ComplianceView,
  "Risk Intelligence": RiskIntelligenceView, "GIS Map": GISMapView, "Mine Profile & Rules": RuleStudioView,
  "Contractors": ContractorsView, "Attendance": AttendanceView, "Grievances": GrievancesView,
  "Leaderboard": LeaderboardView, "Documents": DocumentsView, "Incidents": IncidentsView,
  "Reports": ReportsView, "Alerts": AlertsView, "Users": UsersView,
  "Settings": SettingsView, "Audit Logs": AuditLogsView,
};

const fmt = (v: unknown) => v === null || v === undefined ? "—" : String(v);
const ist = (v: unknown) => { try { return new Date(String(v)).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }); } catch { return fmt(v); } };

/** WebSocket live notification watcher – silently skips if WS is unavailable. */
function useNotificationSocket(onMessage: (n: Record<string, unknown>) => void) {
  const cbRef = useRef(onMessage);
  cbRef.current = onMessage;
  useEffect(() => {
    const token = getAuthToken();
    if (!token) return;
    const base = getApiBase().replace(/^http/, "ws");
    let ws: WebSocket;
    try {
      ws = new WebSocket(`${base}/ws/notifications?token=${encodeURIComponent(token)}`);
      ws.onmessage = (e) => {
        try { cbRef.current(JSON.parse(String(e.data)) as Record<string, unknown>); } catch { /* ignore */ }
      };
    } catch { return; }
    return () => { if (ws.readyState < 2) ws.close(); };
  }, []);
}

function CoalGuardDashboard() {
  const navigate = useNavigate();
  const { isAuthenticated, logoutUser, user, language, setLanguage } = useAppStore();
  const [hydrated, setHydrated] = useState(false);
  const [activeTab, setActiveTab] = useState("Dashboard");
  const [menu, setMenu] = useState(false);
  const [summary, setSummary] = useState<Record<string, unknown> | null>(null);
  const [mines, setMines] = useState<Record<string, unknown>[]>([]);
  const [risks, setRisks] = useState<Record<string, unknown>[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [liveToast, setLiveToast] = useState<string | null>(null);
  const [unreadBadge, setUnreadBadge] = useState(0);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [dashboard, mineRows, riskResponse] = await Promise.all([
        getDashboardSummaryApi(), getMinesApi(), getRiskApi(),
      ]);
      setSummary(dashboard); setMines(mineRows); setRisks(riskResponse.results);
    } catch (e) { setError(e instanceof Error ? e.message : "Backend request failed"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { setHydrated(true); }, []);
  useEffect(() => {
    if (hydrated && !isAuthenticated) void navigate({ to: "/login" });
    else if (hydrated) void load();
  }, [hydrated, isAuthenticated, load, navigate]);

  useNotificationSocket((n) => {
    setUnreadBadge(prev => prev + 1);
    const level = String(n["level"] ?? "info");
    const title = String(n["title"] ?? "New notification");
    if (level === "critical" || level === "warning") {
      setLiveToast(`${level === "critical" ? "🚨" : "⚠️"} ${title}`);
      setTimeout(() => setLiveToast(null), 6000);
    }
  });

  if (!hydrated || !isAuthenticated || !user) return null;
  const Feature = components[activeTab];

  return (
    <main className="coalguard-dashboard min-h-screen bg-background text-foreground">
      {liveToast && (
        <div className="fixed top-4 right-4 z-[100] flex items-center gap-3 rounded-xl border border-red-400 bg-red-50 px-4 py-3 shadow-2xl text-red-800 text-sm font-semibold animate-in slide-in-from-right">
          {liveToast}
          <button onClick={() => setLiveToast(null)} className="ml-2 opacity-60 hover:opacity-100"><X className="size-4" /></button>
        </div>
      )}
      <div className="flex min-h-screen">
        <aside className={`cg-sidebar fixed inset-y-0 left-0 z-40 flex h-screen w-72 flex-col transition-transform lg:sticky lg:top-0 lg:translate-x-0 ${menu ? "translate-x-0" : "-translate-x-full"}`}>
          <div className="cg-sidebar-brand">
            <Link to="/" className="flex items-center gap-3">
              <span className="cg-brand-icon"><ShieldCheck className="size-5" /></span>
              <span className="flex flex-col leading-tight">
                <span className="font-display text-lg font-bold">CoalGuard</span>
                <span className="cg-brand-sub">Mine Command</span>
              </span>
            </Link>
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 lg:hidden" onClick={() => setMenu(false)}><X /></Button>
          </div>
          <nav className="cg-sidebar-nav flex-1 overflow-y-auto px-3 pb-3">
            {tabs.map(({ label, icon: Icon }) => (
              <div key={label}>
              {sectionStarts[label] && <p className="cg-sidebar-section">{sectionStarts[label]}</p>}
              <button
                id={`nav-${label.replace(/\s+/g, "-").toLowerCase()}`}
                onClick={() => { setActiveTab(label); setMenu(false); if (label === "Alerts") setUnreadBadge(0); }}
                className={`cg-sidebar-link ${activeTab === label ? "active" : ""}`}
              >
                <Icon className="size-4" />
                {label}
                {label === "Alerts" && unreadBadge > 0 && (
                  <span className="ml-auto flex size-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">{unreadBadge > 9 ? "9+" : unreadBadge}</span>
                )}
              </button>
              </div>
            ))}
          </nav>
          <div className="cg-sidebar-sync">
            <span className="cg-sync-dot" />
            <div>
              <strong>Live data sync</strong>
              <span>Connected to the backend</span>
            </div>
          </div>
        </aside>
        {menu && <button aria-label="Close menu" className="fixed inset-0 z-30 bg-black/20 lg:hidden" onClick={() => setMenu(false)} />}

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur-sm">
            <div className="flex min-h-16 flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="flex items-center gap-3">
                <Button variant="outline" size="icon" className="lg:hidden" onClick={() => setMenu(true)}><Menu /></Button>
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Central command center</p>
                  <h1 className="font-display text-xl font-semibold">{activeTab}</h1>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <ScopeSwitcher />
                <Button variant="outline" size="sm" onClick={() => setLanguage(language === "en" ? "hi" : "en")}>
                  <Globe className="mr-1 size-4" />{language.toUpperCase()}
                </Button>
                <button id="nav-alerts-badge" onClick={() => { setActiveTab("Alerts"); setUnreadBadge(0); }} className="relative p-2 rounded-md hover:bg-muted">
                  <Bell className="size-5" />
                  {unreadBadge > 0 && <span className="absolute -top-0.5 -right-0.5 size-4 flex items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">{unreadBadge > 9 ? "9+" : unreadBadge}</span>}
                </button>
                <span className="hidden text-right text-xs sm:block">
                  <strong className="block">{user.name}</strong>
                  <span className="text-muted-foreground">{user.orgUnit}</span>
                </span>
                <Button variant="outline" size="icon" aria-label="Log out" onClick={() => { logoutUser(); void navigate({ to: "/login" }); }}>
                  <LogOut className="size-4" />
                </Button>
              </div>
            </div>
          </header>

          <section className="mx-auto max-w-[1700px] space-y-6 px-4 py-6 xl:px-8">
            {Feature
              ? <Feature />
              : <Overview summary={summary} mines={mines} risks={risks} loading={loading} error={error} reload={load} onNavigate={setActiveTab} />}
          </section>
          <AskNetraFloating />
        </div>
      </div>
    </main>
  );
}

// ─── Rich Command Dashboard Overview ─────────────────────────────────────────
function KpiCard({ label, value, delta, deltaLabel, icon, urgent }: { label: string; value: unknown; delta?: number | undefined; deltaLabel?: string; icon: React.ReactNode; urgent?: boolean }) {
  return (
    <article className={`dashboard-card p-5 ${urgent ? "border-red-300 bg-red-50/30" : ""}`}>
      <div className="flex items-center justify-between text-muted-foreground mb-2">
        <span className="text-xs font-semibold uppercase tracking-wider">{label}</span>
        {icon}
      </div>
      <p className={`font-display text-3xl font-bold ${urgent ? "text-red-700" : ""}`}>{fmt(value)}</p>
      {delta !== undefined && (
        <div className={`flex items-center gap-1 mt-1 text-xs ${delta > 0 ? "text-red-600" : delta < 0 ? "text-emerald-600" : "text-muted-foreground"}`}>
          {delta > 0 ? <TrendingUp className="size-3" /> : delta < 0 ? <TrendingDown className="size-3" /> : null}
          <span>{delta > 0 ? "+" : ""}{delta?.toFixed(1)} {deltaLabel}</span>
        </div>
      )}
    </article>
  );
}

/** Latest attendance marks (today, newest first). Polls so marks from the phone show up without a reload. */
function RecentAttendance({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await getAttendanceApi({ page_size: 8 });
        if (alive) { setRows(res.items ?? []); setError(null); }
      } catch (e) { if (alive) setError(e instanceof Error ? e.message : "Could not load attendance"); }
    };
    void load();
    const timer = setInterval(() => void load(), 15000);
    return () => { alive = false; clearInterval(timer); };
  }, []);

  return (
    <div className="dashboard-card p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold flex items-center gap-2"><UserCheck className="size-4 text-emerald-600" /> Recent attendance (today)</h3>
        <button onClick={() => onNavigate("Attendance")} className="text-xs text-primary hover:underline">View all →</button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {!error && rows.length === 0 && <p className="text-sm text-muted-foreground">No attendance marked yet today.</p>}
      <div className="space-y-2">
        {rows.map(r => (
          <div key={fmt(r["id"])} className={`flex items-start gap-3 rounded-lg border p-3 text-sm ${r["valid"] ? "" : "border-red-200 bg-red-50/30"}`}>
            <UserCheck className={`size-4 mt-0.5 shrink-0 ${r["valid"] ? "text-emerald-600" : "text-red-500"}`} />
            <div className="flex-1 min-w-0">
              <p className="font-semibold">{fmt(r["worker_name"])} <span className="font-normal text-muted-foreground">· {fmt(r["contractor_name"])} · {fmt(r["mine_name"])}</span></p>
              {!r["valid"] && r["reason"] ? <p className="text-xs text-red-600 mt-0.5">{fmt(r["reason"])}</p> : null}
            </div>
            <div className="text-right shrink-0">
              <p className={`text-xs font-bold ${r["valid"] ? "text-emerald-600" : "text-red-600"}`}>{r["valid"] ? "Present" : "Rejected"}</p>
              <p className="text-xs text-muted-foreground">{r["time"] ? new Date(String(r["time"])).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit" }) : "—"} · {r["gate_entry"] ? "gate" : fmt(r["source"])}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Latest field hazard reports & voice observations (polls every 15s). */
function RecentObservations({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const { getObservationsApi } = await import("@/lib/api");
        const res = await getObservationsApi({ page_size: 6 });
        if (alive) { setRows(res.items ?? []); setError(null); }
      } catch (e) { if (alive) setError(e instanceof Error ? e.message : "Could not load observations"); }
    };
    void load();
    const timer = setInterval(() => void load(), 15000);
    return () => { alive = false; clearInterval(timer); };
  }, []);

  const getImageUrl = (ev: unknown) => {
    if (!ev || typeof ev !== "object") return null;
    const url = (ev as Record<string, unknown>)["url"];
    if (!url || typeof url !== "string") return null;
    const apiBase = (import.meta.env["VITE_API_URL"] as string) || "http://localhost:8000";
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    return `${apiBase}${url.startsWith("/") ? "" : "/"}${url}`;
  };

  return (
    <div className="dashboard-card p-5 border rounded-xl">
      <div className="flex items-center justify-between mb-4 border-b pb-3">
        <h3 className="font-semibold text-base flex items-center gap-2">
          <AlertTriangle className="size-5 text-amber-500" /> Recent Field Hazard Reports & Voice Observations
        </h3>
        <button onClick={() => onNavigate("Incidents")} className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
          View all reports →
        </button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {!error && rows.length === 0 && <p className="text-sm text-muted-foreground p-4 text-center">No hazard reports recorded yet.</p>}
      <div className="space-y-3">
        {rows.map(r => {
          const imgUrl = getImageUrl(r["evidence"]);
          return (
            <div key={fmt(r["id"])} className="flex flex-col sm:flex-row items-start justify-between gap-3 rounded-xl border p-4 text-sm hover:bg-muted/40 transition-colors bg-card">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <AlertTriangle className={`size-5 mt-0.5 shrink-0 ${r["severity"] === "critical" ? "text-red-600" : r["severity"] === "high" ? "text-orange-500" : "text-amber-500"}`} />
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold uppercase text-muted-foreground">Type:</span>
                    <span className="text-xs font-extrabold uppercase border px-2 py-0.5 rounded bg-amber-50 border-amber-200 text-amber-900">{fmt(r["type"]).replace(/_/g, " ")}</span>
                    
                    <span className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Severity:</span>
                    <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded text-white ${r["severity"] === "critical" ? "bg-red-600" : r["severity"] === "high" ? "bg-orange-500" : r["severity"] === "medium" ? "bg-amber-500" : "bg-emerald-600"}`}>
                      {fmt(r["severity"])}
                    </span>

                    <span className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Category:</span>
                    <span className="text-xs font-semibold bg-muted border px-2 py-0.5 rounded uppercase">{fmt(r["category"]).replace(/_/g, " ")}</span>

                    {r["source"] === "voice" && (
                      <span className="text-[10px] font-bold bg-purple-100 dark:bg-purple-950/60 text-purple-700 border border-purple-300 px-2 py-0.5 rounded-full">
                        🎙️ Voice Report
                      </span>
                    )}
                  </div>

                  <p className="font-medium text-foreground leading-snug pt-1">{fmt(r["text"])}</p>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-1">
                    <span>📍 Spot: <strong>{fmt(r["location_text"]) !== "—" ? fmt(r["location_text"]) : fmt(r["mine_name"])}</strong></span>
                    <span>🕐 Reported: <strong>{r["created_at"] ? new Date(String(r["created_at"])).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "—"}</strong></span>
                    {r["reporter_name"] ? <span>👤 By: <strong>{fmt(r["reporter_name"])}</strong></span> : null}
                  </div>
                </div>
              </div>

              {/* Photo Evidence Thumbnail Preview */}
              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                {imgUrl && (
                  <div className="relative group rounded-lg overflow-hidden border border-emerald-500/40 w-16 h-16 bg-black">
                    <img src={imgUrl} alt="Evidence" className="w-full h-full object-cover" />
                  </div>
                )}
                <button onClick={() => onNavigate("Incidents")} className="text-xs font-bold text-primary hover:underline shrink-0 bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-lg">
                  Details →
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Overview({ summary, mines, risks, loading, error, reload, onNavigate }: {
  summary: Record<string, unknown> | null; mines: Record<string, unknown>[];
  risks: Record<string, unknown>[]; loading: boolean; error: string | null;
  reload: () => Promise<void>; onNavigate: (tab: string) => void;
}) {
  const s = summary ?? {};
  const openCapas = s["open_capas"] as Record<string, unknown> | null;
  const scope = s["scope"] as Record<string, unknown> | null;
  const complianceTrend = Array.isArray(s["compliance_trend"]) ? s["compliance_trend"] as Record<string, unknown>[] : [];
  const incidentsTrend = Array.isArray(s["incidents_trend"]) ? s["incidents_trend"] as Record<string, unknown>[] : [];
  const topRisky = Array.isArray(s["top_risky_mines"]) ? s["top_risky_mines"] as Record<string, unknown>[] : risks.slice(0, 5);
  const recentAlerts = Array.isArray(s["recent_alerts"]) ? s["recent_alerts"] as Record<string, unknown>[] : [];
  const activeSos = Number(s["active_sos"] ?? 0);

  const trendData = complianceTrend.map(pt => ({ month: String(pt["month"] ?? ""), pct: Number(pt["pct"] ?? 0) }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold">Live Command Dashboard</h2>
          <p className="text-sm text-muted-foreground">Real data from the backend{scope ? ` · ${fmt(scope["mines"])} mines · As of ${ist(scope["as_of"])}` : "."}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void reload()} disabled={loading} className="gap-2"><RefreshCw className="size-4" />Refresh</Button>
      </div>

      {activeSos > 0 && (
        <div className="rounded-xl border-2 border-red-500 bg-red-50 p-4 flex items-center gap-3 cursor-pointer" onClick={() => onNavigate("Incidents")}>
          <Siren className="size-7 text-red-600 shrink-0 animate-pulse" />
          <div>
            <p className="font-bold text-red-700 text-lg">🆘 {activeSos} Active SOS alert{activeSos !== 1 ? "s" : ""} — click to respond</p>
            <p className="text-xs text-red-600">Immediate action required</p>
          </div>
        </div>
      )}

      {error && <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-destructive">Backend unavailable: {error} <button onClick={() => void reload()} className="underline ml-2">Retry</button></p>}
      {loading && <p className="text-muted-foreground">Loading backend data…</p>}

      {!loading && !error && (
        <>
          {/* KPI Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard label="Compliance" value={`${fmt(s["compliance_pct"])}%`} delta={s["compliance_delta"] !== undefined ? Number(s["compliance_delta"]) : undefined} deltaLabel="vs prev 30d" icon={<ShieldCheck className="size-4" />} urgent={Number(s["compliance_pct"]) < 60} />
            <KpiCard label="Overdue tasks" value={s["overdue_tasks"]} icon={<AlertTriangle className="size-4 text-amber-500" />} urgent={Number(s["overdue_tasks"]) > 50} />
            <KpiCard label="Open CAPAs" value={openCapas?.["total"]} delta={openCapas ? Number(openCapas["overdue"]) : undefined} deltaLabel="overdue" icon={<ClipboardCheck className="size-4 text-purple-500" />} />
            <KpiCard label="Incidents (month)" value={s["incidents_month"]} delta={s["incidents_previous"] !== undefined ? Number(s["incidents_month"]) - Number(s["incidents_previous"]) : undefined} deltaLabel="vs prev" icon={<AlertTriangle className="size-4 text-red-500" />} urgent={Number(s["incidents_month"]) > 0} />
            <KpiCard label="Near misses" value={s["near_miss_month"]} icon={<AlertTriangle className="size-4 text-amber-400" />} />
            <KpiCard label="Workers present" value={s["active_workers_today"]} delta={s["active_workers_same_day_last_week"] !== undefined ? Number(s["active_workers_today"]) - Number(s["active_workers_same_day_last_week"]) : undefined} deltaLabel="vs last week" icon={<UserCheck className="size-4 text-emerald-500" />} />
            <KpiCard label="Avg trust score" value={`${fmt(s["avg_trust_score"])}%`} icon={<ShieldCheck className="size-4 text-blue-500" />} />
            <KpiCard label="Invalid attendance" value={s["invalid_attendance_today"]} icon={<AlertTriangle className="size-4 text-red-400" />} urgent={Number(s["invalid_attendance_today"]) > 20} />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <RecentObservations onNavigate={onNavigate} />
            <RecentAttendance onNavigate={onNavigate} />
          </div>

          {/* Charts */}
          {trendData.length > 1 && (
            <div className="dashboard-card p-5">
              <h3 className="font-semibold mb-4">Compliance trend (6 months)</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
                  <Tooltip formatter={(v) => `${v}%`} />
                  <Line type="monotone" dataKey="pct" stroke="var(--primary)" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Open CAPA breakdown */}
          {openCapas && (
            <div className="dashboard-card p-5">
              <h3 className="font-semibold mb-3">Open CAPA breakdown</h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[["< 7 days left", fmt(openCapas["lt7"]), "text-emerald-600"], ["7–30 days", fmt(openCapas["d7_30"]), "text-amber-600"], ["> 30 days", fmt(openCapas["gt30"]), "text-blue-600"], ["Overdue", fmt(openCapas["overdue"]), "text-red-700"]].map(([l, v, cls]) => (
                  <div key={String(l)} className="rounded-lg border p-3 text-center">
                    <p className="text-xs text-muted-foreground">{l}</p>
                    <p className={`font-display text-2xl font-bold mt-1 ${cls}`}>{v}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top risky mines */}
          {topRisky.length > 0 && (
            <div className="dashboard-card p-5">
              <h3 className="font-semibold mb-3">Top risky mines</h3>
              <div className="space-y-2">
                {topRisky.map(m => {
                  const level = String(m["level"] ?? m["risk_level"] ?? "medium").toLowerCase();
                  const pct = Number(m["risk_pct"] ?? 0);
                  const reasons = Array.isArray(m["reasons"]) ? m["reasons"] as Record<string, unknown>[] : [];
                  return (
                    <div key={fmt(m["mine_id"] ?? m["id"])} className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/40 ${level === "high" ? "border-red-200 bg-red-50/30" : ""}`} onClick={() => onNavigate("Mines")}>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">{fmt(m["mine_name"] ?? m["name"])}</p>
                        <p className="text-xs text-muted-foreground">{fmt(m["top_reason"] ?? (reasons[0] ? reasons[0]["factor"] : undefined))}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 rounded-full bg-muted overflow-hidden">
                          <div className={`h-full rounded-full ${level === "high" ? "bg-red-500" : level === "medium" ? "bg-amber-400" : "bg-emerald-500"}`} style={{ width: `${Math.min(100, pct)}%` }} />
                        </div>
                        <span className={`text-xs font-mono font-bold w-12 text-right ${level === "high" ? "text-red-600" : level === "medium" ? "text-amber-600" : "text-emerald-600"}`}>{pct.toFixed(0)}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recent alerts */}
          {recentAlerts.length > 0 && (
            <div className="dashboard-card p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">Recent alerts</h3>
                <button onClick={() => onNavigate("Alerts")} className="text-xs text-primary hover:underline">View all →</button>
              </div>
              <div className="space-y-2">
                {recentAlerts.slice(0, 5).map(a => (
                  <div key={fmt(a["id"])} className={`rounded-lg border p-3 text-sm ${a["level"] === "critical" ? "border-red-200 bg-red-50/30" : "border-amber-200 bg-amber-50/30"}`}>
                    <p className="font-semibold">{fmt(a["title"])}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{ist(a["created_at"])}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Mines quick table */}
          {mines.length > 0 && (
            <div className="dashboard-card overflow-hidden">
              <div className="border-b p-4 flex items-center justify-between">
                <h3 className="font-semibold">Mine sites ({mines.length})</h3>
                <button onClick={() => onNavigate("Mines")} className="text-xs text-primary hover:underline">Full directory →</button>
              </div>
              <div className="overflow-x-auto">
                <table className="dashboard-table min-w-full">
                  <thead><tr><th>Mine</th><th>Type</th><th>Compliance</th><th>Overdue tasks</th><th>Open CAPAs</th><th>Risk</th></tr></thead>
                  <tbody>
                    {mines.slice(0, 10).map(m => {
                      const risk = (m["risk"] as Record<string, unknown> | undefined);
                      const level = String(risk?.["level"] ?? "medium").toLowerCase();
                      return (
                        <tr key={fmt(m["id"])}>
                          <td className="font-semibold">{fmt(m["name"])}</td>
                          <td className="text-xs">{fmt(m["mine_type"])}</td>
                          <td>{fmt(m["compliance_pct"])}%</td>
                          <td className={Number(m["overdue_tasks"]) > 0 ? "text-red-600 font-semibold" : ""}>{fmt(m["overdue_tasks"])}</td>
                          <td>{fmt(m["open_capas"])}</td>
                          <td><span className={`text-xs font-bold ${level === "high" ? "text-red-600" : level === "medium" ? "text-amber-600" : "text-emerald-600"}`}>{level}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
