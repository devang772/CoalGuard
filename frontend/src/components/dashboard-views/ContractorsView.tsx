import React, { useState } from "react";
import {
  Users,
  AlertTriangle,
  FileCheck,
  Upload,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Building,
  Sparkles,
  ShieldAlert,
  Calendar,
  DollarSign,
  Smartphone,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Contractor {
  id: string;
  name: string;
  licenceNo: string;
  licenceValidTill: string;
  insuranceValidTill: string;
  mineName: string;
  workersCount: number;
  score: number;
  alertsCount: number;
  status: "Valid" | "Expiring Soon" | "Expired";
}

const mockContractors: Contractor[] = [
  {
    id: "CONT-01",
    name: "M/s Eastern Infra & Earthmovers Ltd",
    licenceNo: "CLRA-BCCL-2024-991",
    licenceValidTill: "15 Dec 2026",
    insuranceValidTill: "30 Nov 2026",
    mineName: "Kusunda Opencast Mine",
    workersCount: 142,
    score: 62,
    alertsCount: 3,
    status: "Valid",
  },
  {
    id: "CONT-02",
    name: "Shree Ram Mining Services Pvt Ltd",
    licenceNo: "CLRA-BCCL-2023-442",
    licenceValidTill: "05 Oct 2026",
    insuranceValidTill: "12 Oct 2026",
    mineName: "Jharia Underground Coal Mine",
    workersCount: 88,
    score: 89,
    alertsCount: 0,
    status: "Expiring Soon",
  },
  {
    id: "CONT-03",
    name: "Bharat Heavy Excavation Works",
    licenceNo: "CLRA-CCL-2022-118",
    licenceValidTill: "01 Sep 2026",
    insuranceValidTill: "15 Aug 2026",
    mineName: "Moonidih Shaft & Washery",
    workersCount: 65,
    score: 45,
    alertsCount: 5,
    status: "Expired",
  },
];

const mockAlerts = [
  {
    id: "ALT-GHOST-01",
    type: "Biometric Shared Device Fraud",
    severity: "CRITICAL",
    description: "🚩 5 contractor workers logged gate entry from same smartphone device ID (IMEI: 86429104-X). Potential Ghost-Worker proxy attendance.",
    workers: ["Sunil Tudu", "Ramesh Murmu", "Vikram Soren", "Rajesh Hembram", "Deepak Bauri"],
  },
  {
    id: "ALT-WAGE-02",
    type: "Minimum Wage Rate Non-Compliance",
    severity: "HIGH",
    description: "🚩 Disbursed wage rate ₹310/day is below statutory DGMS Minimum Wage threshold (₹485/day for underground Category-I).",
    workers: ["12 Unskilled Shovel Loaders"],
  },
  {
    id: "ALT-TRAIN-03",
    type: "Expired Safety Vocational Training",
    severity: "MEDIUM",
    description: "Vocational Safety Training Certificate (VTC) expired for 14 active pit workers.",
    workers: ["14 Haulage Crew Members"],
  },
];

export const ContractorsView: React.FC = () => {
  const [selectedContractor, setSelectedContractor] = useState<Contractor | null>(mockContractors[0]);
  const [isOcrUploading, setIsOcrUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<"alerts" | "workers" | "documents">("alerts");

  const handleOcrUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    setIsOcrUploading(true);
    setTimeout(() => {
      setIsOcrUploading(false);
      toast.success("License OCR Auto-Filled!", {
        description: "Extracted License No: CLRA-2026-992 · Valid till: 14 Nov 2027 · Confidence: 98%",
      });
    }, 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            Contractor Governance & 360 Labour Intelligence
            <Users size={22} className="text-amber-500" />
          </h2>
          <p className="text-sm text-muted-foreground">
            Monitor contractor licenses, biometric gate attendance, minimum wage compliance, and ghost-worker fraud alerts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="inline-flex">
            <input type="file" accept="image/*,.pdf" onChange={handleOcrUpload} className="hidden" />
            <span className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-xs cursor-pointer flex items-center gap-1.5 shadow-sm">
              <Sparkles size={14} /> {isOcrUploading ? "Running OCR..." : "Add Contractor via OCR"}
            </span>
          </label>
        </div>
      </div>

      {/* Top Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {mockContractors.map((c) => (
          <div
            key={c.id}
            onClick={() => setSelectedContractor(c)}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              selectedContractor?.id === c.id
                ? "bg-card border-amber-500 shadow-md ring-1 ring-amber-500/30"
                : "bg-card/80 border-border hover:border-slate-300 dark:hover:border-slate-700"
            }`}
          >
            <div className="flex items-start justify-between">
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-muted text-amber-700 dark:text-amber-400 border font-medium">
                {c.licenceNo}
              </span>
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  c.status === "Valid"
                    ? "bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/40"
                    : c.status === "Expiring Soon"
                    ? "bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-500/40"
                    : "bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-500/40"
                }`}
              >
                {c.status}
              </span>
            </div>

            <h3 className="font-display font-bold text-sm text-foreground mt-2">{c.name}</h3>
            <p className="text-xs text-muted-foreground mt-1">{c.mineName} · {c.workersCount} Workers</p>

            <div className="mt-3 pt-3 border-t flex items-center justify-between">
              <div className="text-xs">
                Score: <strong className={c.score > 75 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}>{c.score}/100</strong>
              </div>
              {c.alertsCount > 0 && (
                <span className="text-[11px] bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/40 px-2 py-0.5 rounded-full flex items-center gap-1 font-mono font-medium">
                  <ShieldAlert size={12} /> {c.alertsCount} Fraud Alerts
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Contractor 360 Detail View */}
      {selectedContractor && (
        <div className="bg-card border rounded-xl p-6 space-y-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-xl font-bold text-foreground">{selectedContractor.name}</h3>
                <span className="text-xs text-muted-foreground bg-muted px-2.5 py-0.5 rounded-full font-mono">ID: {selectedContractor.id}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Assigned Mine: <strong className="text-foreground">{selectedContractor.mineName}</strong> | License Expiry: <strong className="text-amber-600 dark:text-amber-300">{selectedContractor.licenceValidTill}</strong></p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-xs text-muted-foreground">Governance Score</div>
                <div className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">{selectedContractor.score}/100</div>
              </div>
            </div>
          </div>

          {/* Fraud & Compliance Alerts Panel */}
          <div className="space-y-3">
            <h4 className="font-display text-xs uppercase font-mono tracking-wider text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1.5">
              <ShieldAlert size={16} /> Active Fraud & Compliance Risk Alerts ({mockAlerts.length})
            </h4>
            <div className="space-y-2">
              {mockAlerts.map((alt) => (
                <div key={alt.id} className="p-3.5 rounded-lg bg-rose-50/50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-500/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
                      <AlertTriangle size={14} /> {alt.type}
                    </span>
                    <span className="text-[10px] bg-rose-200 dark:bg-rose-900/80 text-rose-800 dark:text-rose-200 px-2 py-0.5 rounded font-mono uppercase font-bold">
                      {alt.severity}
                    </span>
                  </div>
                  <p className="text-xs text-foreground leading-relaxed">{alt.description}</p>
                  <div className="text-[11px] text-muted-foreground">
                    Flagged Target Entities: <span className="text-rose-700 dark:text-rose-300 font-medium">{alt.workers.join(", ")}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Subtabs */}
          <div className="flex border-b text-xs font-medium">
            <button
              onClick={() => setActiveTab("workers")}
              className={`pb-2.5 px-4 border-b-2 ${activeTab === "workers" ? "border-amber-500 text-amber-600 dark:text-amber-400 font-bold" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              Enrolled Workers ({selectedContractor.workersCount})
            </button>
            <button
              onClick={() => setActiveTab("documents")}
              className={`pb-2.5 px-4 border-b-2 ${activeTab === "documents" ? "border-amber-500 text-amber-600 dark:text-amber-400 font-bold" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              Statutory Licenses & Insurance
            </button>
          </div>

          {activeTab === "workers" && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-foreground">
                <thead className="bg-muted/50 text-muted-foreground font-mono text-[11px] border-b uppercase">
                  <tr>
                    <th className="p-2.5">Worker Name</th>
                    <th className="p-2.5">Trade / Skill</th>
                    <th className="p-2.5">VTC Training</th>
                    <th className="p-2.5">Medical Fitness</th>
                    <th className="p-2.5">30-Day Attendance</th>
                    <th className="p-2.5">Fraud Flag</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <tr>
                    <td className="p-2.5 font-medium text-foreground">Sunil Tudu</td>
                    <td className="p-2.5">Shovel Operator</td>
                    <td className="p-2.5 text-emerald-600 dark:text-emerald-400 font-semibold">Valid (2027)</td>
                    <td className="p-2.5 text-emerald-600 dark:text-emerald-400 font-semibold">Passed (Form O)</td>
                    <td className="p-2.5 font-mono">94%</td>
                    <td className="p-2.5"><span className="text-rose-600 dark:text-rose-400 font-bold">Device Share Flag</span></td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-medium text-foreground">Ramesh Murmu</td>
                    <td className="p-2.5">Haulage Helper</td>
                    <td className="p-2.5 text-rose-600 dark:text-rose-400 font-bold">Expired (VTC)</td>
                    <td className="p-2.5 text-emerald-600 dark:text-emerald-400 font-semibold">Passed (Form O)</td>
                    <td className="p-2.5 font-mono">82%</td>
                    <td className="p-2.5"><span className="text-rose-600 dark:text-rose-400 font-bold">Wage Discrepancy</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
