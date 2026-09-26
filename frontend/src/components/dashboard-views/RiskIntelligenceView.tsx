import { useCallback, useEffect, useState } from "react";
import { BrainCircuit, RefreshCw, AlertTriangle, Repeat, Cpu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getRiskApi, getAnomaliesApi, getRecurrenceApi, retrainRiskApi, type RiskModelInfo, type Row } from "@/lib/api";
import { useAppStore } from "@/store/useAppStore";

const fmt = (v: unknown) => v === null || v === undefined || v === "" ? "—" : String(v);
const ist = (v: unknown) => v ? new Date(String(v)).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" }) : "—";
const riskColor: Record<string, string> = { high: "text-red-600 bg-red-50 border-red-200", medium: "text-amber-600 bg-amber-50 border-amber-200", low: "text-emerald-600 bg-emerald-50 border-emerald-200" };
const riskBarColor: Record<string, string> = { high: "bg-red-500", medium: "bg-amber-400", low: "bg-emerald-500" };
const anomalyLabel: Record<string, string> = { production_dispatch_gap: "Production vs dispatch", attendance_spike: "Attendance spike", env_spike: "PM10 spike" };
const RETRAIN_ROLES = new Set(["cil_admin", "subsidiary_admin"]);

function RiskBar({ pct, level }: { pct: number; level: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full transition-all ${riskBarColor[level] ?? "bg-primary"}`} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
      <span className="text-xs font-mono w-12 text-right">{pct.toFixed(1)}%</span>
    </div>
  );
}

export function RiskIntelligenceView() {
  const role = useAppStore(s => s.user?.role);
  const [risks, setRisks] = useState<Row[]>([]);
  const [model, setModel] = useState<RiskModelInfo | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [anomalies, setAnomalies] = useState<Row[] | null>(null);
  const [recurrence, setRecurrence] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [retraining, setRetraining] = useState(false);
  const [anomError, setAnomError] = useState<string | null>(null);
  const [recError, setRecError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null); setAnomError(null); setRecError(null);
    getAnomaliesApi().then(r => setAnomalies(r.anomalies)).catch(e => { setAnomalies(null); setAnomError(e instanceof Error ? e.message : "Anomaly fetch failed"); });
    getRecurrenceApi().then(r => setRecurrence(r.violations)).catch(e => { setRecurrence(null); setRecError(e instanceof Error ? e.message : "Recurrence fetch failed"); });
    try {
      const r = await getRiskApi();
      setRisks(r.results); setModel(r.model); setGeneratedAt(r.generated_at);
    } catch (e) { setRisks([]); setModel(null); setError(e instanceof Error ? e.message : "ML risk fetch failed"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const retrain = async () => {
    setRetraining(true);
    try { await retrainRiskApi(); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : "Re-training failed"); }
    finally { setRetraining(false); }
  };

  const sorted = [...risks].sort((a, b) => Number(b.risk_pct ?? 0) - Number(a.risk_pct ?? 0));
  const highCount = risks.filter(r => fmt(r.level) === "high").length;
  const medCount = risks.filter(r => fmt(r.level) === "medium").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight flex items-center gap-2"><BrainCircuit className="size-6 text-primary" /> Risk Intelligence</h2>
          <p className="text-sm text-muted-foreground">Chance of an incident in the next 14 days, predicted from live mine data.</p>
        </div>
        <div className="flex gap-2">
          {role && RETRAIN_ROLES.has(role) && (
            <Button variant="outline" size="sm" onClick={retrain} disabled={retraining || loading} className="gap-1"><Cpu className="size-4" /> {retraining ? "Re-training…" : "Re-train model"}</Button>
          )}
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-1"><RefreshCw className="size-4" /> Refresh</Button>
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          <p className="font-semibold">ML risk forecast unavailable</p>
          <p className="mt-1">{error}</p>
          <Button variant="outline" size="sm" onClick={load} className="mt-2">Retry</Button>
        </div>
      )}

      {model && (
        <div className="dashboard-card p-4 text-xs text-muted-foreground grid gap-1 sm:grid-cols-2 lg:grid-cols-4">
          <p><span className="font-semibold text-foreground">Predicted at:</span> {ist(generatedAt)}</p>
          <p><span className="font-semibold text-foreground">Model trained:</span> {ist(model.trained_at)}</p>
          <p><span className="font-semibold text-foreground">Training data:</span> {model.training_rows} mine-days ({model.positive_rows} followed by an incident)</p>
          <p><span className="font-semibold text-foreground">Hold-out AUC:</span> {model.holdout_auc ?? "not enough recent incidents to measure"}</p>
        </div>
      )}

      {!loading && !error && (
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { label: "Mines monitored", value: risks.length, color: "text-foreground" },
            { label: "High risk", value: highCount, color: "text-red-600" },
            { label: "Medium risk", value: medCount, color: "text-amber-600" },
          ].map(({ label, value, color }) => (
            <div key={label} className="dashboard-card p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
              <p className={`font-display text-3xl font-bold mt-2 ${color}`}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {!loading && sorted.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold">Mine Risk Rankings</h3>
          {sorted.map(r => {
            const level = fmt(r.level).toLowerCase();
            const pct = Number(r.risk_pct ?? 0);
            const reasons = Array.isArray(r.reasons) ? r.reasons as Row[] : [];
            return (
              <article key={fmt(r.mine_id)} className={`dashboard-card p-4 border ${riskColor[level] ?? ""}`}>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <h4 className="font-display font-bold">{fmt(r.mine_name)}</h4>
                      <span className={`text-[10px] font-bold border px-1.5 py-0.5 rounded uppercase ${riskColor[level] ?? ""}`}>{level} risk</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Mine #{fmt(r.mine_id)} · data as of {ist(r.features_as_of)}</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-display text-2xl font-bold ${riskColor[level]?.split(" ")[0] ?? ""}`}>{pct.toFixed(0)}%</p>
                    <p className="text-[10px] text-muted-foreground">incident chance, 14 days</p>
                  </div>
                </div>
                <RiskBar pct={pct} level={level} />
                {reasons.length > 0 && (
                  <div className="mt-3 space-y-1">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">What raises the risk</p>
                    {reasons.map((reason, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{fmt(reason.factor)}</span>
                        <span className="font-semibold">{fmt(reason.value)} <span className="text-muted-foreground">({fmt(reason.impact_pct)}% of the increase)</span></span>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      <div className="dashboard-card p-5">
        <h3 className="font-semibold mb-3 flex items-center gap-2"><AlertTriangle className="size-4 text-amber-500" /> Anomalies (last 30 days)</h3>
        {anomError && <p role="alert" className="text-sm text-destructive">{anomError}</p>}
        {anomalies && anomalies.length === 0 && <p className="text-sm text-muted-foreground">No unusual production, attendance or PM10 days in your mines.</p>}
        {anomalies && anomalies.length > 0 && (
          <div className="space-y-2">
            {anomalies.map(a => (
              <div key={fmt(a.id)} className="text-sm border rounded-lg p-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold">{anomalyLabel[fmt(a.type)] ?? fmt(a.type)} · {fmt(a.mine_name)}</p>
                  <p className="text-xs text-muted-foreground">{fmt(a.description)}</p>
                </div>
                <p className="text-xs font-mono text-muted-foreground whitespace-nowrap">{fmt(a.date)} · score {fmt(a.score)}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="dashboard-card p-5">
        <h3 className="font-semibold mb-3 flex items-center gap-2"><Repeat className="size-4 text-primary" /> Recurring problems (last 60 days)</h3>
        {recError && <p role="alert" className="text-sm text-destructive">{recError}</p>}
        {recurrence && recurrence.length === 0 && <p className="text-sm text-muted-foreground">No finding has repeated 3 or more times.</p>}
        {recurrence && recurrence.length > 0 && (
          <div className="space-y-2">
            {recurrence.map(r => {
              const byMine = Array.isArray(r.by_mine) ? r.by_mine as Row[] : [];
              return (
                <div key={fmt(r.cluster_id)} className="text-sm border rounded-lg p-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-semibold">"{fmt(r.label)}"</p>
                    <span className="text-xs font-bold whitespace-nowrap">{fmt(r.count)}× in {fmt(r.days_span)} days</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Category {fmt(r.category)} · last seen {ist(r.last_seen)}</p>
                  <p className="text-xs mt-1">{byMine.map(m => `${fmt(m.mine_name)} (${fmt(m.count)})`).join(" · ")}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
