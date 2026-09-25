import { useState } from "react";
import {
  ClipboardCheck,
  Plus,
  Search,
  Filter,
  Calendar,
  AlertTriangle,
  User,
  CheckCircle,
  Clock,
  FileText,
  X,
  Upload,
  ChevronRight,
  ShieldCheck,
  MapPin,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BeforeAfterSlider } from "@/components/common/BeforeAfterSlider";
import { TrustScoreBadge } from "@/components/common/TrustScoreBadge";
import { toast } from "sonner";

interface CapaItem {
  id: string;
  findingTitle: string;
  mineName: string;
  owner: string;
  dueCountdown: string;
  overdue: boolean;
  status: "Open" | "In Review" | "Closed" | "Rejected";
  escalationLevel: "L1 Mine Mgr" | "L2 Area GM" | "L3 Subsidiary";
  beforePhoto: string;
  afterPhoto: string;
  closureChecks: {
    distanceMeters: number;
    distancePassed: boolean;
    reusedPhotoPassed: boolean;
    trustScore: number;
    trustScorePassed: boolean;
    aiHazardGonePassed: boolean;
  };
}

const mockCapas: CapaItem[] = [
  {
    id: "CAPA-881",
    findingTitle: "Highwall Slope Tension Crack Bench 4",
    mineName: "Kusunda Opencast Mine",
    owner: "Er. Somnath Mukherjee",
    dueCountdown: "Due in 4h",
    overdue: false,
    status: "In Review",
    escalationLevel: "L1 Mine Mgr",
    beforePhoto: "https://picsum.photos/seed/before1/600/400",
    afterPhoto: "https://picsum.photos/seed/after1/600/400",
    closureChecks: {
      distanceMeters: 12,
      distancePassed: true,
      reusedPhotoPassed: true,
      trustScore: 86,
      trustScorePassed: true,
      aiHazardGonePassed: true,
    },
  },
  {
    id: "CAPA-882",
    findingTitle: "Water Sprayer Line Fracture at Loading Bay",
    mineName: "Karkali Open Pit",
    owner: "Er. N. Prasad",
    dueCountdown: "Overdue 2 days",
    overdue: true,
    status: "In Review",
    escalationLevel: "L3 Subsidiary",
    beforePhoto: "https://picsum.photos/seed/before2/600/400",
    afterPhoto: "https://picsum.photos/seed/after2/600/400",
    closureChecks: {
      distanceMeters: 412,
      distancePassed: false,
      reusedPhotoPassed: false,
      trustScore: 48,
      trustScorePassed: false,
      aiHazardGonePassed: false,
    },
  },
];

const inspectionRecords = [
  {
    id: "INS-2026-0891",
    date: "21 Sep 2026",
    mine: "Jharia Underground Coal Mine",
    inspector: "Er. A. Kumar",
    type: "Safety & Gas Audit",
    findings: "3 findings (Minor CH4 drift)",
    risk: "Medium",
    status: "Completed",
    tone: "medium",
    summary: "Routine quarterly gas survey. Methane levels normal, minor ducting leak identified in Seam 4.",
  },
  {
    id: "INS-2026-0890",
    date: "19 Sep 2026",
    mine: "Kusunda Opencast Mine",
    inspector: "Er. R. Singh",
    type: "Ground Stability & Slope",
    findings: "5 findings (Highwall displacement)",
    risk: "High",
    status: "Review Required",
    tone: "high",
    summary: "Radar interferometry detected 4.2mm micro-displacement on Bench 4. Immediate slope scaling advised.",
  },
  {
    id: "INS-2026-0889",
    date: "20 Sep 2026",
    mine: "Moonidih Shaft & Washery",
    inspector: "Er. S. Das",
    type: "Machinery & Electrical",
    findings: "0 findings",
    risk: "Low",
    status: "Completed",
    tone: "low",
    summary: "Main winder motor and emergency braking system passed load test with zero defects.",
  },
];

export function InspectionsView() {
  const [activeTab, setActiveTab] = useState<"inspections" | "capa">("capa");
  const [selectedCapa, setSelectedCapa] = useState<CapaItem | null>(mockCapas[0]);
  const [selectedRecord, setSelectedRecord] = useState<(typeof inspectionRecords)[0] | null>(null);

  const handleApproveClosure = (capaId: string) => {
    toast.success(`CAPA ${capaId} Approved & Closed!`, {
      description: "Satya Proof verification passed. Closed timestamp recorded into audit ledger.",
    });
  };

  const handleRejectClosure = (capaId: string) => {
    toast.error(`CAPA ${capaId} Closure Rejected`, {
      description: "Distance mismatch & low trust score. Escalated to Area GM.",
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            Inspections & CAPA Satya Proof Board
            <ShieldCheck size={22} className="text-amber-500" />
          </h2>
          <p className="text-sm text-muted-foreground">
            Field inspection findings, automatic CAPA ticketing, and Before/After "Satya Proof" closure verification.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setActiveTab("capa")}
            variant={activeTab === "capa" ? "default" : "outline"}
            className="gap-2"
          >
            <ShieldCheck size={15} /> CAPA Board (Satya Proof)
          </Button>
          <Button
            onClick={() => setActiveTab("inspections")}
            variant={activeTab === "inspections" ? "default" : "outline"}
            className="gap-2"
          >
            <ClipboardCheck size={15} /> Inspections List
          </Button>
        </div>
      </div>

      {activeTab === "capa" && (
        <div className="space-y-6">
          {/* Kanban / Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {mockCapas.map((capa) => (
              <div
                key={capa.id}
                onClick={() => setSelectedCapa(capa)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  selectedCapa?.id === capa.id
                    ? "bg-card border-amber-500 shadow-md ring-1 ring-amber-500/30"
                    : "bg-card/80 border-border hover:border-slate-300 dark:hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-muted text-amber-700 dark:text-amber-400 border font-medium">
                    {capa.id}
                  </span>
                  <span
                    className={`text-[11px] font-mono px-2 py-0.5 rounded-full ${
                      capa.overdue
                        ? "bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/40"
                        : "bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/40"
                    }`}
                  >
                    {capa.dueCountdown}
                  </span>
                </div>

                <h3 className="font-display font-semibold text-sm text-foreground mt-2">{capa.findingTitle}</h3>
                <p className="text-xs text-muted-foreground mt-1">{capa.mineName} · Owner: {capa.owner}</p>

                <div className="mt-3 pt-3 border-t flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Escalation: <strong className="text-amber-600 dark:text-amber-300">{capa.escalationLevel}</strong></span>
                  <TrustScoreBadge score={capa.closureChecks.trustScore} />
                </div>
              </div>
            ))}
          </div>

          {/* CAPA Detail & Satya Proof Slider Section */}
          {selectedCapa && (
            <div className="bg-card border rounded-2xl p-6 space-y-6 shadow-sm">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-amber-700 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-950 px-2 py-0.5 rounded border border-amber-300 dark:border-amber-500/40">
                      {selectedCapa.id}
                    </span>
                    <h3 className="font-display text-lg font-bold text-foreground">{selectedCapa.findingTitle}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {selectedCapa.mineName} | Escalation Stage: <strong className="text-amber-600 dark:text-amber-300">{selectedCapa.escalationLevel}</strong>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <TrustScoreBadge score={selectedCapa.closureChecks.trustScore} flags={selectedCapa.closureChecks.distancePassed ? [] : ["outside_boundary", "reused_photo"]} />
                </div>
              </div>

              {/* Before / After Draggable Slider Component */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-foreground font-medium">
                  <span className="flex items-center gap-1.5"><ShieldCheck size={14} className="text-amber-500" /> Interactive Satya Proof Before/After Comparison</span>
                  <span className="text-muted-foreground">Drag middle slider handle horizontally</span>
                </div>
                <BeforeAfterSlider
                  beforeImage={selectedCapa.beforePhoto}
                  afterImage={selectedCapa.afterPhoto}
                  beforeLabel="Before Hazard (Recorded 14 Sep)"
                  afterLabel="After Remediation (Recorded 21 Sep)"
                />
              </div>

              {/* Satya Proof Checklist Verification Panel */}
              <div className="bg-muted/30 border rounded-xl p-4 space-y-3">
                <h4 className="font-mono text-xs text-amber-600 dark:text-amber-400 uppercase tracking-wider font-bold">
                  Satya Proof Automated Integrity Checks:
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-card border">
                    {selectedCapa.closureChecks.distancePassed ? (
                      <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle size={16} className="text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <div className="font-semibold text-foreground">GPS Proximity Distance Check</div>
                      <div className="text-[11px] text-muted-foreground">
                        {selectedCapa.closureChecks.distancePassed
                          ? `Within 30m threshold (${selectedCapa.closureChecks.distanceMeters}m from hazard) ✅`
                          : `FAILED: Distance ${selectedCapa.closureChecks.distanceMeters}m exceeds 30m boundary ❌`}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-card border">
                    {selectedCapa.closureChecks.reusedPhotoPassed ? (
                      <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle size={16} className="text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <div className="font-semibold text-foreground">Photo Reuse Anti-Fraud Check</div>
                      <div className="text-[11px] text-muted-foreground">
                        {selectedCapa.closureChecks.reusedPhotoPassed
                          ? "Unique photo hash verified. Not reused ✅"
                          : "FAILED: Photo matches uploaded inspection from 12 Aug ❌"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRejectClosure(selectedCapa.id)}
                  className="border-rose-300 dark:border-rose-500/50 text-rose-600 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950 text-xs"
                >
                  Reject Closure
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleApproveClosure(selectedCapa.id)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 shadow-sm"
                >
                  <CheckCircle2 size={15} /> Approve & Close CAPA
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "inspections" && (
        <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-foreground">
              <thead className="bg-muted/50 text-muted-foreground font-mono text-[11px] uppercase border-b">
                <tr>
                  <th className="p-3">ID</th>
                  <th className="p-3">Mine</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Inspector</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {inspectionRecords.map((rec) => (
                  <tr key={rec.id} className="hover:bg-muted/30">
                    <td className="p-3 font-mono font-bold text-amber-600 dark:text-amber-400">{rec.id}</td>
                    <td className="p-3 font-semibold text-foreground">{rec.mine}</td>
                    <td className="p-3 text-foreground">{rec.type}</td>
                    <td className="p-3 text-muted-foreground">{rec.inspector}</td>
                    <td className="p-3 font-mono text-muted-foreground">{rec.date}</td>
                    <td className="p-3"><span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/40 font-medium">{rec.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
