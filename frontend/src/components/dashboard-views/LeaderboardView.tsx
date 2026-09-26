import { useCallback, useEffect, useState } from "react";
import { Trophy, RefreshCw, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getLeaderboardApi, type Row } from "@/lib/api";

const fmt = (v: unknown) => v === null || v === undefined || v === "" ? "—" : String(v);
const currentMonth = new Date().toISOString().slice(0, 7);

const medals = ["🥇", "🥈", "🥉"];
const trendIcon = (trend: unknown) => {
  if (trend === "up") return <TrendingUp className="size-4 text-emerald-500" />;
  if (trend === "down") return <TrendingDown className="size-4 text-red-500" />;
  return <Minus className="size-4 text-muted-foreground" />;
};
const scoreColor = (score: number) => score >= 80 ? "text-emerald-600" : score >= 60 ? "text-amber-600" : "text-red-600";

export function LeaderboardView() {
  const [data, setData] = useState<Row | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(currentMonth);
  const [by, setBy] = useState<"mine" | "subsidiary">("mine");

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { setData(await getLeaderboardApi(month, by)); }
    catch (e) { setError(e instanceof Error ? e.message : "Failed to load leaderboard"); }
    finally { setLoading(false); }
  }, [month, by]);

  useEffect(() => { void load(); }, [load]);

  const rows = Array.isArray((data as Record<string, unknown>)?.rows) ? (data as Record<string, unknown>).rows as Row[] : [];
  const top3 = rows.slice(0, 3);
  const rest = rows.slice(3);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight flex items-center gap-2"><Trophy className="size-6 text-amber-500" /> Safety Leaderboard</h2>
          <p className="text-sm text-muted-foreground">Backend-computed safety scores for {fmt(data?.month)} · Ranked by mines in your scope.</p>
        </div>
        <div className="flex items-center gap-2">
          <input type="month" value={month} onChange={e => setMonth(e.target.value)} className="rounded-md border bg-background px-3 py-2 text-sm" />
          <select value={by} onChange={e => setBy(e.target.value as "mine" | "subsidiary")} className="rounded-md border bg-background px-3 py-2 text-sm">
            <option value="mine">By mine</option>
            <option value="subsidiary">By subsidiary</option>
          </select>
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-1"><RefreshCw className="size-4" /> Refresh</Button>
        </div>
      </div>

      {error && <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive flex justify-between"><span>{error}</span><Button variant="outline" size="sm" onClick={load}>Retry</Button></div>}
      {loading && <p className="text-muted-foreground text-sm">Loading leaderboard…</p>}

      {!loading && top3.length > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          {top3.map((row, i) => {
            const score = Number(row.safety_score ?? 0);
            return (
              <article key={fmt(row.id ?? row.name)} className={`dashboard-card p-5 text-center ${i === 0 ? "ring-2 ring-amber-400/50" : ""}`}>
                <div className="text-4xl mb-2">{medals[i]}</div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Rank #{i + 1}</p>
                <h3 className="font-display text-lg font-bold leading-snug">{fmt(row.name)}</h3>
                <p className="text-xs text-muted-foreground">{fmt(row.subsidiary)} {by === "mine" ? `· ${fmt(row.area)}` : ""}</p>
                <div className="flex items-center justify-center gap-2 mt-3">
                  <span className={`font-display text-3xl font-bold ${scoreColor(score)}`}>{score.toFixed(1)}</span>
                  {trendIcon(row.trend)}
                </div>
                <div className="grid grid-cols-2 gap-2 mt-3 text-xs text-left">
                  {[["Compliance", `${fmt(row.compliance_pct)}%`], ["Incidents", fmt(row.incidents)], ["Overdue CAPAs", fmt(row.overdue_capas)], ["Trust score", `${fmt(row.avg_trust_score)}%`]].map(([l, v]) => (
                    <div key={String(l)}><p className="text-muted-foreground">{l}</p><p className="font-semibold">{v}</p></div>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {!loading && rest.length > 0 && (
        <div className="dashboard-card overflow-hidden">
          <div className="border-b p-4"><h3 className="font-semibold">Full ranking</h3></div>
          <div className="overflow-x-auto">
            <table className="dashboard-table min-w-full">
              <thead><tr><th>Rank</th><th>Name</th><th>Subsidiary</th><th>Score</th><th>Trend</th><th>Compliance</th><th>Incidents</th><th>Overdue CAPAs</th></tr></thead>
              <tbody>
                {rest.map(row => {
                  const score = Number(row.safety_score ?? 0);
                  return (
                    <tr key={fmt(row.id ?? row.name)}>
                      <td className="font-bold text-center">#{fmt(row.rank)}</td>
                      <td className="font-semibold">{fmt(row.name)}</td>
                      <td className="text-muted-foreground text-xs">{fmt(row.subsidiary)}</td>
                      <td><span className={`font-bold ${scoreColor(score)}`}>{score.toFixed(1)}</span></td>
                      <td>{trendIcon(row.trend)}</td>
                      <td>{fmt(row.compliance_pct)}%</td>
                      <td>{Number(row.incidents) > 0 ? <span className="text-red-600 font-semibold">{fmt(row.incidents)}</span> : "0"}</td>
                      <td>{Number(row.overdue_capas) > 0 ? <span className="text-amber-600 font-semibold">{fmt(row.overdue_capas)}</span> : "0"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {!loading && rows.length === 0 && !error && <p className="rounded-xl border p-8 text-center text-muted-foreground">No leaderboard data available for this month.</p>}
    </div>
  );
}
