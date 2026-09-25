import React, { useState } from "react";
import {
  Building2,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  XCircle,
  FileText,
  Loader2,
  AlertTriangle,
  Info,
  Sliders,
  Check,
  X,
  HelpCircle,
  Calendar,
  Layers,
  MapPin,
  Save,
  RotateCcw,
  Flame,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface MineProfile {
  working_method: "UG" | "OC" | "MIXED";
  depth_m: number;
  seam_gas_degree: "1" | "2" | "3";
  worker_count: number;
  contract_worker_count: number;
  production_capacity_mtpa: number;
  uses_explosives: boolean;
  has_conveyor: boolean;
  has_hemm: boolean;
  has_washery: boolean;
  near_water_body: boolean;
  forest_land: boolean;
  ec_number: string;
  cto_valid_till: string;
  state: string;
}

const initialMineProfile: MineProfile = {
  working_method: "UG",
  depth_m: 380,
  seam_gas_degree: "2",
  worker_count: 1450,
  contract_worker_count: 320,
  production_capacity_mtpa: 0.6,
  uses_explosives: true,
  has_conveyor: true,
  has_hemm: true,
  has_washery: false,
  near_water_body: true,
  forest_land: false,
  ec_number: "EC-JHA-2021-8849-DGMS",
  cto_valid_till: "2027-12-31",
  state: "Jharkhand",
};

interface Obligation {
  id: string;
  code: string;
  title: string;
  lawRef: string;
  category: "Safety" | "Environment" | "Labour" | "Production";
  frequency: "Daily" | "Weekly" | "Monthly" | "Quarterly";
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  whyItApplies: string;
  source: "ml_engine" | "rules_fallback";
  confidence: number;
  status: "active" | "not_applicable";
  remark?: string;
}

const initialObligations: Obligation[] = [
  {
    id: "OBL-101",
    code: "SAF-GAS-D",
    title: "Daily Methane & Gas Sensor Calibration Check",
    lawRef: "CMR 2017 Reg. 168 (1)",
    category: "Safety",
    frequency: "Daily",
    severity: "CRITICAL",
    whyItApplies: "Applies because the working method is Underground (UG) and seam gas degree is 2.",
    source: "ml_engine",
    confidence: 99.2,
    status: "active",
  },
  {
    id: "OBL-102",
    code: "ENV-DUST-Q",
    title: "Quarterly Ambient Air Quality PM10 Monitoring Report",
    lawRef: "MoEFCC EC Condition #4",
    category: "Environment",
    frequency: "Quarterly",
    severity: "HIGH",
    whyItApplies: "Applies because production capacity is 0.6 MTPA (>0.5 MTPA) and mine is in Jharkhand state.",
    source: "ml_engine",
    confidence: 97.8,
    status: "active",
  },
  {
    id: "OBL-103",
    code: "LAB-WAGE-M",
    title: "Monthly Contractor Worker Wage & Biometric Audit",
    lawRef: "CLRA 1970 Sec. 21 / Mines Rule 1955",
    category: "Labour",
    frequency: "Monthly",
    severity: "HIGH",
    whyItApplies: "Applies because mine employs 320 contract workers (>100 threshold under CLRA guidelines).",
    source: "ml_engine",
    confidence: 98.5,
    status: "active",
  },
  {
    id: "OBL-104",
    code: "ENV-HAUL-D",
    title: "Haul Road Dust Suppression & Water Sprinkling Log",
    lawRef: "CMR 2017 Reg. 109 / DGMS Tech Cir 2",
    category: "Environment",
    frequency: "Daily",
    severity: "MEDIUM",
    whyItApplies: "Applies because mine operates Heavy Earth Moving Machinery (HEMM) on unpaved haul roads.",
    source: "rules_fallback",
    confidence: 94.1,
    status: "active",
  },
  {
    id: "OBL-105",
    code: "SAF-ROOF-W",
    title: "Roof Bolting & Support Strata Stability Audit",
    lawRef: "DGMS Circular No. 3 of 2020",
    category: "Safety",
    frequency: "Weekly",
    severity: "CRITICAL",
    whyItApplies: "Applies because underground mining depth is 380m (>300m high-stress strata threshold).",
    source: "ml_engine",
    confidence: 99.6,
    status: "active",
  },
  {
    id: "OBL-106",
    code: "SAF-EXPL-M",
    title: "Explosives Magazine Storage & Conveyance Audit",
    lawRef: "Explosives Rules 2008 / CMR Reg 153",
    category: "Safety",
    frequency: "Monthly",
    severity: "CRITICAL",
    whyItApplies: "Applies because mine uses explosives for blasting operations.",
    source: "ml_engine",
    confidence: 98.9,
    status: "active",
  },
];

export const RuleStudioView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"profile" | "obligations">("profile");
  const [profile, setProfile] = useState<MineProfile>(initialMineProfile);
  const [obligations, setObligations] = useState<Obligation[]>(initialObligations);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal State for Mark Not Applicable
  const [targetId, setTargetId] = useState<string | null>(null);
  const [remarkInput, setRemarkInput] = useState("");

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      toast.success("Mine Profile Saved!", {
        description: "ML Engine analyzed mine parameters and synthesized 6 active compliance obligations automatically.",
      });
      setActiveTab("obligations");
    }, 1200);
  };

  const openNotApplicableModal = (id: string) => {
    setTargetId(id);
    setRemarkInput("");
  };

  const confirmMarkNotApplicable = () => {
    if (!targetId) return;
    if (!remarkInput.trim()) {
      toast.error("Remark Required", { description: "Please enter a valid reason why this rule does not apply." });
      return;
    }
    setObligations((prev) =>
      prev.map((item) =>
        item.id === targetId ? { ...item, status: "not_applicable", remark: remarkInput } : item
      )
    );
    toast.info("Obligation Marked Not Applicable", {
      description: `Obligation updated with remark: "${remarkInput}"`,
    });
    setTargetId(null);
  };

  const handleReactivate = (id: string) => {
    setObligations((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: "active", remark: undefined } : item))
    );
    toast.success("Obligation Re-activated", {
      description: "Obligation set to Active. ML task calendar updated.",
    });
  };

  const filteredObligations = obligations.filter(
    (ob) =>
      ob.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ob.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ob.lawRef.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ob.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center border-b pb-4">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            Mine Profile & Applicable Obligations
            <Sparkles size={20} className="text-amber-500" />
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure mine compliance characteristics. ML Engine automatically evaluates statutory acts (CMR 2017, Mines Act 1952, EC) and maps applicable rules.
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-2 bg-muted/60 p-1 rounded-lg border">
          <button
            onClick={() => setActiveTab("profile")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === "profile"
                ? "bg-card text-foreground shadow-xs border"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Sliders size={14} className="text-amber-600 dark:text-amber-400" />
            Mine Profile Form
          </button>
          <button
            onClick={() => setActiveTab("obligations")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === "obligations"
                ? "bg-card text-foreground shadow-xs border"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <ShieldCheck size={14} className="text-emerald-600 dark:text-emerald-400" />
            Applicable Obligations ({obligations.length})
          </button>
        </div>
      </div>

      {/* Tab A: Mine Profile Form */}
      {activeTab === "profile" && (
        <form onSubmit={handleSaveProfile} className="space-y-6">
          <div className="bg-card border rounded-xl p-5 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-display font-semibold text-foreground text-sm flex items-center gap-2">
                  <Building2 size={16} className="text-amber-600 dark:text-amber-400" />
                  Moonidih Underground Mine — Statutory Compliance Profile
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Update operational parameters. Changes automatically trigger ML obligation synthesis and task scheduling.
                </p>
              </div>
              <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/40 font-medium">
                ML Task Calendar: Active
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Working Method */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Working Method</label>
                <select
                  value={profile.working_method}
                  onChange={(e) => setProfile({ ...profile, working_method: e.target.value as any })}
                  className="w-full h-9 rounded-md border bg-background px-3 text-xs text-foreground font-medium focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  <option value="UG">UG (Underground Coal Mine)</option>
                  <option value="OC">OC (Open-cast Coal Mine)</option>
                  <option value="MIXED">MIXED (Underground & Opencast)</option>
                </select>
              </div>

              {/* Depth (m) */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Mine Shaft Depth (Meters)</label>
                <input
                  type="number"
                  value={profile.depth_m}
                  onChange={(e) => setProfile({ ...profile, depth_m: Number(e.target.value) })}
                  className="w-full h-9 rounded-md border bg-background px-3 text-xs text-foreground font-mono font-medium focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              {/* Seam Gas Degree */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Seam Gas Degree (UG Only)</label>
                <select
                  value={profile.seam_gas_degree}
                  onChange={(e) => setProfile({ ...profile, seam_gas_degree: e.target.value as any })}
                  className="w-full h-9 rounded-md border bg-background px-3 text-xs text-foreground font-medium focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  <option value="1">Degree I (Gassy Seam)</option>
                  <option value="2">Degree II (High Methane Risk)</option>
                  <option value="3">Degree III (Heavy Inflammable Methane)</option>
                </select>
              </div>

              {/* Worker Count */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Departmental Worker Count</label>
                <input
                  type="number"
                  value={profile.worker_count}
                  onChange={(e) => setProfile({ ...profile, worker_count: Number(e.target.value) })}
                  className="w-full h-9 rounded-md border bg-background px-3 text-xs text-foreground font-mono font-medium focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              {/* Contract Worker Count */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Contract Worker Count</label>
                <input
                  type="number"
                  value={profile.contract_worker_count}
                  onChange={(e) => setProfile({ ...profile, contract_worker_count: Number(e.target.value) })}
                  className="w-full h-9 rounded-md border bg-background px-3 text-xs text-foreground font-mono font-medium focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              {/* Production Capacity (MTPA) */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Production Capacity (MTPA)</label>
                <input
                  type="number"
                  step="0.1"
                  value={profile.production_capacity_mtpa}
                  onChange={(e) => setProfile({ ...profile, production_capacity_mtpa: Number(e.target.value) })}
                  className="w-full h-9 rounded-md border bg-background px-3 text-xs text-foreground font-mono font-medium focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              {/* State */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">State Jurisdiction</label>
                <input
                  type="text"
                  value={profile.state}
                  onChange={(e) => setProfile({ ...profile, state: e.target.value })}
                  className="w-full h-9 rounded-md border bg-background px-3 text-xs text-foreground font-medium focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              {/* EC Number */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">EC Clearance Number</label>
                <input
                  type="text"
                  value={profile.ec_number}
                  onChange={(e) => setProfile({ ...profile, ec_number: e.target.value })}
                  className="w-full h-9 rounded-md border bg-background px-3 text-xs text-foreground font-mono font-medium focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              {/* CTO Expiry */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">CTO Consent Valid Till</label>
                <input
                  type="date"
                  value={profile.cto_valid_till}
                  onChange={(e) => setProfile({ ...profile, cto_valid_till: e.target.value })}
                  className="w-full h-9 rounded-md border bg-background px-3 text-xs text-foreground font-mono font-medium focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>

            {/* Operational Toggles */}
            <div className="border-t pt-4 space-y-3">
              <h4 className="font-display font-semibold text-xs text-foreground uppercase tracking-wider text-muted-foreground">
                Operational & Environmental Hazards Toggles
              </h4>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                  { label: "Uses Explosives", key: "uses_explosives" },
                  { label: "Has Conveyor", key: "has_conveyor" },
                  { label: "Has HEMM Machinery", key: "has_hemm" },
                  { label: "Has Washery Plant", key: "has_washery" },
                  { label: "Near Water Body (<500m)", key: "near_water_body" },
                  { label: "Forest Land Zone", key: "forest_land" },
                ].map((item) => (
                  <label
                    key={item.key}
                    className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-colors ${
                      (profile as any)[item.key]
                        ? "bg-amber-500/10 border-amber-500/50 text-foreground"
                        : "bg-muted/30 border-border text-muted-foreground"
                    }`}
                  >
                    <span className="text-xs font-medium leading-tight">{item.label}</span>
                    <input
                      type="checkbox"
                      checked={(profile as any)[item.key]}
                      onChange={(e) => setProfile({ ...profile, [item.key]: e.target.checked })}
                      className="accent-amber-500 size-4 cursor-pointer"
                    />
                  </label>
                ))}
              </div>
            </div>

            {/* Save Action */}
            <div className="border-t pt-4 flex items-center justify-end gap-3">
              <Button
                type="submit"
                disabled={isSaving}
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs px-5 h-9 gap-2 shadow-sm cursor-pointer"
              >
                {isSaving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                {isSaving ? "Evaluating ML Obligations..." : "Save Mine Profile & Generate Tasks"}
              </Button>
            </div>
          </div>
        </form>
      )}

      {/* Tab B: Applicable Obligations Table */}
      {activeTab === "obligations" && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between bg-card border p-3.5 rounded-xl shadow-sm">
            <div className="flex items-center gap-2.5 flex-1 max-w-md bg-muted/40 border rounded-lg px-3 py-1.5 text-xs">
              <Search size={14} className="text-muted-foreground shrink-0" />
              <input
                type="text"
                placeholder="Search obligation by code, law ref, title or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent text-foreground outline-none w-full placeholder:text-muted-foreground"
              />
            </div>

            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>
                Active Obligations: <strong className="text-emerald-600 font-mono font-bold">{obligations.filter((o) => o.status === "active").length}</strong>
              </span>
              <span>·</span>
              <span>
                Not Applicable: <strong className="text-rose-600 font-mono font-bold">{obligations.filter((o) => o.status === "not_applicable").length}</strong>
              </span>
            </div>
          </div>

          <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs text-foreground">
              <thead className="bg-muted/50 text-muted-foreground font-mono text-[11px] uppercase border-b">
                <tr>
                  <th className="p-3">Code / Law Ref</th>
                  <th className="p-3">Obligation Title</th>
                  <th className="p-3">Category & Freq</th>
                  <th className="p-3">Why It Applies (ML Rationale)</th>
                  <th className="p-3">Source & Confidence</th>
                  <th className="p-3">Status & Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredObligations.map((ob) => (
                  <tr
                    key={ob.id}
                    className={`hover:bg-muted/30 transition-colors ${
                      ob.status === "not_applicable" ? "opacity-60 bg-muted/10" : ""
                    }`}
                  >
                    {/* Code & Law Ref */}
                    <td className="p-3 align-top whitespace-nowrap">
                      <div className="font-mono font-bold text-amber-600 dark:text-amber-400">{ob.code}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">{ob.lawRef}</div>
                    </td>

                    {/* Title */}
                    <td className="p-3 align-top max-w-xs">
                      <div className="font-semibold text-foreground text-xs leading-snug">{ob.title}</div>
                      <div className="mt-1 flex items-center gap-2">
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                            ob.severity === "CRITICAL"
                              ? "bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-400"
                              : ob.severity === "HIGH"
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-400"
                              : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                          }`}
                        >
                          {ob.severity}
                        </span>
                      </div>
                    </td>

                    {/* Category & Frequency */}
                    <td className="p-3 align-top whitespace-nowrap">
                      <span className="inline-block px-2 py-0.5 rounded bg-muted text-foreground font-medium text-[11px]">
                        {ob.category}
                      </span>
                      <div className="text-[11px] text-muted-foreground mt-1 font-mono">{ob.frequency}</div>
                    </td>

                    {/* Why It Applies */}
                    <td className="p-3 align-top max-w-md">
                      <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-2 text-[11px] text-amber-900 dark:text-amber-200 leading-snug">
                        <span className="font-semibold text-amber-600 dark:text-amber-400">Why it applies: </span>
                        {ob.whyItApplies}
                      </div>

                      {ob.status === "not_applicable" && ob.remark && (
                        <div className="mt-2 text-[11px] text-rose-600 dark:text-rose-400 italic bg-rose-50 dark:bg-rose-950/50 p-1.5 rounded border border-rose-300 dark:border-rose-800">
                          <strong>Not Applicable Remark:</strong> "{ob.remark}"
                        </div>
                      )}
                    </td>

                    {/* Source & Confidence */}
                    <td className="p-3 align-top whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        {ob.source === "ml_engine" ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-600 text-[10px] font-mono font-bold flex items-center gap-1">
                            <Sparkles size={11} /> ml_engine
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border text-[10px] font-mono font-medium">
                            rules_fallback
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-1 font-mono font-medium">
                        {ob.confidence}% Confidence
                      </div>
                    </td>

                    {/* Status & Actions */}
                    <td className="p-3 align-top whitespace-nowrap">
                      {ob.status === "active" ? (
                        <div className="space-y-1.5">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 size={13} /> Active
                          </span>
                          <div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openNotApplicableModal(ob.id)}
                              className="text-[11px] h-7 px-2.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 border-rose-200 dark:border-rose-900 cursor-pointer"
                            >
                              Mark Not Applicable
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-muted-foreground">
                            <XCircle size={13} /> Inactive
                          </span>
                          <div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleReactivate(ob.id)}
                              className="text-[11px] h-7 px-2.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 border-emerald-200 dark:border-emerald-900 cursor-pointer"
                            >
                              Re-activate
                            </Button>
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Mark Not Applicable Remark Prompt */}
      {targetId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card border rounded-xl p-5 max-w-md w-full space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-display font-semibold text-sm text-foreground flex items-center gap-2">
                <AlertTriangle size={16} className="text-amber-500" />
                Mark Obligation as Not Applicable
              </h3>
              <button
                onClick={() => setTargetId(null)}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-muted-foreground">
              Please state the official engineering or statutory reason why this rule does not apply to this mine site.
            </p>

            <textarea
              rows={3}
              value={remarkInput}
              onChange={(e) => setRemarkInput(e.target.value)}
              placeholder="E.g., Washery plant operations are handled off-site at Moonidih Central Washery under separate CTO clearance..."
              className="w-full rounded-lg border bg-background p-2.5 text-xs text-foreground outline-none focus:ring-1 focus:ring-amber-500 placeholder:text-muted-foreground"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTargetId(null)}
                className="text-xs h-8 cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={confirmMarkNotApplicable}
                className="bg-rose-600 hover:bg-rose-700 text-white text-xs h-8 px-4 font-semibold cursor-pointer"
              >
                Confirm Inactive
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
