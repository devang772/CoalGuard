import { useState } from "react";
import {
  Bell,
  AlertTriangle,
  Siren,
  CheckCircle2,
  Filter,
  Plus,
  Radio,
  Sliders,
  X,
  Eye,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const alertsFeed = [
  {
    id: "ALT-8841",
    level: "CRITICAL",
    tone: "critical",
    message: "Highwall Slope Micro-Displacement Exceeds 4.5mm/hr",
    mine: "Kusunda Opencast Mine (West Wall Bench 4)",
    time: "12 mins ago",
    sensor: "Radar InSAR #04",
    status: "Unacknowledged",
  },
  {
    id: "ALT-8840",
    level: "HIGH",
    tone: "high",
    message: "Gas Sensor #14 CO Spike Recorded at 28 PPM",
    mine: "Jharia Underground Coal Mine (Seam 9 Face 3)",
    time: "45 mins ago",
    sensor: "IoT Methane Node #14",
    status: "Acknowledged",
  },
  {
    id: "ALT-8839",
    level: "MEDIUM",
    tone: "medium",
    message: "Statutory Environmental Clearance Renewal Required in 7 Days",
    mine: "Moonidih Shaft & Washery",
    time: "2 hours ago",
    sensor: "Compliance System Engine",
    status: "Acknowledged",
  },
  {
    id: "ALT-8838",
    level: "INFO",
    tone: "info",
    message: "Satellite InSAR Synthetic Aperture Sync Completed for Dhanbad Cluster",
    mine: "Dhanbad Coalfield Region",
    time: "4 hours ago",
    sensor: "Sentinel-1 Constellation",
    status: "System Logged",
  },
];

export function AlertsView() {
  const [filterLevel, setFilterLevel] = useState("All");
  const [alerts, setAlerts] = useState(alertsFeed);
  const [isThresholdModalOpen, setIsThresholdModalOpen] = useState(false);

  const handleAcknowledge = (id: string) => {
    setAlerts((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: "Acknowledged" } : item))
    );
  };

  const filteredAlerts = alerts.filter((a) => filterLevel === "All" || a.level === filterLevel);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight">Real-Time Safety Alerts</h2>
          <p className="text-sm text-muted-foreground">
            Configure safety threshold alerts, monitor AI hazard detections, and dispatch emergency response teams.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setIsThresholdModalOpen(true)} className="gap-2">
            <Sliders className="size-4" /> Configure Thresholds
          </Button>
        </div>
      </div>

      {/* Filter and Stats Bar */}
      <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="size-4 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">Filter Severity:</span>
          {["All", "CRITICAL", "HIGH", "MEDIUM", "INFO"].map((lvl) => (
            <Button
              key={lvl}
              size="sm"
              variant={filterLevel === lvl ? "default" : "ghost"}
              className="h-7 px-3 text-xs"
              onClick={() => setFilterLevel(lvl)}
            >
              {lvl}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600">
          <Radio className="size-4 animate-pulse" /> AI Detection Pipeline: Active
        </div>
      </div>

      {/* Alerts Feed List */}
      <div className="grid gap-4">
        {filteredAlerts.map((alt) => (
          <div key={alt.id} className={cn("dashboard-card p-5 transition-all border-l-4", `border-l-[var(--${alt.tone === 'critical' ? 'destructive' : alt.tone === 'high' ? 'warning' : 'primary'})]`)}>
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-muted-foreground">{alt.id}</span>
                  <span className={cn("status-badge", `status-${alt.tone}`)}>{alt.level}</span>
                  <span className="text-xs text-muted-foreground">· {alt.time}</span>
                </div>
                <h3 className="font-display text-base font-bold mt-1">{alt.message}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{alt.mine} — Source: {alt.sensor}</p>
              </div>

              <div className="flex items-center gap-2">
                {alt.status === "Unacknowledged" ? (
                  <Button size="sm" variant="default" className="gap-1 text-xs" onClick={() => handleAcknowledge(alt.id)}>
                    <Check className="size-3" /> Acknowledge
                  </Button>
                ) : (
                  <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/20 px-2.5 py-1 rounded-md">
                    <CheckCircle2 className="size-3" /> {alt.status}
                  </span>
                )}
                <Button size="sm" variant="outline" className="text-xs">
                  Inspect Sensor
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Configure Thresholds Modal */}
      {isThresholdModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="dashboard-card w-full max-w-md bg-card p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-display text-lg font-bold">Configure Alert Triggers</h3>
              <Button variant="ghost" size="icon" onClick={() => setIsThresholdModalOpen(false)}>
                <X className="size-4" />
              </Button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                alert("Alert threshold parameters saved!");
                setIsThresholdModalOpen(false);
              }}
              className="mt-4 space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  Methane (CH4) Warning Trigger Limit
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.05"
                    defaultValue="0.75"
                    className="w-full rounded-md border bg-background p-2 text-sm outline-none focus:border-primary"
                  />
                  <span className="text-xs font-semibold text-muted-foreground">% Vol</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  InSAR Slope Micro-Displacement Limit
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.5"
                    defaultValue="4.0"
                    className="w-full rounded-md border bg-background p-2 text-sm outline-none focus:border-primary"
                  />
                  <span className="text-xs font-semibold text-muted-foreground">mm/hr</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  Dust PM10 Airborne Concentration Limit
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    defaultValue="300"
                    className="w-full rounded-md border bg-background p-2 text-sm outline-none focus:border-primary"
                  />
                  <span className="text-xs font-semibold text-muted-foreground">µg/m³</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t pt-4">
                <Button type="button" variant="outline" onClick={() => setIsThresholdModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Save Threshold Settings</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
