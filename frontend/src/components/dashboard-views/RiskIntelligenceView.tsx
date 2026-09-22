import { useState } from "react";
import {
  BrainCircuit,
  AlertTriangle,
  Flame,
  Wind,
  Mountain,
  Activity,
  Zap,
  Sliders,
  Sparkles,
  ShieldAlert,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const hazards = [
  {
    id: "HAZ-01",
    title: "Highwall Slope Micro-Displacement",
    location: "Kusunda Opencast Mine (West Wall Bench 4)",
    riskScore: 78,
    severity: "HIGH",
    tone: "high",
    sensor: "Radar InSAR #04",
    prediction: "74% probability of slope failure within 48 hours if heavy rainfall continues.",
    recommendedAction: "Evacuate Bench 4 haulers and install additional crack meters.",
  },
  {
    id: "HAZ-02",
    title: "Methane (CH4) Level Elevation",
    location: "Jharia Underground (Seam 9 Face 3)",
    riskScore: 52,
    severity: "MEDIUM",
    tone: "medium",
    sensor: "IoT Methane Node #14",
    prediction: "Gradual accumulation observed over last 6 hours (+0.4% above baseline).",
    recommendedAction: "Increase auxiliary fan power to 120% and verify ventilation duct integrity.",
  },
  {
    id: "HAZ-03",
    title: "Particulate Dust (PM10/PM2.5) Spike",
    location: "Karkali Pit Crushing & Loading Unit",
    riskScore: 81,
    severity: "CRITICAL",
    tone: "critical",
    sensor: "Air Quality Node #08",
    prediction: "Dust density exceeds statutory 300 µg/m³ limit due to dry winds.",
    recommendedAction: "Activate automated mist cannons and halt un-covered truck movements.",
  },
  {
    id: "HAZ-04",
    title: "Underground Spontaneous Combustion Risk",
    location: "Moonidih Shaft (Goaf Area 2B)",
    riskScore: 42,
    severity: "MEDIUM",
    tone: "medium",
    sensor: "CO Gas Monitor #02",
    prediction: "Carbon Monoxide levels elevated to 14 PPM (early heating sign).",
    recommendedAction: "Inject nitrogen foam seal and monitor temperature rise.",
  },
];

const riskCategories = [
  { name: "Ground Stability & Slope", score: 91, tone: "critical" },
  { name: "Safety & Personal Protection", score: 86, tone: "safe" },
  { name: "Equipment & Mechanical", score: 72, tone: "warning" },
  { name: "Statutory Compliance", score: 76, tone: "safe" },
  { name: "Environmental Impact", score: 64, tone: "warning" },
  { name: "Ventilation & Gas Flow", score: 58, tone: "warning" },
  { name: "Fire & Combustion", score: 42, tone: "safe" },
];

export function RiskIntelligenceView() {
  const [productionRate, setProductionRate] = useState(85);
  const [rainfallIndex, setRainfallIndex] = useState(40);

  // Calculated simulated risk index based on inputs
  const simulatedRisk = Math.min(100, Math.round(34 + (productionRate - 50) * 0.3 + rainfallIndex * 0.4));

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-display text-2xl font-bold tracking-tight">AI Risk Intelligence Engine</h2>
            <span className="flex items-center gap-1 rounded-full bg-accent/20 px-2.5 py-0.5 text-xs font-semibold text-accent">
              <Sparkles className="size-3" /> AI Active
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Multi-hazard predictive analytics powered by satellite InSAR, IoT sensor arrays, and machine learning models.
          </p>
        </div>
      </div>

      {/* Overview Analytics Banner */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="dashboard-card p-4 border-l-4 border-l-primary">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Overall Mine Risk Index</span>
            <BrainCircuit className="size-4 text-primary" />
          </div>
          <p className="mt-2 font-display text-3xl font-bold text-primary">34 / 100</p>
          <p className="mt-1 text-xs text-emerald-600 font-medium">Moderate-Low Overall Risk</p>
        </div>
        <div className="dashboard-card p-4 border-l-4 border-l-rose-500">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Active High-Risk Hazards</span>
            <AlertTriangle className="size-4 text-rose-500" />
          </div>
          <p className="mt-2 font-display text-3xl font-bold text-rose-600">03</p>
          <p className="mt-1 text-xs text-rose-600 font-medium">Slope & Dust alerts</p>
        </div>
        <div className="dashboard-card p-4 border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">AI Model Confidence</span>
            <Zap className="size-4 text-emerald-500" />
          </div>
          <p className="mt-2 font-display text-3xl font-bold text-emerald-600">96.8%</p>
          <p className="mt-1 text-xs text-muted-foreground">1,420 sensors connected</p>
        </div>
        <div className="dashboard-card p-4 border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Predictive Horizon</span>
            <Activity className="size-4 text-amber-500" />
          </div>
          <p className="mt-2 font-display text-3xl font-bold text-amber-600">72 Hours</p>
          <p className="mt-1 text-xs text-muted-foreground">Real-time forecast horizon</p>
        </div>
      </div>

      {/* Grid: Active Hazards + Category Risk Heatmap */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Active Hazards List */}
        <div className="space-y-4 lg:col-span-2">
          <h3 className="font-display text-lg font-bold flex items-center gap-2">
            <ShieldAlert className="size-5 text-rose-500" /> Active AI Risk Detections & Predictions
          </h3>

          <div className="grid gap-4">
            {hazards.map((haz) => (
              <div key={haz.id} className="dashboard-card p-5 border-l-4 border-l-amber-500 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-muted-foreground">{haz.id}</span>
                      <span className={cn("status-badge", `status-${haz.tone}`)}>{haz.severity} SEVERITY</span>
                    </div>
                    <h4 className="font-display text-base font-bold mt-1">{haz.title}</h4>
                    <p className="text-xs text-muted-foreground">{haz.location} · {haz.sensor}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-medium text-muted-foreground">Risk Score</span>
                    <p className="font-display text-2xl font-bold text-rose-600">{haz.riskScore}/100</p>
                  </div>
                </div>

                <div className="rounded-md bg-muted/40 p-3 text-xs space-y-1">
                  <p className="font-semibold text-foreground flex items-center gap-1">
                    <Sparkles className="size-3 text-accent" /> AI Prediction:
                  </p>
                  <p className="text-muted-foreground">{haz.prediction}</p>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pt-1 text-xs">
                  <span className="font-medium text-amber-700 dark:text-amber-400">
                    Recommended Action: {haz.recommendedAction}
                  </span>
                  <Button size="sm" variant="outline" className="text-xs gap-1">
                    Acknowledge Hazard
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Category Breakdown & Simulation Tool */}
        <div className="space-y-6">
          {/* Domain Breakdown */}
          <div className="dashboard-card p-5">
            <h3 className="font-display text-base font-bold mb-4 flex items-center gap-2">
              <Layers className="size-4 text-primary" /> Risk Score by Domain
            </h3>
            <div className="space-y-3 text-xs">
              {riskCategories.map((cat) => (
                <div key={cat.name} className="space-y-1">
                  <div className="flex justify-between font-medium">
                    <span>{cat.name}</span>
                    <span className="font-bold">{cat.score}/100</span>
                  </div>
                  <div className="progress-track">
                    <span
                      className={cn("progress-fill", cat.score >= 80 ? "progress-critical" : "progress-safe")}
                      style={{ "--progress": `${cat.score}%` } as React.CSSProperties}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Interactive Simulator */}
          <div className="dashboard-card p-5 space-y-4">
            <h3 className="font-display text-base font-bold flex items-center gap-2">
              <Sliders className="size-4 text-primary" /> Risk Impact Simulator
            </h3>
            <p className="text-xs text-muted-foreground">
              Adjust operational variables to simulate overall mine risk score changes.
            </p>

            <div className="space-y-4 pt-2">
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span>Daily Excavation Production Load</span>
                  <span>{productionRate}% Capacity</span>
                </div>
                <input
                  type="range"
                  min="30"
                  max="120"
                  value={productionRate}
                  onChange={(e) => setProductionRate(Number(e.target.value))}
                  className="w-full accent-primary cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span>Forecast Monsoon Rainfall Index</span>
                  <span>{rainfallIndex} mm/hr</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={rainfallIndex}
                  onChange={(e) => setRainfallIndex(Number(e.target.value))}
                  className="w-full accent-primary cursor-pointer"
                />
              </div>

              <div className="rounded-lg border p-4 text-center bg-muted/30">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Simulated Risk Output</p>
                <p
                  className={cn(
                    "font-display text-3xl font-bold mt-1",
                    simulatedRisk > 70 ? "text-rose-600" : simulatedRisk > 50 ? "text-amber-600" : "text-emerald-600"
                  )}
                >
                  {simulatedRisk} / 100
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {simulatedRisk > 70
                    ? "CRITICAL: High probability of slope displacement"
                    : simulatedRisk > 50
                    ? "WARNING: Heightened vigilance required"
                    : "NORMAL: Safe operating parameters"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
