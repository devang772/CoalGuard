import { useState } from "react";
import {
  Settings,
  Sliders,
  Radio,
  Globe,
  Shield,
  Save,
  Check,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SettingsView() {
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState("AI Engine");

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight">System Configuration</h2>
          <p className="text-sm text-muted-foreground">
            Configure global system defaults, AI confidence limits, IoT telemetry sync frequency, and DGMS integration endpoints.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {saved && (
            <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
              <Check className="size-4" /> Settings Saved!
            </span>
          )}
          <Button onClick={handleSave} className="gap-2">
            <Save className="size-4" /> Save Configuration
          </Button>
        </div>
      </div>

      {/* Settings Category Tabs */}
      <div className="flex border-b text-xs font-semibold gap-2 overflow-x-auto pb-1">
        {["AI Engine", "IoT Telemetry", "DGMS Webhooks", "Security & Access", "General"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-4 py-2 rounded-t-lg transition-colors border-b-2 font-medium whitespace-nowrap",
              activeTab === tab
                ? "border-primary text-primary bg-primary/5 font-bold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Main Settings Form Container */}
      <div className="dashboard-card p-6 space-y-6">
        {activeTab === "AI Engine" && (
          <div className="space-y-6">
            <h3 className="font-display text-base font-bold flex items-center gap-2">
              <Zap className="size-4 text-primary" /> AI Risk Engine & Detection Parameters
            </h3>

            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  AI Model Risk Confidence Threshold
                </label>
                <select className="w-full rounded-md border bg-background p-2 text-sm outline-none focus:border-primary">
                  <option>95% (High Precision — Fewer False Alarms)</option>
                  <option>90% (Standard Balanced Mode)</option>
                  <option>85% (High Sensitivity — Early Detection)</option>
                </select>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Controls minimum AI confidence before escalating slope or gas warnings.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  InSAR Satellite Displacement Processing Engine
                </label>
                <select className="w-full rounded-md border bg-background p-2 text-sm outline-none focus:border-primary">
                  <option>Real-Time Interferometric Phase Stacking (RadarSat-2 + Sentinel-1)</option>
                  <option>Sentinel-1 Standard 6-Day Pass</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  Automated Alert Escalation Interval
                </label>
                <select className="w-full rounded-md border bg-background p-2 text-sm outline-none focus:border-primary">
                  <option>Immediately (0 minutes for Critical Hazards)</option>
                  <option>5 minutes debounce</option>
                  <option>15 minutes debounce</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  Document RAG Vector Embeddings Re-indexing Schedule
                </label>
                <select className="w-full rounded-md border bg-background p-2 text-sm outline-none focus:border-primary">
                  <option>Real-Time on New Document Upload</option>
                  <option>Nightly Batch Indexing at 02:00 IST</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {activeTab === "IoT Telemetry" && (
          <div className="space-y-6">
            <h3 className="font-display text-base font-bold flex items-center gap-2">
              <Radio className="size-4 text-primary" /> Sensor Network & Telemetry Sync
            </h3>

            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  Methane (CH4) Sensor Polling Rate
                </label>
                <select className="w-full rounded-md border bg-background p-2 text-sm outline-none focus:border-primary">
                  <option>5 Seconds (High Frequency Underground Mode)</option>
                  <option>15 Seconds</option>
                  <option>60 Seconds</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  Highwall Tiltmeter & Prism Radar Frequency
                </label>
                <select className="w-full rounded-md border bg-background p-2 text-sm outline-none focus:border-primary">
                  <option>Continuous Stream (10 Hz)</option>
                  <option>1 Minute Interval</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {activeTab !== "AI Engine" && activeTab !== "IoT Telemetry" && (
          <div className="space-y-4">
            <h3 className="font-display text-base font-bold">{activeTab} Parameters</h3>
            <p className="text-sm text-muted-foreground">
              Configure {activeTab.toLowerCase()} properties and integration endpoints for your organization.
            </p>
            <div className="rounded-lg border p-4 bg-muted/20 text-xs">
              All settings changes are recorded in the security audit log for compliance verification.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
