import { useState } from "react";
import {
  Mountain,
  MapPin,
  ShieldCheck,
  AlertTriangle,
  Users,
  Search,
  Filter,
  ArrowRight,
  Activity,
  Gauge,
  Calendar,
  CheckCircle2,
  Download,
  Eye,
  X,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const minesData = [
  {
    id: "MINE-JH-01",
    name: "Jharia Underground Coal Mine",
    location: "Dhanbad, Jharkhand",
    region: "Dhanbad",
    type: "Underground Seam",
    capacity: "4.2 MTPA",
    compliance: 91,
    safetyScore: 95,
    issues: 3,
    risk: "LOW",
    inspection: "21 Sep 2026",
    manager: "Er. Rajesh Kumar",
    workforce: 1240,
    status: "Operational",
    tone: "low",
    methane: "0.12%",
    ventilation: "Optimal (450 m³/min)",
    slopeAngle: "N/A (Underground)",
    lastAudit: "Passed - DGMS Form IV Valid",
  },
  {
    id: "MINE-KS-02",
    name: "Kusunda Opencast Mine",
    location: "Dhanbad, Jharkhand",
    region: "Dhanbad",
    type: "Opencast Pit",
    capacity: "6.8 MTPA",
    compliance: 74,
    safetyScore: 68,
    issues: 11,
    risk: "HIGH",
    inspection: "19 Sep 2026",
    manager: "Er. Vikram Sharma",
    workforce: 890,
    status: "Attention Required",
    tone: "high",
    methane: "0.02%",
    ventilation: "Natural Air Flow",
    slopeAngle: "42° (Displacement Warning)",
    lastAudit: "Notice Issued - Slope Check Due",
  },
  {
    id: "MINE-MN-03",
    name: "Moonidih Shaft & Washery",
    location: "Dhanbad, Jharkhand",
    region: "Dhanbad",
    type: "Underground Deep Shaft",
    capacity: "3.1 MTPA",
    compliance: 88,
    safetyScore: 89,
    issues: 5,
    risk: "MEDIUM",
    inspection: "20 Sep 2026",
    manager: "Er. Sneha Das",
    workforce: 670,
    status: "Operational",
    tone: "medium",
    methane: "0.38%",
    ventilation: "Active Fan Units (380 m³/min)",
    slopeAngle: "N/A (Shaft Entry)",
    lastAudit: "Passed - Clearance Valid",
  },
  {
    id: "MINE-KR-04",
    name: "Karkali Open Pit",
    location: "Bokaro, Jharkhand",
    region: "Bokaro",
    type: "Opencast Pit",
    capacity: "2.5 MTPA",
    compliance: 67,
    safetyScore: 60,
    issues: 14,
    risk: "CRITICAL",
    inspection: "18 Sep 2026",
    manager: "Er. N. Prasad",
    workforce: 520,
    status: "Critical Review",
    tone: "critical",
    methane: "0.05%",
    ventilation: "High Dust Elevation",
    slopeAngle: "48° (Exceeds DGMS Limit)",
    lastAudit: "Audit Overdue - Non-Compliant",
  },
  {
    id: "MINE-RN-05",
    name: "Raniganj South Seam",
    location: "Raniganj, West Bengal",
    region: "Raniganj",
    type: "Underground Board & Pillar",
    capacity: "5.1 MTPA",
    compliance: 94,
    safetyScore: 96,
    issues: 2,
    risk: "LOW",
    inspection: "22 Sep 2026",
    manager: "Er. Amit Sen",
    workforce: 1410,
    status: "Operational",
    tone: "low",
    methane: "0.08%",
    ventilation: "Optimal (520 m³/min)",
    slopeAngle: "N/A",
    lastAudit: "Passed - Gold Safety Rating",
  },
  {
    id: "MINE-SG-06",
    name: "Singrauli North Open Pit",
    location: "Singrauli, Madhya Pradesh",
    region: "Singrauli",
    type: "Mega Opencast Pit",
    capacity: "12.4 MTPA",
    compliance: 81,
    safetyScore: 84,
    issues: 8,
    risk: "MEDIUM",
    inspection: "17 Sep 2026",
    manager: "Er. M. Verma",
    workforce: 2100,
    status: "Operational",
    tone: "medium",
    methane: "0.01%",
    ventilation: "Open Air Flow",
    slopeAngle: "36° (Stable)",
    lastAudit: "Passed - Renewal Pending",
  },
];

export function MinesView() {
  const [searchTerm, setSearchTerm] = useState("");
  const [regionFilter, setRegionFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedMine, setSelectedMine] = useState<(typeof minesData)[0] | null>(null);

  const filteredMines = minesData.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.manager.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRegion = regionFilter === "All" || m.region === regionFilter;
    const matchesStatus = statusFilter === "All" || m.status === statusFilter;
    return matchesSearch && matchesRegion && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Top Header & Overview Stats */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight">Mine Sites Directory</h2>
          <p className="text-sm text-muted-foreground">
            Central repository of all 24 monitored mining operations, production capacities, and safety compliance status.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="size-4" /> Export Mine Directory
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="dashboard-card p-4">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Active Sites</span>
            <Mountain className="size-4 text-primary" />
          </div>
          <p className="mt-2 font-display text-3xl font-bold">24</p>
          <p className="mt-1 text-xs text-muted-foreground">Across 4 major coalfields</p>
        </div>
        <div className="dashboard-card p-4">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Operational</span>
            <CheckCircle2 className="size-4 text-emerald-500" />
          </div>
          <p className="mt-2 font-display text-3xl font-bold text-emerald-600">18</p>
          <p className="mt-1 text-xs text-emerald-600 font-medium">75% full compliance</p>
        </div>
        <div className="dashboard-card p-4">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Attention Required</span>
            <AlertTriangle className="size-4 text-amber-500" />
          </div>
          <p className="mt-2 font-display text-3xl font-bold text-amber-600">04</p>
          <p className="mt-1 text-xs text-amber-600 font-medium">Pending inspection</p>
        </div>
        <div className="dashboard-card p-4">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Critical Review</span>
            <AlertTriangle className="size-4 text-rose-500" />
          </div>
          <p className="mt-2 font-display text-3xl font-bold text-rose-600">02</p>
          <p className="mt-1 text-xs text-rose-600 font-medium">Slope & DGMS alerts</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by mine name, region or manager..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-md border bg-background pl-9 pr-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:border-primary"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2">
            <Filter className="size-4 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">Region:</span>
            <select
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value)}
              className="rounded-md border bg-background px-2 py-1.5 text-xs font-medium outline-none focus:border-primary"
            >
              <option value="All">All Regions</option>
              <option value="Dhanbad">Dhanbad</option>
              <option value="Bokaro">Bokaro</option>
              <option value="Raniganj">Raniganj</option>
              <option value="Singrauli">Singrauli</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-md border bg-background px-2 py-1.5 text-xs font-medium outline-none focus:border-primary"
            >
              <option value="All">All Statuses</option>
              <option value="Operational">Operational</option>
              <option value="Attention Required">Attention Required</option>
              <option value="Critical Review">Critical Review</option>
            </select>
          </div>
        </div>
      </div>

      {/* Mine Cards Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredMines.map((mine) => (
          <div key={mine.id} className="dashboard-card flex flex-col p-5 hover:border-primary/50 transition-all">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{mine.id}</span>
                <h3 className="font-display text-lg font-bold leading-snug">{mine.name}</h3>
                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="size-3 text-primary" /> {mine.location}
                </p>
              </div>
              <span className={cn("status-badge", `status-${mine.tone}`)}>{mine.risk} RISK</span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 border-y py-3 text-xs">
              <div>
                <p className="text-muted-foreground">Type</p>
                <p className="font-semibold">{mine.type}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Capacity</p>
                <p className="font-semibold">{mine.capacity}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Compliance Score</p>
                <p className="font-bold text-primary">{mine.compliance}%</p>
              </div>
              <div>
                <p className="text-muted-foreground">Safety Index</p>
                <p className="font-bold text-emerald-600">{mine.safetyScore}/100</p>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Users className="size-3" /> {mine.workforce} Miners
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="size-3" /> {mine.inspection}
              </span>
            </div>

            <div className="mt-5 flex items-center justify-between gap-2 pt-2">
              <span className="text-xs font-semibold text-foreground">Manager: {mine.manager}</span>
              <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => setSelectedMine(mine)}>
                <Eye className="size-3" /> Details
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Mine Details Modal */}
      {selectedMine && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="dashboard-card max-h-[90vh] w-full max-w-2xl overflow-y-auto bg-card p-6 shadow-2xl">
            <div className="flex items-start justify-between border-b pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase text-muted-foreground">{selectedMine.id}</span>
                  <span className={cn("status-badge", `status-${selectedMine.tone}`)}>{selectedMine.risk} RISK</span>
                </div>
                <h2 className="font-display text-xl font-bold">{selectedMine.name}</h2>
                <p className="text-xs text-muted-foreground">{selectedMine.location} · {selectedMine.type}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setSelectedMine(null)}>
                <X className="size-4" />
              </Button>
            </div>

            <div className="mt-4 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4 rounded-lg bg-muted/40 p-4 md:grid-cols-4">
                <div>
                  <p className="text-xs text-muted-foreground">Compliance Rate</p>
                  <p className="font-display text-lg font-bold text-primary">{selectedMine.compliance}%</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Safety Index</p>
                  <p className="font-display text-lg font-bold text-emerald-600">{selectedMine.safetyScore}/100</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Open Issues</p>
                  <p className="font-display text-lg font-bold text-rose-600">{selectedMine.issues}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Annual Capacity</p>
                  <p className="font-display text-lg font-bold">{selectedMine.capacity}</p>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-2">Live Telemetry & Safety Sensors</h4>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">Methane Level (CH4)</p>
                    <p className="font-medium text-foreground">{selectedMine.methane}</p>
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">Ventilation Status</p>
                    <p className="font-medium text-foreground">{selectedMine.ventilation}</p>
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">Highwall Slope Angle</p>
                    <p className="font-medium text-foreground">{selectedMine.slopeAngle}</p>
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">DGMS Statutory Audit</p>
                    <p className="font-medium text-foreground">{selectedMine.lastAudit}</p>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-2">Operational Leadership</h4>
                <div className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <p className="font-semibold">{selectedMine.manager}</p>
                    <p className="text-xs text-muted-foreground">Chief Mine Manager & Statutory Safety Authority</p>
                  </div>
                  <span className="text-xs font-semibold text-primary">{selectedMine.workforce} Personnel On Shift</span>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t pt-4">
              <Button variant="outline" onClick={() => setSelectedMine(null)}>Close</Button>
              <Button className="gap-2"><FileText className="size-4" /> Download Site Dossier</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
