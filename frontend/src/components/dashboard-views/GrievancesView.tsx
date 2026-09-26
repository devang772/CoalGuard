import { useCallback, useEffect, useState } from "react";
import { RefreshCw, MessageSquare, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getGrievancesApi, submitGrievanceApi, updateGrievanceApi, type Page, type Row } from "@/lib/api";
import { useAppStore } from "@/store/useAppStore";

const fmt = (v: unknown) => v === null || v === undefined || v === "" ? "—" : String(v);
const ist = (v: unknown) => { try { return new Date(String(v)).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }); } catch { return fmt(v); } };
const statusColor: Record<string, string> = { new: "text-blue-700 bg-blue-50 border-blue-200", in_progress: "text-amber-700 bg-amber-50 border-amber-200", resolved: "text-emerald-700 bg-emerald-50 border-emerald-200", closed: "text-slate-600 bg-slate-50 border-slate-200" };
const CATEGORIES = ["wages", "safety", "harassment", "facilities", "leave", "other"];

function SubmitDialog({ close, reload }: { close: () => void; reload: () => Promise<void> }) {
  const [category, setCategory] = useState("safety");
  const [text, setText] = useState("");
  const [anonymous, setAnonymous] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<Row | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) { setError("Please describe your grievance."); return; }
    setSubmitting(true); setError(null);
    try {
      const r = await submitGrievanceApi({ category, text, anonymous });
      setResult(r);
      await reload();
    } catch (err) { setError(err instanceof Error ? err.message : "Submission failed"); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <section role="dialog" aria-modal="true" className="dashboard-card w-full max-w-lg bg-card p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b pb-3 mb-4">
          <h3 className="font-display text-lg font-bold">Submit Grievance</h3>
          <Button variant="ghost" size="icon" onClick={close}><X className="size-4" /></Button>
        </div>
        {result ? (
          <div className="text-center py-4 space-y-3">
            <p className="text-emerald-700 font-semibold">Grievance submitted!</p>
            <div className="rounded-xl border-2 border-emerald-400 p-4 bg-emerald-50">
              <p className="text-xs text-muted-foreground mb-1">Your tracking token — save it to check status</p>
              <p className="font-mono text-2xl font-bold text-emerald-700">{fmt(result.token)}</p>
            </div>
            <p className="text-xs text-muted-foreground">{fmt(result.message)}</p>
            <Button onClick={close}>Done</Button>
          </div>
        ) : (
          <form onSubmit={e => void submit(e)} className="space-y-4">
            <label className="block text-sm font-medium">Category
              <select value={category} onChange={e => setCategory(e.target.value)} className="mt-1 block w-full rounded-md border bg-background p-2 text-sm capitalize">
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label className="block text-sm font-medium">Description
              <textarea required value={text} onChange={e => setText(e.target.value)} rows={4} className="mt-1 block w-full rounded-md border bg-background p-2 text-sm" placeholder="Describe the issue…" />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={anonymous} onChange={e => setAnonymous(e.target.checked)} className="rounded" />
              Submit anonymously (name will not be stored)
            </label>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={close}>Cancel</Button>
              <Button disabled={submitting}>{submitting ? "Submitting…" : "Submit grievance"}</Button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}

function RespondDialog({ grievance, close, reload }: { grievance: Row; close: () => void; reload: () => Promise<void> }) {
  const [status, setStatus] = useState(fmt(grievance.status));
  const [response, setResponse] = useState(fmt(grievance.response));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true); setError(null);
    try {
      await updateGrievanceApi(Number(grievance.id), { status, response });
      await reload(); close();
    } catch (err) { setError(err instanceof Error ? err.message : "Update failed"); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <section role="dialog" aria-modal="true" className="dashboard-card w-full max-w-lg bg-card p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b pb-3 mb-4">
          <h3 className="font-display text-lg font-bold">Respond to Grievance #{fmt(grievance.id)}</h3>
          <Button variant="ghost" size="icon" onClick={close}><X className="size-4" /></Button>
        </div>
        <form onSubmit={e => void submit(e)} className="space-y-4">
          <div className="rounded-lg border p-3 text-sm bg-muted/30"><p className="font-semibold mb-1">{fmt(grievance.category)}</p><p className="text-muted-foreground">{fmt(grievance.text)}</p></div>
          <label className="block text-sm font-medium">Status
            <select value={status} onChange={e => setStatus(e.target.value)} className="mt-1 block w-full rounded-md border bg-background p-2 text-sm">
              <option value="new">New</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </label>
          <label className="block text-sm font-medium">Response
            <textarea value={response === "—" ? "" : response} onChange={e => setResponse(e.target.value)} rows={3} className="mt-1 block w-full rounded-md border bg-background p-2 text-sm" placeholder="Your response…" />
          </label>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={close}>Cancel</Button>
            <Button disabled={submitting}>{submitting ? "Saving…" : "Save response"}</Button>
          </div>
        </form>
      </section>
    </div>
  );
}

export function GrievancesView() {
  const { user } = useAppStore();
  const [page, setPage] = useState<Page<Row> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [responding, setResponding] = useState<Row | null>(null);
  const [statusFilter, setStatusFilter] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { setPage(await getGrievancesApi(statusFilter ? { status: statusFilter } : {})); }
    catch (e) { setError(e instanceof Error ? e.message : "Failed to load grievances"); }
    finally { setLoading(false); }
  }, [statusFilter]);

  useEffect(() => { void load(); }, [load]);

  const canRespond = user && ["mine_manager", "area_gm", "subsidiary_admin", "cil_admin"].includes(user.role);
  const items = page?.items ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight flex items-center gap-2"><MessageSquare className="size-6 text-primary" /> Grievances</h2>
          <p className="text-sm text-muted-foreground">Anonymous worker grievances tracked through backend-issued tokens.</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => setSubmitting(true)} className="gap-1"><Plus className="size-4" /> Submit grievance</Button>
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-1"><RefreshCw className="size-4" /> Refresh</Button>
        </div>
      </div>

      <div className="flex gap-3 items-center flex-wrap">
        <span className="text-sm text-muted-foreground">Filter:</span>
        {["", "new", "in_progress", "resolved", "closed"].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)} className={`rounded-full text-xs px-3 py-1 border transition-colors ${statusFilter === s ? "bg-primary text-primary-foreground border-primary" : "border-muted bg-muted/30 hover:bg-muted"}`}>{s || "All"}</button>
        ))}
      </div>

      {error && <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive flex justify-between"><span>{error}</span><Button variant="outline" size="sm" onClick={load}>Retry</Button></div>}

      <div className="space-y-3">
        {loading && <p className="text-muted-foreground text-sm">Loading grievances…</p>}
        {!loading && items.length === 0 && <p className="rounded-xl border p-8 text-center text-muted-foreground">No grievances in this scope.</p>}
        {items.map(g => (
          <article key={fmt(g.id)} className="dashboard-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className={`text-[10px] font-bold border px-1.5 py-0.5 rounded uppercase ${statusColor[fmt(g.status)] ?? ""}`}>{fmt(g.status)}</span>
                  <span className="text-xs font-semibold capitalize">{fmt(g.category)}</span>
                  {g.anonymous && <span className="text-[10px] bg-slate-100 border border-slate-200 text-slate-600 px-1.5 py-0.5 rounded">Anonymous</span>}
                  <span className="text-[10px] text-muted-foreground font-mono">{fmt(g.token)}</span>
                </div>
                <p className="text-sm leading-relaxed">{fmt(g.text)}</p>
                {g.response && <div className="mt-2 rounded-lg bg-muted/30 border p-2 text-xs"><span className="text-muted-foreground">Response:</span> {fmt(g.response)}</div>}
                <p className="text-xs text-muted-foreground mt-1">{ist(g.created_at)} · {fmt(g.mine_name)}</p>
              </div>
              {canRespond && (
                <Button size="sm" variant="outline" onClick={() => setResponding(g)}>Respond</Button>
              )}
            </div>
          </article>
        ))}
      </div>

      {page && <div className="text-sm text-muted-foreground">Total: <strong>{page.total}</strong></div>}
      {submitting && <SubmitDialog close={() => setSubmitting(false)} reload={load} />}
      {responding && <RespondDialog grievance={responding} close={() => setResponding(null)} reload={load} />}
    </div>
  );
}
