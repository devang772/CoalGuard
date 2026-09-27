import React, { useCallback, useEffect, useState } from "react";
import { RefreshCw, AlertOctagon, Plus, X, Siren, Camera, MapPin, User, Clock, ShieldCheck, FileText, Volume2, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getObservationsApi,
  acknowledgeObservationApi,
  convertObservationApi,
  getActiveSosApi,
  getMinesApi,
  uploadEvidenceApi,
  createObservationApi,
  getApiBase,
  type Page,
  type Row,
} from "@/lib/api";
import { useAppStore } from "@/store/useAppStore";

const fmt = (v: unknown) => (v === null || v === undefined || v === "" ? "—" : String(v));
const ist = (v: unknown) => {
  try {
    return new Date(String(v)).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  } catch {
    return fmt(v);
  }
};

const typeBadge: Record<string, { label: string; class: string }> = {
  incident: { label: "Incident", class: "bg-red-500/10 text-red-700 border-red-500/30 font-bold" },
  near_miss: { label: "Near Miss", class: "bg-amber-500/10 text-amber-700 border-amber-500/30 font-bold" },
  unsafe_condition: { label: "Unsafe Condition", class: "bg-orange-500/10 text-orange-700 border-orange-500/30 font-bold" },
  unsafe_act: { label: "Unsafe Act", class: "bg-yellow-500/10 text-yellow-800 border-yellow-500/30 font-bold" },
  sos: { label: "SOS Emergency", class: "bg-red-600 text-white font-black animate-pulse" },
};

const severityBadge: Record<string, { label: string; class: string }> = {
  critical: { label: "CRITICAL 🔴", class: "bg-red-600 text-white" },
  high: { label: "HIGH 🟠", class: "bg-orange-500 text-white" },
  medium: { label: "MEDIUM 🟡", class: "bg-amber-500 text-white" },
  low: { label: "LOW 🟢", class: "bg-emerald-600 text-white" },
};

function ReportDialog({ mines, close, reload }: { mines: Row[]; close: () => void; reload: () => Promise<void> }) {
  const [type, setType] = useState("unsafe_condition");
  const [category, setCategory] = useState("electrical");
  const [text, setText] = useState("");
  const [severity, setSeverity] = useState("high");
  const [locationText, setLocationText] = useState("");
  const [mineId, setMineId] = useState(mines[0] ? fmt(mines[0].id) : "");
  const [anonymous, setAnonymous] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !mineId) {
      setError("Please fill in hazard description and select mine site.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      let evidenceId: number | undefined = undefined;
      if (photoFile && mineId) {
        const ev = await uploadEvidenceApi(photoFile, Number(mineId), {
          device_time: new Date().toISOString(),
          is_mocked: false,
        });
        evidenceId = Number(ev.id);
      }

      await createObservationApi({
        mine_id: Number(mineId),
        type,
        category,
        text: text.trim(),
        severity,
        location_text: locationText.trim() || undefined,
        source: "app",
        anonymous,
        evidence_id: evidenceId,
      });

      await reload();
      close();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit hazard report");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <section role="dialog" aria-modal="true" className="dashboard-card w-full max-w-lg bg-card p-6 shadow-2xl max-h-[90vh] overflow-y-auto rounded-2xl border-2 border-primary/20">
        <div className="flex items-center justify-between border-b pb-3 mb-4">
          <h3 className="font-display text-lg font-bold flex items-center gap-2">
            <AlertOctagon className="size-5 text-primary" /> Report Hazard / Incident (Manual)
          </h3>
          <Button variant="ghost" size="icon" onClick={close}>
            <X className="size-4" />
          </Button>
        </div>

        <form onSubmit={(e) => void submit(e)} className="space-y-4 text-sm">
          <div>
            <label className="block font-bold text-muted-foreground mb-1">1. Mine Site Location *</label>
            <select required value={mineId} onChange={(e) => setMineId(e.target.value)} className="w-full rounded-lg border bg-background p-2.5">
              {mines.map((m) => (
                <option key={fmt(m.id)} value={fmt(m.id)}>
                  {fmt(m.name)}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-muted-foreground mb-1">2. Report Type *</label>
              <select value={type} onChange={(e) => setType(e.target.value)} className="w-full rounded-lg border bg-background p-2.5">
                <option value="unsafe_act">Unsafe Act</option>
                <option value="unsafe_condition">Unsafe Condition</option>
                <option value="near_miss">Near Miss</option>
                <option value="incident">Incident</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-muted-foreground mb-1">3. Severity Level *</label>
              <select value={severity} onChange={(e) => setSeverity(e.target.value)} className="w-full rounded-lg border bg-background p-2.5 font-bold">
                <option value="low">Low 🟢</option>
                <option value="medium">Medium 🟡</option>
                <option value="high">High 🟠</option>
                <option value="critical">Critical 🔴</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-muted-foreground mb-1">4. Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-lg border bg-background p-2.5">
                {["roof", "haul_road", "conveyor", "electrical", "fire", "water", "dust", "ppe", "machinery", "explosives", "other"].map((c) => (
                  <option key={c} value={c}>
                    {c.replace(/_/g, " ").toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-bold text-muted-foreground mb-1">5. Exact Spot / Location</label>
              <input
                type="text"
                placeholder="e.g. Haul road km 4"
                value={locationText}
                onChange={(e) => setLocationText(e.target.value)}
                className="w-full rounded-lg border bg-background p-2.5"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-muted-foreground mb-1">6. Hazard Description *</label>
            <textarea
              required
              rows={3}
              placeholder="Describe the hazard clearly..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full rounded-lg border bg-background p-2.5"
            />
          </div>

          <div>
            <label className="block font-bold text-muted-foreground mb-1">7. Photo Evidence (Satya Proof)</label>
            <input type="file" accept="image/*" onChange={handlePhotoSelect} className="w-full rounded-lg border bg-background p-2 text-xs" />
            {photoPreview && (
              <div className="mt-2 relative rounded-lg overflow-hidden border h-32 bg-black/50">
                <img src={photoPreview} alt="Preview" className="w-full h-full object-contain" />
              </div>
            )}
          </div>

          <label className="flex items-center gap-2 pt-1 font-medium">
            <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} className="size-4 rounded" />
            Submit anonymously (Hide reporter name)
          </label>

          {error && <p role="alert" className="text-sm font-semibold text-destructive">{error}</p>}

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button type="button" variant="outline" onClick={close}>
              Cancel
            </Button>
            <Button disabled={submitting}>
              {submitting ? "Submitting Report…" : "Submit Report →"}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}

export function IncidentsView() {
  const { user } = useAppStore();
  const [page, setPage] = useState<Page<Row> | null>(null);
  const [activeSos, setActiveSos] = useState<Row[]>([]);
  const [mines, setMines] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<number | null>(null);
  const [reporting, setReporting] = useState(false);
  const [typeFilter, setTypeFilter] = useState("");
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [obs, sos, mineList] = await Promise.all([
        getObservationsApi({ type: typeFilter || "incident,near_miss,unsafe_condition,unsafe_act,sos" }),
        getActiveSosApi(),
        getMinesApi(),
      ]);
      setPage(obs);
      setActiveSos(sos);
      setMines(mineList);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load observations");
    } finally {
      setLoading(false);
    }
  }, [typeFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const canAcknowledge = user && ["supervisor", "safety_officer", "mine_manager", "area_gm", "subsidiary_admin", "cil_admin"].includes(user.role);
  const canConvert = user && ["safety_officer", "mine_manager", "area_gm", "subsidiary_admin", "cil_admin"].includes(user.role);

  const acknowledge = async (id: number) => {
    setActing(id);
    try {
      await acknowledgeObservationApi(id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Acknowledge failed");
    } finally {
      setActing(null);
    }
  };

  const convert = async (id: number) => {
    setActing(id);
    try {
      await convertObservationApi(id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Convert failed");
    } finally {
      setActing(null);
    }
  };

  const items = page?.items ?? [];

  const getImageUrl = (ev: unknown) => {
    if (!ev || typeof ev !== "object") return null;
    const url = (ev as Record<string, unknown>).url;
    if (!url || typeof url !== "string") return null;
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    return `${getApiBase()}${url.startsWith("/") ? "" : "/"}${url}`;
  };

  return (
    <div className="space-y-6">
      {/* SOS Alert Header Banner */}
      {activeSos.length > 0 && (
        <div className="rounded-xl border-2 border-red-500 bg-red-50 dark:bg-red-950/40 p-4 flex items-center gap-3 animate-pulse">
          <Siren className="size-6 text-red-600 shrink-0" />
          <div>
            <p className="font-bold text-red-700 dark:text-red-400">🆘 {activeSos.length} Active SOS Distress Alert(s) — Immediate Response Required</p>
            <div className="space-y-1 mt-1">
              {activeSos.map((s) => (
                <p key={fmt(s.id)} className="text-xs text-red-700 dark:text-red-300">
                  {ist(s.created_at)} · <strong>{fmt(s.mine_name)}</strong> · {fmt(s.text)}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight flex items-center gap-2">
            <AlertOctagon className="size-6 text-primary" /> Field Hazard Reports & Incidents
          </h2>
          <p className="text-sm text-muted-foreground">All mobile voice reports, field hazards, near-misses, and safety incidents.</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => setReporting(true)} className="gap-1 font-bold">
            <Plus className="size-4" /> Report Hazard
          </Button>
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-1">
            <RefreshCw className="size-4" /> Refresh
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap items-center">
        <span className="text-xs font-bold text-muted-foreground mr-1">Filter Type:</span>
        {[
          { key: "", label: "All Reports" },
          { key: "incident", label: "Incidents 🚨" },
          { key: "unsafe_condition", label: "Unsafe Conditions ⚠️" },
          { key: "near_miss", label: "Near Misses 🟡" },
          { key: "unsafe_act", label: "Unsafe Acts 🛑" },
          { key: "sos", label: "SOS 🆘" },
        ].map((t) => (
          <button
            key={t.key || "all"}
            onClick={() => setTypeFilter(t.key)}
            className={`rounded-full text-xs px-3.5 py-1.5 border font-semibold transition-all ${
              typeFilter === t.key ? "bg-primary text-primary-foreground border-primary shadow-sm" : "border-muted bg-muted/40 hover:bg-muted text-muted-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive flex justify-between items-center">
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={load}>
            Retry
          </Button>
        </div>
      )}

      {/* Cards Feed */}
      <div className="space-y-4">
        {loading && <p className="text-muted-foreground text-sm">Loading field observations…</p>}
        {!loading && items.length === 0 && <p className="rounded-xl border p-12 text-center text-muted-foreground">No hazard reports found in this category.</p>}

        {items.map((obs) => {
          const typeObj = typeBadge[fmt(obs.type)] || { label: fmt(obs.type), class: "bg-muted text-muted-foreground" };
          const sevObj = severityBadge[fmt(obs.severity)] || { label: fmt(obs.severity), class: "bg-muted text-muted-foreground" };
          const imgUrl = getImageUrl(obs.evidence);
          const evidenceObj = obs.evidence && typeof obs.evidence === "object" ? (obs.evidence as Record<string, unknown>) : null;

          return (
            <article key={fmt(obs.id)} className="dashboard-card p-5 border rounded-xl hover:border-primary/40 transition-all space-y-3">
              {/* Card Top Label Row */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
                <div className="flex flex-wrap items-center gap-2">
                  {/* Report Type */}
                  <span className="text-xs font-bold text-muted-foreground">Report Type:</span>
                  <span className={`text-xs px-2.5 py-1 rounded-md border uppercase ${typeObj.class}`}>{typeObj.label}</span>

                  {/* Severity */}
                  <span className="text-xs font-bold text-muted-foreground ml-2">Severity:</span>
                  <span className={`text-xs px-2.5 py-1 rounded-md font-bold uppercase ${sevObj.class}`}>{sevObj.label}</span>

                  {/* Category */}
                  <span className="text-xs font-bold text-muted-foreground ml-2">Category:</span>
                  <span className="text-xs font-bold bg-muted px-2.5 py-1 rounded-md border text-foreground uppercase">{fmt(obs.category).replace(/_/g, " ")}</span>
                </div>

                <div className="flex items-center gap-2">
                  {obs.source === "voice" && (
                    <span className="text-xs font-bold text-purple-700 bg-purple-100 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Volume2 className="size-3.5" /> 🎙️ Voice Report ({fmt(obs.language).toUpperCase()})
                    </span>
                  )}
                  {obs.acknowledged_at && <span className="text-xs font-bold text-emerald-700 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full">✓ Acknowledged</span>}
                  {obs.capa_id && <span className="text-xs font-bold bg-purple-600 text-white px-2 py-0.5 rounded-full">🛡️ CAPA #{fmt(obs.capa_id)}</span>}
                </div>
              </div>

              {/* Card Content Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                <div className="md:col-span-2 space-y-2">
                  {/* Description Box */}
                  <div>
                    <span className="text-xs font-bold text-primary flex items-center gap-1 mb-1">
                      <FileText className="size-3.5" /> Hazard Description / Observation:
                    </span>
                    <p className="text-base font-medium leading-relaxed bg-muted/30 p-3 rounded-lg border">{fmt(obs.text)}</p>
                  </div>

                  {/* Voice Transcript (if available) */}
                  {obs.transcript && (
                    <div>
                      <span className="text-xs font-bold text-purple-600 flex items-center gap-1 mb-1">🗣️ Voice AI Transcript:</span>
                      <p className="text-xs italic bg-purple-50 dark:bg-purple-950/20 text-purple-900 dark:text-purple-200 p-2.5 rounded-md border border-purple-200">
                        "{fmt(obs.transcript)}"
                      </p>
                    </div>
                  )}

                  {/* Meta Details Bar */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <MapPin className="size-3.5 text-primary shrink-0" />
                      <div>
                        <span className="font-bold block text-[10px] uppercase">Location:</span>
                        <span>{fmt(obs.location_text) !== "—" ? fmt(obs.location_text) : obs.lat ? `${Number(obs.lat).toFixed(4)}N, ${Number(obs.lng).toFixed(4)}E` : fmt(obs.mine_name)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <Clock className="size-3.5 text-primary shrink-0" />
                      <div>
                        <span className="font-bold block text-[10px] uppercase">Reported At:</span>
                        <span>{ist(obs.created_at)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <User className="size-3.5 text-primary shrink-0" />
                      <div>
                        <span className="font-bold block text-[10px] uppercase">Reported By:</span>
                        <span>{obs.anonymous ? "🔒 Anonymous" : fmt(obs.reporter_name) !== "—" ? fmt(obs.reporter_name) : "Field Worker"}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <ShieldCheck className="size-3.5 text-emerald-600 shrink-0" />
                      <div>
                        <span className="font-bold block text-[10px] uppercase">Mine Site:</span>
                        <span>{fmt(obs.mine_name)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: Photo Evidence Display & Actions */}
                <div className="space-y-3 flex flex-col items-start md:items-end justify-between h-full border-t md:border-t-0 md:border-l pt-3 md:pt-0 md:pl-4">
                  {/* Photo Evidence Box */}
                  {imgUrl ? (
                    <div className="w-full">
                      <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 mb-1">
                        <Camera className="size-3.5" /> 📷 Satya Proof Evidence Photo:
                      </span>
                      <div className="relative group rounded-lg overflow-hidden border-2 border-emerald-500/40 bg-black max-h-36 w-full cursor-pointer" onClick={() => setPreviewImage(imgUrl)}>
                        <img src={imgUrl} alt="Hazard photo" className="w-full h-36 object-cover group-hover:scale-105 transition-transform" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1">
                          <Maximize2 className="size-4" /> Expand Photo
                        </div>
                        {evidenceObj?.trust_score !== undefined && (
                          <div className="absolute bottom-1 left-1 bg-black/80 text-emerald-400 text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                            <ShieldCheck className="size-3" /> Trust: {fmt(evidenceObj.trust_score)}/100
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="w-full rounded-lg border border-dashed p-3 text-center text-xs text-muted-foreground bg-muted/20">
                      <Camera className="size-5 mx-auto mb-1 opacity-40" />
                      <span>No Photo Attached</span>
                      <span className="block text-[10px] opacity-70">(Audio / Form report)</span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 w-full justify-end pt-2">
                    {!obs.acknowledged_at && canAcknowledge && (
                      <Button size="sm" variant="outline" disabled={acting === Number(obs.id)} onClick={() => void acknowledge(Number(obs.id))} className="text-xs font-bold border-emerald-500 text-emerald-700 hover:bg-emerald-50">
                        {acting === Number(obs.id) ? "Acknowledging…" : "Acknowledge Report ✓"}
                      </Button>
                    )}
                    {!obs.capa_id && canConvert && (
                      <Button size="sm" variant="default" disabled={acting === Number(obs.id)} onClick={() => void convert(Number(obs.id))} className="text-xs font-bold bg-purple-600 hover:bg-purple-700">
                        Convert to CAPA 🛡️
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {page && <div className="text-sm font-semibold text-muted-foreground">Total Reports Loaded: {page.total}</div>}

      {/* Manual Report Dialog */}
      {reporting && <ReportDialog mines={mines} close={() => setReporting(false)} reload={load} />}

      {/* Full Image Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md" onClick={() => setPreviewImage(null)}>
          <div className="relative max-w-4xl max-h-[90vh] bg-black rounded-xl overflow-hidden p-2 border border-white/20">
            <button onClick={() => setPreviewImage(null)} className="absolute top-4 right-4 z-10 bg-black/70 text-white rounded-full p-2 hover:bg-white/20">
              <X className="size-6" />
            </button>
            <img src={previewImage} alt="Full evidence preview" className="max-w-full max-h-[85vh] object-contain mx-auto rounded-lg" />
          </div>
        </div>
      )}
    </div>
  );
}
