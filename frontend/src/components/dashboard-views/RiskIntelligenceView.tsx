import React, { useState } from "react";
import {
  BrainCircuit,
  AlertTriangle,
  CloudSun,
  CloudRain,
  Sun,
  Sparkles,
  ShieldAlert,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface MineWeather {
  mineId: string;
  mineName: string;
  subsidiary: string;
  riskPct: number;
  level: "high" | "moderate" | "stable";
  weatherIcon: "rain" | "cloud-sun" | "sun";
  iconBg: string;
  badgeBg: string;
  scoreColor: string;
  barColor: string;
  linkColor: string;
  reasons: { factor: string; impactPct: number }[];
  footerNote: { icon: string; text: string };
  actionLink: string;
}

const mockMineWeathers: MineWeather[] = [
  {
    mineId: "MINE-KS-02",
    mineName: "Kusunda Opencast Mine",
    subsidiary: "BCCL Subsidiary",
    riskPct: 78,
    level: "high",
    weatherIcon: "rain",
    iconBg: "bg-rose-50 dark:bg-rose-950/60 text-rose-500",
    badgeBg: "bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800",
    scoreColor: "text-rose-600 dark:text-rose-400",
    barColor: "bg-rose-500",
    linkColor: "text-rose-600 dark:text-rose-400 hover:text-rose-700",
    reasons: [
      { factor: "11 Overdue High-Risk CAPAs", impactPct: 35 },
      { factor: "Highwall InSAR Movement (4.2mm/hr)", impactPct: 28 },
      { factor: "Expired VTC Training (14 workers)", impactPct: 15 },
    ],
    footerNote: { icon: "dot-red", text: "Slope instability threshold breached" },
    actionLink: "View InSAR Telemetry →",
  },
  {
    mineId: "MINE-KR-04",
    mineName: "Karkali Open Pit",
    subsidiary: "CCL Subsidiary",
    riskPct: 72,
    level: "high",
    weatherIcon: "rain",
    iconBg: "bg-rose-50 dark:bg-rose-950/60 text-rose-500",
    badgeBg: "bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800",
    scoreColor: "text-rose-600 dark:text-rose-400",
    barColor: "bg-rose-500",
    linkColor: "text-rose-600 dark:text-rose-400 hover:text-rose-700",
    reasons: [
      { factor: "Water Sprayer Pipe Fracture (PM10 Spike)", impactPct: 40 },
      { factor: "Overdue SPCB Permit Renewal", impactPct: 22 },
      { factor: "Contractor Biometric Shared Device Flag", impactPct: 10 },
    ],
    footerNote: { icon: "warn-amber", text: "Air Quality AQI: 312 (Hazardous)" },
    actionLink: "Dispatch Water Bowsers →",
  },
  {
    mineId: "MINE-MN-03",
    mineName: "Moonidih Shaft & Washery",
    subsidiary: "BCCL Subsidiary",
    riskPct: 54,
    level: "moderate",
    weatherIcon: "cloud-sun",
    iconBg: "bg-amber-50 dark:bg-amber-950/60 text-amber-500",
    badgeBg: "bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800",
    scoreColor: "text-amber-600 dark:text-amber-400",
    barColor: "bg-amber-500",
    linkColor: "text-amber-600 dark:text-amber-400 hover:text-amber-700",
    reasons: [
      { factor: "Goaf Area CO Elevation (14 PPM)", impactPct: 30 },
      { factor: "Delayed Wage Disbursement Grievances", impactPct: 14 },
      { factor: "Main Winder Inspection Due in 3d", impactPct: 10 },
    ],
    footerNote: { icon: "clock", text: "Next ventilation balance cycle: 4 hrs" },
    actionLink: "Verify Gas Multi-Sensors →",
  },
  {
    mineId: "MINE-JH-01",
    mineName: "Jharia Underground Coal Mine",
    subsidiary: "BCCL Subsidiary",
    riskPct: 24,
    level: "stable",
    weatherIcon: "sun",
    iconBg: "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-500",
    badgeBg: "bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
    scoreColor: "text-emerald-600 dark:text-emerald-400",
    barColor: "bg-emerald-500",
    linkColor: "text-emerald-600 dark:text-emerald-400 hover:text-emerald-700",
    reasons: [
      { factor: "Zero Open High-Risk Findings", impactPct: 10 },
      { factor: "All Sensor Nodes Synchronized", impactPct: 8 },
      { factor: "100% Gate Biometric Attendance", impactPct: 6 },
    ],
    footerNote: { icon: "check-green", text: "DGMS Safety Protocol Fully Satisfied" },
    actionLink: "Audit Logs →",
  },
];

const mockAnomalies = [
  {
    id: "ANOM-01",
    mineName: "Kusunda Opencast Mine",
    type: "Production vs Dispatch Discrepancy",
    date: "22 Sep 2026",
    actual: "14,200 Tonnes",
    expected: "18,500 Tonnes",
    score: 88,
    description: "Dispatch weighbridge tally differs by 4,300 Tonnes from pit shovel extraction log. Potential pilferage or unmetered haulage.",
  },
  {
    id: "ANOM-02",
    mineName: "Moonidih Shaft & Washery",
    type: "Attendance Spike Anomaly",
    date: "21 Sep 2026",
    actual: "410 Punches",
    expected: "280 Normal Shift",
    score: 74,
    description: "Sudden +46% gate entry spike detected across shift B changeover from single mobile device IP.",
  },
];

const mockRecurring = [
  {
    clusterId: "REC-CLUST-01",
    label: "Haul Road Coal Spillage & Dust Non-Suppression",
    count: 5,
    daysSpan: "60 Days",
    mines: ["Kusunda Opencast", "Bastacolla Opencast"],
    sampleFinding: "Un-covered haul truck coal spillage leading to road dust elevation.",
  },
  {
    clusterId: "REC-CLUST-02",
    label: "Underground Auxiliary Fan Coupling Air Leakage",
    count: 3,
    daysSpan: "45 Days",
    mines: ["Jharia Underground", "Moonidih Shaft"],
    sampleFinding: "Flexible duct coupling torn at Seam 9 working face.",
  },
];

export function RiskIntelligenceView() {
  const [activeTab, setActiveTab] = useState<"weather" | "anomalies" | "recurring">("weather");

  return (
    <div className="space-y-6">
      {/* Header Section matching screenshot */}
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Compliance Weather Forecast & AI Risk Insights
            </h2>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700/50">
              <Sparkles size={13} className="text-amber-500" /> AI Model v4.2
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-3xl leading-relaxed">
            Multi-hazard predictive risk modeling, production vs dispatch anomaly detection, and recurring violation clustering across active mining faces.
          </p>
        </div>

        {/* Top Right Navigation Tabs matching screenshot */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setActiveTab("weather")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === "weather"
                ? "bg-emerald-700 hover:bg-emerald-800 !text-white shadow-sm"
                : "bg-white dark:bg-card text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800"
            }`}
          >
            Compliance Weather Forecast
          </button>
          <button
            onClick={() => setActiveTab("anomalies")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === "anomalies"
                ? "bg-emerald-700 hover:bg-emerald-800 !text-white shadow-sm"
                : "bg-white dark:bg-card text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800"
            }`}
          >
            <span>Anomalies</span>
            <span className="size-4 rounded-full bg-rose-500 !text-white text-[10px] flex items-center justify-center font-bold">
              2
            </span>
          </button>
          <button
            onClick={() => setActiveTab("recurring")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === "recurring"
                ? "bg-emerald-700 hover:bg-emerald-800 !text-white shadow-sm"
                : "bg-white dark:bg-card text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800"
            }`}
          >
            Recurring Violations
          </button>
        </div>
      </div>

      {/* Main View Tab 1: Compliance Weather Forecast 2x2 Cards Grid */}
      {activeTab === "weather" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {mockMineWeathers.map((mw) => (
            <div
              key={mw.mineId}
              className="bg-white dark:bg-card border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-6 hover:shadow-md transition-shadow"
            >
              {/* Card Header: Weather Icon, Name, Risk Score */}
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3.5">
                  <div className={`p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs ${mw.iconBg}`}>
                    {mw.weatherIcon === "rain" && <CloudRain size={24} />}
                    {mw.weatherIcon === "cloud-sun" && <CloudSun size={24} />}
                    {mw.weatherIcon === "sun" && <Sun size={24} />}
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-base text-slate-900 dark:text-slate-100">
                      {mw.mineName}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {mw.subsidiary} · ID: <span className="font-mono">{mw.mineId}</span>
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">
                    RISK INDEX
                  </div>
                  <div className={`text-3xl font-bold font-mono ${mw.scoreColor}`}>
                    {mw.riskPct}%
                  </div>
                  <span className={`inline-block text-[10px] font-bold font-mono uppercase tracking-wider px-2 py-0.5 rounded border mt-0.5 ${mw.badgeBg}`}>
                    {mw.level === "high" ? "HIGH RISK" : mw.level === "moderate" ? "MODERATE" : "STABLE"}
                  </span>
                </div>
              </div>

              {/* Drivers Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 uppercase tracking-wider font-bold border-b border-slate-100 dark:border-slate-800 pb-1.5">
                  <span>TOP RISK DRIVERS ("WHY?")</span>
                  <span>IMPACT CONTRIBUTION</span>
                </div>

                <div className="space-y-3">
                  {mw.reasons.map((r, i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex justify-between text-xs text-slate-800 dark:text-slate-200 font-medium">
                        <span className="truncate pr-2">{r.factor}</span>
                        <span className={`font-mono font-bold shrink-0 ${mw.scoreColor}`}>
                          +{r.impactPct}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${mw.barColor}`}
                          style={{ width: `${r.impactPct * 2.4}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card Footer matching screenshot */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                  {mw.footerNote.icon === "dot-red" && (
                    <span className="size-2 rounded-full bg-rose-500 animate-pulse" />
                  )}
                  {mw.footerNote.icon === "warn-amber" && (
                    <AlertTriangle size={14} className="text-amber-500 shrink-0" />
                  )}
                  {mw.footerNote.icon === "clock" && (
                    <Clock size={14} className="text-amber-500 shrink-0" />
                  )}
                  {mw.footerNote.icon === "check-green" && (
                    <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                  )}
                  <span className="text-[11px] font-medium">{mw.footerNote.text}</span>
                </div>

                <button className={`text-xs font-semibold hover:underline cursor-pointer ${mw.linkColor}`}>
                  {mw.actionLink}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 2: Anomalies */}
      {activeTab === "anomalies" && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-card border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 shadow-sm">
            <h3 className="font-display text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <AlertTriangle size={18} className="text-rose-500" /> Operational & Tonnage Anomaly Signals
            </h3>
            <div className="space-y-3">
              {mockAnomalies.map((anom) => (
                <div key={anom.id} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-900 dark:text-slate-100">{anom.mineName} — {anom.type}</span>
                    <span className="font-mono text-xs text-rose-600 dark:text-rose-400 font-bold bg-rose-50 dark:bg-rose-950 px-2.5 py-0.5 rounded border border-rose-200 dark:border-rose-800">
                      Anomaly Score: {anom.score}/100
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{anom.description}</p>
                  <div className="flex items-center gap-4 text-xs font-mono text-slate-500 dark:text-slate-400 pt-1">
                    <span>Actual Tonnage Tally: <strong className="text-rose-600 dark:text-rose-400">{anom.actual}</strong></span>
                    <span>Expected Baseline: <strong className="text-emerald-600 dark:text-emerald-400">{anom.expected}</strong></span>
                    <span>Logged: {anom.date}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Recurring Violations */}
      {activeTab === "recurring" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {mockRecurring.map((rec) => (
              <div key={rec.clusterId} className="p-5 bg-white dark:bg-card border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 px-2.5 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                    {rec.clusterId}
                  </span>
                  <span className="text-xs font-mono text-slate-500 dark:text-slate-400">{rec.count} Occurrences in {rec.daysSpan}</span>
                </div>
                <h3 className="font-display font-bold text-sm text-slate-900 dark:text-slate-100">{rec.label}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Affected Mines: {rec.mines.join(", ")}</p>
                <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-xs text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800">
                  Sample Finding: "{rec.sampleFinding}"
                </div>
                <Button size="sm" className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-sm">
                  Create Preventive Compliance Task
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
