import { useCallback, useEffect, useState } from "react";
import { Sparkles, RefreshCw, BookOpen, CheckCircle, XCircle, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getMinesApi, getMineProfileApi, saveMineProfileApi, getMineObligationsApi, decideObligationApi, refreshObligationsApi, type MineProfileData, type ObligationItem, type Row } from "@/lib/api";
import { useAppStore } from "@/store/useAppStore";

const fmt = (v: unknown) => v === null || v === undefined || v === "" ? "—" : String(v);
const count = (v: unknown) => Array.isArray(v) ? v.length : Number(v ?? 0);
const sourceLabel: Record<string, string> = { ml_engine: "ML engine (Coal Mines Regulations 2017)", rules_fallback: "built-in rule matcher" };
/** "12 obligation(s) added (CMR-75-1, …), 3 removed, 24 tasks created — by the ML engine" from the backend's sync result. */
function syncSummary(ob: Record<string, unknown> | undefined): string {
  if (!ob) return "";
  const added = Array.isArray(ob.added) ? (ob.added as string[]) : [];
  const shown = added.slice(0, 6).join(", ") + (added.length > 6 ? ", …" : "");
  return `${added.length} obligation(s) added${added.length ? ` (${shown})` : ""}, ${count(ob.removed)} removed, ` +
    `${count(ob.unchanged)} unchanged, ${count(ob.tasks_created)} task(s) created` +
    `${count(ob.tasks_removed) ? `, ${count(ob.tasks_removed)} future task(s) removed` : ""} — decided by the ` +
    `${sourceLabel[String(ob.source)] ?? fmt(ob.source)}.${ob.note ? ` ${String(ob.note)}` : ""}`;
}
const severityColor: Record<string, string> = { critical: "text-red-700", high: "text-orange-600", medium: "text-amber-600", low: "text-blue-600" };
const freqColor: Record<string, string> = { daily: "bg-red-50 text-red-700 border-red-200", weekly: "bg-amber-50 text-amber-700 border-amber-200", monthly: "bg-blue-50 text-blue-700 border-blue-200", quarterly: "bg-purple-50 text-purple-700 border-purple-200", yearly: "bg-slate-50 text-slate-700 border-slate-200" };

function NotApplicableDialog({ obligation, mineId, close, reload }: { obligation: ObligationItem; mineId: number; close: () => void; reload: () => Promise<void> }) {
  const [remark, setRemark] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!remark.trim()) { setError("A remark is required to mark not applicable."); return; }
    setSubmitting(true); setError(null);
    try {
      await decideObligationApi(mineId, obligation.id, "not_applicable", remark);
      await reload(); close();
    } catch (err) { setError(err instanceof Error ? err.message : "Failed"); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <section role="dialog" aria-modal="true" className="dashboard-card w-full max-w-md bg-card p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b pb-3 mb-4">
          <h3 className="font-bold">Mark Not Applicable</h3>
          <Button variant="ghost" size="icon" onClick={close}><X className="size-4" /></Button>
        </div>
        <p className="text-sm text-muted-foreground mb-4">{obligation.obligation.code} — {obligation.obligation.title}</p>
        <form onSubmit={e => void submit(e)} className="space-y-4">
          <label className="block text-sm font-medium">Reason (required) *
            <textarea required value={remark} onChange={e => setRemark(e.target.value)} rows={3} placeholder="Why does this obligation not apply?" className="mt-1 block w-full rounded-md border bg-background p-2 text-sm" />
          </label>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={close}>Cancel</Button>
            <Button disabled={submitting} variant="destructive">{submitting ? "Saving…" : "Mark not applicable"}</Button>
          </div>
        </form>
      </section>
    </div>
  );
}

function ProfileForm({ mineId, onSaved }: { mineId: number; onSaved: (result: Row) => void }) {
  const blank: MineProfileData = { working_method: "UG", worker_count: 0, contract_worker_count: 0, production_capacity_mtpa: 0, uses_explosives: false, has_conveyor: false, has_hemm: false, has_washery: false, near_water_body: false, forest_land: false, ec_number: "", cto_valid_till: "", state: "" };
  const [profile, setProfile] = useState<MineProfileData>(blank);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<Row | null>(null);

  useEffect(() => {
    let cancelled = false;
    getMineProfileApi(mineId).then(p => { if (!cancelled) setProfile(p); }).catch(() => { /* 404 = no profile yet, use blank */ }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [mineId]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError(null); setSuccess(null);
    try {
      const data = { ...profile, seam_gas_degree: profile.working_method !== "UG" ? null : profile.seam_gas_degree };
      const r = await saveMineProfileApi(mineId, data);
      setSuccess(r);
      onSaved(r);
    } catch (err) { setError(err instanceof Error ? err.message : "Save failed"); }
    finally { setSaving(false); }
  };

  const set = (field: keyof MineProfileData, value: unknown) => setProfile(prev => ({ ...prev, [field]: value }));
  const toggle = (field: keyof MineProfileData) => setProfile(prev => ({ ...prev, [field]: !prev[field] }));

  if (loading) return <p className="text-muted-foreground text-sm">Loading profile…</p>;

  return (
    <form onSubmit={e => void save(e)} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className="text-sm font-medium">Working method *
          <select value={profile.working_method} onChange={e => set("working_method", e.target.value)} className="mt-1 block w-full rounded-md border bg-background p-2 text-sm">
            <option value="UG">Underground (UG)</option>
            <option value="OC">Open-cast (OC)</option>
            <option value="MIXED">Mixed</option>
          </select>
        </label>
        {profile.working_method === "UG" && (
          <label className="text-sm font-medium">Seam gas degree
            <select value={String(profile.seam_gas_degree ?? "")} onChange={e => set("seam_gas_degree", e.target.value ? Number(e.target.value) : null)} className="mt-1 block w-full rounded-md border bg-background p-2 text-sm">
              <option value="">None</option>
              <option value="1">Degree 1</option>
              <option value="2">Degree 2</option>
              <option value="3">Degree 3</option>
            </select>
          </label>
        )}
        <label className="text-sm font-medium">Depth (m)
          <input type="number" value={profile.depth_m ?? ""} onChange={e => set("depth_m", e.target.value ? Number(e.target.value) : undefined)} className="mt-1 block w-full rounded-md border bg-background p-2 text-sm" />
        </label>
        <label className="text-sm font-medium">Worker count *
          <input type="number" required value={profile.worker_count} onChange={e => set("worker_count", Number(e.target.value))} className="mt-1 block w-full rounded-md border bg-background p-2 text-sm" />
        </label>
        <label className="text-sm font-medium">Contract workers
          <input type="number" value={profile.contract_worker_count} onChange={e => set("contract_worker_count", Number(e.target.value))} className="mt-1 block w-full rounded-md border bg-background p-2 text-sm" />
        </label>
        <label className="text-sm font-medium">Production capacity (MTPA) *
          <input type="number" step="0.01" required value={profile.production_capacity_mtpa} onChange={e => set("production_capacity_mtpa", Number(e.target.value))} className="mt-1 block w-full rounded-md border bg-background p-2 text-sm" />
        </label>
        <label className="text-sm font-medium">EC number
          <input type="text" value={profile.ec_number} onChange={e => set("ec_number", e.target.value)} className="mt-1 block w-full rounded-md border bg-background p-2 text-sm" />
        </label>
        <label className="text-sm font-medium">CTO valid till
          <input type="date" value={profile.cto_valid_till} onChange={e => set("cto_valid_till", e.target.value)} className="mt-1 block w-full rounded-md border bg-background p-2 text-sm" />
        </label>
        <label className="text-sm font-medium">State
          <input type="text" value={profile.state} onChange={e => set("state", e.target.value)} className="mt-1 block w-full rounded-md border bg-background p-2 text-sm" placeholder="Jharkhand" />
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {(["uses_explosives", "has_conveyor", "has_hemm", "has_washery", "near_water_body", "forest_land"] as (keyof MineProfileData)[]).map(field => (
          <label key={field} className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={Boolean(profile[field])} onChange={() => toggle(field)} className="rounded" />
            {field.replace(/_/g, " ")}
          </label>
        ))}
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {success && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm text-emerald-700">
          Profile saved. {syncSummary((success as Record<string, unknown>).obligations as Record<string, unknown> | undefined)}
        </div>
      )}
      <div className="flex justify-end">
        <Button disabled={saving} type="submit">{saving ? "Saving profile (may take ~20s for ML)…" : "Save mine profile"}</Button>
      </div>
    </form>
  );
}

export function RuleStudioView() {
  const { user } = useAppStore();
  const [mines, setMines] = useState<Row[]>([]);
  const [selectedMineId, setSelectedMineId] = useState<number | null>(user?.mineId ?? null);
  const [obligations, setObligations] = useState<ObligationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [markNA, setMarkNA] = useState<ObligationItem | null>(null);
  const [tab, setTab] = useState<"profile" | "obligations">("obligations");
  const [refreshResult, setRefreshResult] = useState<string | null>(null);

  useEffect(() => {
    void getMinesApi().then(setMines).catch(() => {});
  }, []);

  const loadObligations = useCallback(async (mineId: number) => {
    setLoading(true); setError(null);
    try { setObligations(await getMineObligationsApi(mineId)); }
    catch (e) { setError(e instanceof Error ? e.message : "Failed to load obligations"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (selectedMineId) void loadObligations(selectedMineId);
  }, [selectedMineId, loadObligations]);

  const refreshObligation = async () => {
    if (!selectedMineId) return;
    setRefreshing(true); setError(null); setRefreshResult(null);
    try {
      const r = await refreshObligationsApi(selectedMineId) as Record<string, unknown>;
      const ob = r.obligations as Record<string, unknown> | undefined;
      setRefreshResult(ob ? `Refreshed. ${syncSummary(ob)}` : "Obligations refreshed.");
      await loadObligations(selectedMineId);
    } catch (e) { setError(e instanceof Error ? e.message : "Refresh failed"); }
    finally { setRefreshing(false); }
  };

  const reActivate = async (ob: ObligationItem) => {
    if (!selectedMineId) return;
    try { await decideObligationApi(selectedMineId, ob.id, "active"); await loadObligations(selectedMineId); }
    catch (e) { setError(e instanceof Error ? e.message : "Reactivate failed"); }
  };

  const canEdit = user && ["mine_manager", "area_gm", "subsidiary_admin", "cil_admin"].includes(user.role);
  const active = obligations.filter(o => o.status === "active");
  const notApplicable = obligations.filter(o => o.status === "not_applicable");

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight flex items-center gap-2"><Sparkles className="size-6 text-primary" /> Mine Profile & Rules</h2>
          <p className="text-sm text-muted-foreground">Edit the mine profile. The ML engine derives applicable obligations automatically.</p>
        </div>
      </div>

      <div className="flex gap-3 items-center flex-wrap">
        <select value={selectedMineId ?? ""} onChange={e => setSelectedMineId(Number(e.target.value))} className="rounded-md border bg-background px-3 py-2 text-sm">
          <option value="">Select mine…</option>
          {mines.map(m => <option key={fmt(m.id)} value={fmt(m.id)}>{fmt(m.name)}</option>)}
        </select>
        <div className="flex rounded-lg border overflow-hidden">
          <button onClick={() => setTab("obligations")} className={`px-3 py-1.5 text-sm transition-colors ${tab === "obligations" ? "bg-primary text-primary-foreground" : "bg-muted/30 hover:bg-muted"}`}>Obligations</button>
          <button onClick={() => setTab("profile")} className={`px-3 py-1.5 text-sm transition-colors ${tab === "profile" ? "bg-primary text-primary-foreground" : "bg-muted/30 hover:bg-muted"}`}>Edit Profile</button>
        </div>
        {tab === "obligations" && selectedMineId && (
          <Button variant="outline" size="sm" onClick={() => void refreshObligation()} disabled={refreshing} className="gap-1"><RotateCcw className="size-4" />{refreshing ? "Refreshing…" : "Refresh obligations"}</Button>
        )}
        {tab === "obligations" && selectedMineId && (
          <Button variant="outline" size="sm" onClick={() => void loadObligations(selectedMineId)} disabled={loading} className="gap-1"><RefreshCw className="size-4" />Reload</Button>
        )}
      </div>

      {!selectedMineId && <div className="rounded-xl border p-12 text-center text-muted-foreground"><BookOpen className="size-10 mx-auto mb-3 opacity-30" /><p>Select a mine to view its profile and applicable obligations.</p></div>}

      {error && <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive flex justify-between"><span>{error}</span><Button variant="outline" size="sm" onClick={() => selectedMineId && loadObligations(selectedMineId)}>Retry</Button></div>}
      {refreshResult && <p role="status" className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm text-emerald-700">{refreshResult}</p>}

      {selectedMineId && tab === "profile" && (
        <div className="dashboard-card p-5">
          <h3 className="font-semibold mb-4">Mine Profile Form</h3>
          <ProfileForm mineId={selectedMineId} onSaved={async () => { await loadObligations(selectedMineId); }} />
        </div>
      )}

      {selectedMineId && tab === "obligations" && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="dashboard-card p-4"><p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Active obligations</p><p className="font-display text-3xl font-bold text-emerald-600 mt-2">{active.length}</p></div>
            <div className="dashboard-card p-4"><p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Not applicable</p><p className="font-display text-3xl font-bold text-muted-foreground mt-2">{notApplicable.length}</p></div>
            <div className="dashboard-card p-4"><p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Total</p><p className="font-display text-3xl font-bold mt-2">{obligations.length}</p></div>
          </div>

          {loading && <p className="text-muted-foreground text-sm">Loading obligations…</p>}

          {!loading && active.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold">Active Obligations</h3>
              {active.map(ob => (
                <article key={ob.id} className="dashboard-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <code className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono">{ob.obligation.code}</code>
                        <span className={`text-[10px] font-bold border px-1.5 py-0.5 rounded ${freqColor[ob.obligation.frequency] ?? "bg-slate-50 border-slate-200"}`}>{ob.obligation.frequency}</span>
                        <span className={`text-xs font-semibold ${severityColor[ob.obligation.severity] ?? ""}`}>{ob.obligation.severity}</span>
                        <span className="text-[10px] text-muted-foreground">{ob.obligation.category}</span>
                        <span className="text-[10px] bg-blue-50 border border-blue-200 text-blue-700 px-1.5 py-0.5 rounded">{ob.source} · {(ob.confidence * 100).toFixed(0)}%</span>
                      </div>
                      <p className="text-sm font-semibold leading-snug">{ob.obligation.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{ob.obligation.law_ref}</p>
                      {ob.reason && <p className="text-xs text-muted-foreground mt-1 italic">{ob.reason}</p>}
                      <p className="text-xs text-muted-foreground mt-0.5">Evidence needed: {ob.obligation.evidence_needed}</p>
                    </div>
                    {canEdit && (
                      <Button size="sm" variant="outline" className="shrink-0 text-xs" onClick={() => setMarkNA(ob)}>Mark N/A</Button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}

          {!loading && notApplicable.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-muted-foreground">Not Applicable ({notApplicable.length})</h3>
              {notApplicable.map(ob => (
                <article key={ob.id} className="dashboard-card p-4 opacity-60">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <XCircle className="size-4 text-muted-foreground" />
                        <code className="text-[10px] font-mono">{ob.obligation.code}</code>
                        <span className="text-sm">{ob.obligation.title}</span>
                      </div>
                      {ob.remark && <p className="text-xs text-muted-foreground">Reason: {ob.remark}</p>}
                    </div>
                    {canEdit && (
                      <Button size="sm" variant="ghost" className="text-xs shrink-0" onClick={() => void reActivate(ob)}>Re-activate</Button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}

      {markNA && selectedMineId && (
        <NotApplicableDialog
          obligation={markNA}
          mineId={selectedMineId}
          close={() => setMarkNA(null)}
          reload={async () => { await loadObligations(selectedMineId); }}
        />
      )}
    </div>
  );
}
