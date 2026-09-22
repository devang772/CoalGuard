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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
  {
    id: "INS-2026-0888",
    date: "18 Sep 2026",
    mine: "Karkali Open Pit",
    inspector: "Er. N. Prasad",
    type: "Statutory DGMS Audit",
    findings: "6 findings (Dust & Permits)",
    risk: "Critical",
    status: "Escalated",
    tone: "critical",
    summary: "Haul road dust suppression mist sprayers non-operational. Water permit renewal overdue by 12 days.",
  },
  {
    id: "INS-2026-0887",
    date: "17 Sep 2026",
    mine: "Singrauli North Open Pit",
    inspector: "Er. V. Mehta",
    type: "Explosives & Blasting",
    findings: "1 finding (Logbook gap)",
    risk: "Medium",
    status: "Completed",
    tone: "medium",
    summary: "Magazine storage security verified. Electronic detonator inventory logbook signed with 1 day lag.",
  },
  {
    id: "INS-2026-0886",
    date: "15 Sep 2026",
    mine: "Raniganj South Seam",
    inspector: "Er. Amit Sen",
    type: "Ventilation & Airflow",
    findings: "0 findings",
    risk: "Low",
    status: "Completed",
    tone: "low",
    summary: "Airflow volume at working face measured at 520 m³/min (well above DGMS 350 m³/min standard).",
  },
];

export function InspectionsView() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<(typeof inspectionRecords)[0] | null>(null);

  // New Inspection Form state
  const [formData, setFormData] = useState({
    mine: "Jharia Underground Coal Mine",
    type: "Safety & Gas Audit",
    inspector: "Er. A. Kumar",
    date: "2026-09-23",
    priority: "Medium",
    notes: "",
  });

  const filteredRecords = inspectionRecords.filter((rec) => {
    const matchesSearch =
      rec.mine.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rec.inspector.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rec.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "All" || rec.status === statusFilter;
    const matchesType = typeFilter === "All" || rec.type.includes(typeFilter);
    return matchesSearch && matchesStatus && matchesType;
  });

  const handleCreateInspection = (e: React.FormEvent) => {
    e.preventDefault();
    alert("New inspection scheduled successfully!");
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight">Safety & Statutory Inspections</h2>
          <p className="text-sm text-muted-foreground">
            Schedule, manage and audit safety inspections across all active mine faces and processing facilities.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setIsModalOpen(true)} className="gap-2">
            <Plus className="size-4" /> Schedule New Inspection
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="dashboard-card p-4">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Completed (This Month)</span>
            <CheckCircle className="size-4 text-emerald-500" />
          </div>
          <p className="mt-2 font-display text-3xl font-bold text-emerald-600">42</p>
          <p className="mt-1 text-xs text-muted-foreground">100% verified by Safety Officer</p>
        </div>
        <div className="dashboard-card p-4">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Active & Scheduled</span>
            <Clock className="size-4 text-primary" />
          </div>
          <p className="mt-2 font-display text-3xl font-bold text-primary">18</p>
          <p className="mt-1 text-xs text-muted-foreground">6 audits in progress</p>
        </div>
        <div className="dashboard-card p-4">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Overdue Audits</span>
            <AlertTriangle className="size-4 text-amber-500" />
          </div>
          <p className="mt-2 font-display text-3xl font-bold text-amber-600">07</p>
          <p className="mt-1 text-xs text-amber-600 font-medium">Requires immediate assignment</p>
        </div>
        <div className="dashboard-card p-4">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">High-Risk Findings</span>
            <AlertTriangle className="size-4 text-rose-500" />
          </div>
          <p className="mt-2 font-display text-3xl font-bold text-rose-600">11</p>
          <p className="mt-1 text-xs text-rose-600 font-medium">Corrective actions dispatched</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by ID, mine name or inspector..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-md border bg-background pl-9 pr-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:border-primary"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2">
            <Filter className="size-4 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-md border bg-background px-2 py-1.5 text-xs font-medium outline-none focus:border-primary"
            >
              <option value="All">All Statuses</option>
              <option value="Completed">Completed</option>
              <option value="Review Required">Review Required</option>
              <option value="Escalated">Escalated</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Category:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="rounded-md border bg-background px-2 py-1.5 text-xs font-medium outline-none focus:border-primary"
            >
              <option value="All">All Categories</option>
              <option value="Safety">Safety & Gas</option>
              <option value="Stability">Ground Stability</option>
              <option value="Machinery">Machinery & Electrical</option>
              <option value="DGMS">Statutory DGMS</option>
              <option value="Ventilation">Ventilation</option>
            </select>
          </div>
        </div>
      </div>

      {/* Inspection Table */}
      <div className="dashboard-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="dashboard-table min-w-full">
            <thead>
              <tr>
                <th>Inspection ID</th>
                <th>Mine Site</th>
                <th>Inspection Type</th>
                <th>Lead Inspector</th>
                <th>Date</th>
                <th>Findings</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((rec) => (
                <tr key={rec.id} className="hover:bg-muted/30">
                  <td className="font-mono text-xs font-bold text-primary">{rec.id}</td>
                  <td className="font-medium">{rec.mine}</td>
                  <td>{rec.type}</td>
                  <td className="text-muted-foreground">{rec.inspector}</td>
                  <td className="text-xs text-muted-foreground">{rec.date}</td>
                  <td>
                    <span className="text-xs font-semibold">{rec.findings}</span>
                  </td>
                  <td>
                    <span className={cn("status-badge", `status-${rec.tone}`)}>{rec.status}</span>
                  </td>
                  <td>
                    <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => setSelectedRecord(rec)}>
                      View Log <ChevronRight className="size-3" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Detail Dialog */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="dashboard-card max-h-[90vh] w-full max-w-xl overflow-y-auto bg-card p-6 shadow-2xl">
            <div className="flex items-start justify-between border-b pb-4">
              <div>
                <span className="font-mono text-xs font-bold text-primary">{selectedRecord.id}</span>
                <h3 className="font-display text-lg font-bold">{selectedRecord.mine}</h3>
                <p className="text-xs text-muted-foreground">{selectedRecord.type} · Inspected by {selectedRecord.inspector}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setSelectedRecord(null)}>
                <X className="size-4" />
              </Button>
            </div>

            <div className="mt-4 space-y-4 text-sm">
              <div className="flex items-center justify-between rounded-lg bg-muted/40 p-3">
                <div>
                  <p className="text-xs text-muted-foreground">Inspection Date</p>
                  <p className="font-semibold">{selectedRecord.date}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Risk Rating</p>
                  <span className={cn("status-badge", `status-${selectedRecord.tone}`)}>{selectedRecord.risk}</span>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Current Status</p>
                  <p className="font-semibold">{selectedRecord.status}</p>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-1">Inspector Executive Summary</h4>
                <p className="rounded-md border p-3 text-sm text-foreground bg-background">{selectedRecord.summary}</p>
              </div>

              <div>
                <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-1">Key Findings</h4>
                <p className="text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 p-2.5 rounded-md">
                  {selectedRecord.findings}
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t pt-4">
              <Button variant="outline" onClick={() => setSelectedRecord(null)}>Close</Button>
              <Button className="gap-2"><FileText className="size-4" /> Export Report PDF</Button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Inspection Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="dashboard-card w-full max-w-lg bg-card p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-display text-lg font-bold">Schedule New Safety Inspection</h3>
              <Button variant="ghost" size="icon" onClick={() => setIsModalOpen(false)}>
                <X className="size-4" />
              </Button>
            </div>

            <form onSubmit={handleCreateInspection} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Select Mine Site</label>
                <select
                  value={formData.mine}
                  onChange={(e) => setFormData({ ...formData, mine: e.target.value })}
                  className="w-full rounded-md border bg-background p-2 text-sm outline-none focus:border-primary"
                >
                  <option value="Jharia Underground Coal Mine">Jharia Underground Coal Mine</option>
                  <option value="Kusunda Opencast Mine">Kusunda Opencast Mine</option>
                  <option value="Moonidih Shaft & Washery">Moonidih Shaft & Washery</option>
                  <option value="Karkali Open Pit">Karkali Open Pit</option>
                  <option value="Singrauli North Open Pit">Singrauli North Open Pit</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Inspection Category</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full rounded-md border bg-background p-2 text-sm outline-none focus:border-primary"
                  >
                    <option value="Safety & Gas Audit">Safety & Gas Audit</option>
                    <option value="Ground Stability & Slope">Ground Stability & Slope</option>
                    <option value="Machinery & Electrical">Machinery & Electrical</option>
                    <option value="Statutory DGMS Audit">Statutory DGMS Audit</option>
                    <option value="Ventilation & Airflow">Ventilation & Airflow</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Lead Inspector</label>
                  <input
                    type="text"
                    value={formData.inspector}
                    onChange={(e) => setFormData({ ...formData, inspector: e.target.value })}
                    className="w-full rounded-md border bg-background p-2 text-sm outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Scheduled Date</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full rounded-md border bg-background p-2 text-sm outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full rounded-md border bg-background p-2 text-sm outline-none focus:border-primary"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Scope & Focus Notes</label>
                <textarea
                  rows={3}
                  placeholder="Specify focus areas, Seam depth, or specific DGMS circular requirements..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full rounded-md border bg-background p-2 text-sm outline-none focus:border-primary"
                />
              </div>

              <div className="flex justify-end gap-2 border-t pt-4">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Submit Schedule</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
