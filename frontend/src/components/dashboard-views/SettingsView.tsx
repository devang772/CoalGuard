import { useCallback, useEffect, useState } from "react";
import { Settings, RefreshCw, Play, Save, User, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getEscalationConfigApi, saveEscalationConfigApi, getJobsStatusApi, runJobApi, getMeApi, updateProfileApi, changePasswordApi, type Row } from "@/lib/api";
import { useAppStore } from "@/store/useAppStore";

const fmt = (v: unknown) => v === null || v === undefined || v === "" ? "—" : String(v);
const ist = (v: unknown) => { try { return new Date(String(v)).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }); } catch { return fmt(v); } };

const JOB_LABELS: Record<string, string> = { escalation: "Escalation", nightly: "Nightly", reminders: "Reminders", digest: "Digest" };

export function SettingsView() {
  const { user, loginUser, accessToken } = useAppStore();
  const [config, setConfig] = useState<Row[]>([]);
  const [jobs, setJobs] = useState<Row | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [runningJob, setRunningJob] = useState<string | null>(null);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [profileName, setProfileName] = useState(user?.name ?? "");
  const [language, setLanguage] = useState(user?.role ?? "en");
  const [currPw, setCurrPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [pwMsg, setPwMsg] = useState<string | null>(null);
  const [pwError, setPwError] = useState<string | null>(null);
  const [savingPw, setSavingPw] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);
  const [profileErr, setProfileErr] = useState<string | null>(null);

  const isCilAdmin = user?.role === "cil_admin";

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [cfg, jobStatus] = await Promise.all([getEscalationConfigApi(), getJobsStatusApi()]);
      setConfig(cfg); setJobs(jobStatus);
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to load settings"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { setProfileName(user?.name ?? ""); }, [user]);

  const saveConfig = async () => {
    setSaving(true); setSaveMsg(null); setError(null);
    try { await saveEscalationConfigApi(config); setSaveMsg("Escalation rules saved."); }
    catch (e) { setError(e instanceof Error ? e.message : "Save failed"); }
    finally { setSaving(false); }
  };

  const runJob = async (job: string) => {
    setRunningJob(job);
    try { await runJobApi(job as "escalation" | "nightly" | "reminders" | "digest"); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : "Job run failed"); }
    finally { setRunningJob(null); }
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault(); setSavingProfile(true); setProfileMsg(null); setProfileErr(null);
    try {
      const updated = await updateProfileApi({ name: profileName });
      setProfileMsg("Profile updated.");
      if (accessToken) loginUser(accessToken, updated);
    } catch (err) { setProfileErr(err instanceof Error ? err.message : "Profile save failed"); }
    finally { setSavingProfile(false); }
  };

  const changePw = async (e: React.FormEvent) => {
    e.preventDefault(); setSavingPw(true); setPwMsg(null); setPwError(null);
    if (newPw.length < 8) { setPwError("New password must be at least 8 characters."); setSavingPw(false); return; }
    try { await changePasswordApi(currPw, newPw); setPwMsg("Password changed."); setCurrPw(""); setNewPw(""); }
    catch (err) { setPwError(err instanceof Error ? err.message : "Password change failed"); }
    finally { setSavingPw(false); }
  };

  const jobsData = (jobs as Record<string, unknown>) ?? {};
  const jobsMap = (jobsData.jobs as Record<string, unknown>) ?? {};

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-2xl font-bold tracking-tight flex items-center gap-2"><Settings className="size-6 text-primary" /> Settings</h2>
        <p className="text-sm text-muted-foreground">Escalation rules, job scheduler, and your profile. All changes persist via the API.</p>
      </div>

      {error && <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive flex justify-between"><span>{error}</span><Button variant="outline" size="sm" onClick={load}>Retry</Button></div>}

      {/* Profile */}
      <section className="dashboard-card p-5 space-y-4">
        <h3 className="font-semibold flex items-center gap-2"><User className="size-4" /> Your Profile</h3>
        <form onSubmit={e => void saveProfile(e)} className="space-y-3">
          <label className="block text-sm font-medium">Display name
            <input type="text" value={profileName} onChange={e => setProfileName(e.target.value)} className="mt-1 block w-full rounded-md border bg-background p-2 text-sm" />
          </label>
          {profileMsg && <p className="text-sm text-emerald-700">{profileMsg}</p>}
          {profileErr && <p className="text-sm text-destructive">{profileErr}</p>}
          <div className="flex justify-end"><Button size="sm" disabled={savingProfile}>{savingProfile ? "Saving…" : "Save profile"}</Button></div>
        </form>
      </section>

      {/* Password */}
      <section className="dashboard-card p-5 space-y-4">
        <h3 className="font-semibold flex items-center gap-2"><Lock className="size-4" /> Change Password</h3>
        <form onSubmit={e => void changePw(e)} className="space-y-3">
          <label className="block text-sm font-medium">Current password
            <input type="password" value={currPw} onChange={e => setCurrPw(e.target.value)} required className="mt-1 block w-full rounded-md border bg-background p-2 text-sm" />
          </label>
          <label className="block text-sm font-medium">New password (min 8 chars)
            <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} required minLength={8} className="mt-1 block w-full rounded-md border bg-background p-2 text-sm" />
          </label>
          {pwMsg && <p className="text-sm text-emerald-700">{pwMsg}</p>}
          {pwError && <p className="text-sm text-destructive">{pwError}</p>}
          <div className="flex justify-end"><Button size="sm" disabled={savingPw}>{savingPw ? "Saving…" : "Change password"}</Button></div>
        </form>
      </section>

      {/* Jobs */}
      {jobs && (
        <section className="dashboard-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Job Scheduler</h3>
            <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-1"><RefreshCw className="size-4" />Refresh</Button>
          </div>
          <p className="text-xs text-muted-foreground">Scheduler running: {jobsData.scheduler_running ? "✓ Yes" : "✗ No"} · Demo speed: {fmt(jobsData.demo_time_speed)}×</p>
          <div className="space-y-3">
            {Object.entries(JOB_LABELS).map(([key, label]) => {
              const job = (jobsMap[key] as Record<string, unknown>) ?? {};
              return (
                <div key={key} className="rounded-lg border p-3 flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Schedule: {fmt(job.schedule)} · Runs: {fmt(job.runs)}</p>
                    <p className="text-xs text-muted-foreground">Last run: {job.last_run ? ist(job.last_run) : "Never"} · Duration: {fmt(job.duration_ms)}ms</p>
                    {job.error && <p className="text-xs text-red-600 mt-0.5">Error: {fmt(job.error)}</p>}
                  </div>
                  {(user?.role === "subsidiary_admin" || user?.role === "cil_admin") && (
                    <Button size="sm" variant="outline" disabled={runningJob === key} onClick={() => void runJob(key)} className="gap-1 shrink-0">
                      <Play className="size-3" />{runningJob === key ? "Running…" : "Run now"}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Escalation config */}
      {config.length > 0 && (
        <section className="dashboard-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Escalation Rules</h3>
            {isCilAdmin && (
              <div className="flex gap-2">
                {saveMsg && <span className="text-xs text-emerald-700 self-center">{saveMsg}</span>}
                <Button size="sm" disabled={saving} onClick={() => void saveConfig()} className="gap-1"><Save className="size-3" />{saving ? "Saving…" : "Save"}</Button>
              </div>
            )}
          </div>
          {!isCilAdmin && <p className="text-xs text-muted-foreground">Read-only. Only CIL Admin can modify escalation rules.</p>}
          <div className="space-y-3">
            {config.map((rule, i) => {
              const r = rule as Record<string, unknown>;
              return (
                <div key={fmt(r.severity)} className="rounded-lg border p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold uppercase">{fmt(r.severity)}</span>
                    <span className="text-xs text-muted-foreground">SLA: {fmt(r.sla_hours)}h</span>
                  </div>
                  {isCilAdmin ? (
                    <div className="grid grid-cols-2 gap-2">
                      <label className="text-xs font-medium">SLA hours
                        <input type="number" value={Number(r.sla_hours)} onChange={e => setConfig(prev => prev.map((c, ci) => ci === i ? { ...c, sla_hours: Number(e.target.value) } : c))} className="mt-1 block w-full rounded border bg-background p-1 text-xs" />
                      </label>
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">Reminders at: {Array.isArray(r.reminder_hours) ? r.reminder_hours.join("h, ") + "h" : "—"}</div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {loading && <p className="text-muted-foreground text-sm">Loading settings…</p>}
    </div>
  );
}
