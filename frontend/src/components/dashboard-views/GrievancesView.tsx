import React, { useState } from "react";
import {
  MessageSquare,
  Lock,
  Search,
  CheckCircle2,
  Clock,
  Send,
  Sparkles,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Grievance {
  id: string;
  token: string;
  mineName: string;
  category: "Wages" | "Safety" | "Harassment" | "Facilities" | "Other";
  text: string;
  anonymous: boolean;
  reporterName?: string;
  status: "New" | "In Progress" | "Resolved" | "Closed";
  createdAt: string;
  sentiment: "Critical Concern" | "Moderate Concern" | "Informational";
}

const mockGrievances: Grievance[] = [
  {
    id: "GRV-01",
    token: "GRV-7F3K",
    mineName: "Kusunda Opencast Mine",
    category: "Safety",
    text: "Shift B miners at Pit 4 are asked to work near highwall slope bench without personal dust masks or safety helmets provided.",
    anonymous: true,
    status: "New",
    createdAt: "Yesterday, 04:15 PM",
    sentiment: "Critical Concern",
  },
  {
    id: "GRV-02",
    token: "GRV-9M2P",
    mineName: "Moonidih Shaft & Washery",
    category: "Wages",
    text: "Contractor M/s Eastern Infra has delayed wages disbursement for August 2026 beyond statutory 7th day limit.",
    anonymous: false,
    reporterName: "Rajesh Tudu",
    status: "In Progress",
    createdAt: "22 Sep 2026",
    sentiment: "Critical Concern",
  },
  {
    id: "GRV-03",
    token: "GRV-4W8N",
    mineName: "Jharia Underground Coal Mine",
    category: "Facilities",
    text: "Underground drinking water filter on Seam 9 face has been out of service for 4 days.",
    anonymous: true,
    status: "Resolved",
    createdAt: "18 Sep 2026",
    sentiment: "Moderate Concern",
  },
];

export const GrievancesView: React.FC = () => {
  const [selectedGrievance, setSelectedGrievance] = useState<Grievance | null>(mockGrievances[0]);
  const [responseMsg, setResponseMsg] = useState("");

  const handleResolve = () => {
    if (!selectedGrievance) return;
    toast.success(`Grievance ${selectedGrievance.token} Marked Resolved`, {
      description: "Response dispatched and logged into immutable audit register.",
    });
    setResponseMsg("");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="font-display text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          Anonymous Labour Grievance Portal
          <MessageSquare size={22} className="text-amber-500" />
        </h2>
        <p className="text-sm text-muted-foreground">
          Whistleblower protected grievance submission, wage dispute resolution, and statutory labor compliance redressal.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Grievances List */}
        <div className="lg:col-span-6 space-y-3">
          {mockGrievances.map((grv) => (
            <div
              key={grv.id}
              onClick={() => setSelectedGrievance(grv)}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                selectedGrievance?.id === grv.id
                  ? "bg-card border-amber-500 shadow-md ring-1 ring-amber-500/30"
                  : "bg-card/80 border-border hover:border-slate-300 dark:hover:border-slate-700"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-500/40">
                    Token: {grv.token}
                  </span>
                  {grv.anonymous && (
                    <span className="inline-flex items-center gap-1 text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full border font-mono">
                      <Lock size={10} /> Anonymous Protected 🔒
                    </span>
                  )}
                </div>
                <span
                  className={`text-[11px] font-mono px-2 py-0.5 rounded-full ${
                    grv.status === "New"
                      ? "bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/40"
                      : grv.status === "In Progress"
                      ? "bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/40"
                      : "bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/40"
                  }`}
                >
                  {grv.status}
                </span>
              </div>

              <p className="text-xs text-foreground mt-2 line-clamp-2 leading-relaxed">{grv.text}</p>

              <div className="mt-3 pt-3 border-t flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Category: <strong className="text-foreground">{grv.category}</strong></span>
                <span>Mine: <strong className="text-foreground">{grv.mineName}</strong></span>
              </div>
            </div>
          ))}
        </div>

        {/* Grievance Detail & Resolution Panel */}
        {selectedGrievance && (
          <div className="lg:col-span-6 bg-card border rounded-xl p-5 flex flex-col justify-between shadow-sm">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <h3 className="font-display text-base font-bold text-foreground flex items-center gap-2">
                    Token #{selectedGrievance.token}
                  </h3>
                  <p className="text-xs text-muted-foreground">{selectedGrievance.mineName} · Received {selectedGrievance.createdAt}</p>
                </div>
                {selectedGrievance.anonymous ? (
                  <span className="text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950 px-2.5 py-1 rounded-full border border-amber-200 dark:border-amber-500/40 font-mono flex items-center gap-1">
                    <Lock size={12} /> Reporter Confidential
                  </span>
                ) : (
                  <span className="text-xs text-foreground">Reporter: {selectedGrievance.reporterName}</span>
                )}
              </div>

              <div>
                <h4 className="text-xs font-mono text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-1 font-bold">Grievance Narrative</h4>
                <div className="p-4 rounded-xl bg-muted/30 border text-xs text-foreground leading-relaxed">
                  "{selectedGrievance.text}"
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-foreground">Official Manager Response & Action Plan:</label>
                <textarea
                  rows={3}
                  value={responseMsg}
                  onChange={(e) => setResponseMsg(e.target.value)}
                  placeholder="Type official redressal response to be sent to worker..."
                  className="w-full bg-background border rounded-lg p-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="pt-4 border-t flex items-center justify-end gap-2 mt-4">
              <Button size="sm" onClick={handleResolve} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 shadow-sm">
                <CheckCircle2 size={14} /> Dispatch & Mark Resolved
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
