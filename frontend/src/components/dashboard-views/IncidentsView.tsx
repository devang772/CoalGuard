import { useState } from "react";
import {
  AlertTriangle,
  Plus,
  Search,
  Filter,
  UserCheck,
  CheckCircle,
  Clock,
  Siren,
  X,
  FileText,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const incidentsData = [
  {
    id: "INC-2026-042",
    title: "Highwall Slope Micro-Movement on Bench 4",
    mine: "Kusunda Opencast Mine",
    severity: "HIGH",
    tone: "high",
    date: "21 Sep 2026",
    status: "Investigating",
    assignee: "Er. R. Singh",
    summary: "Radar InSAR #04 registered 4.2mm tension cracks on West Wall Bench 4.",
    rca: "Over-excavation without berm benching combined with heavy rainfall seepage.",
  },
  {
    id: "INC-2026-041",
    title: "Methane Sensor #14 Spike (0.65% CH4 Elevation)",
    mine: "Jharia Underground Coal Mine",
    severity: "MEDIUM",
    tone: "medium",
    date: "20 Sep 2026",
    status: "Assigned",
    assignee: "Er. A. Kumar",
    summary: "Sensor at Seam 9 working face logged methane elevation for 18 minutes.",
    rca: "Temporary blockage in secondary ventilation duct flexible coupling.",
  },
  {
    id: "INC-2026-040",
    title: "Haul Truck #12 Hydraulic Brake Line Leak",
    mine: "Moonidih Shaft & Washery",
    severity: "LOW",
    tone: "low",
    date: "20 Sep 2026",
    status: "Resolved",
    assignee: "Er. S. Das",
    summary: "Driver reported soft brake pedal response during haul ramp descent.",
    rca: "Worn hydraulic seal replaced during shift maintenance.",
  },
  {
    id: "INC-2026-039",
    title: "Water Suppression Spray Pipe Fracture",
    mine: "Karkali Open Pit",
    severity: "CRITICAL",
    tone: "critical",
    date: "19 Sep 2026",
    status: "Escalated",
    assignee: "Er. N. Prasad",
    summary: "Main dust suppression pipeline burst at crusher loading zone.",
    rca: "Over-pressure surge from primary pump without relief valve engaged.",
  },
];

export function IncidentsView() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<(typeof incidentsData)[0] | null>(null);

  const filteredIncidents = incidentsData.filter((inc) => {
    const matchesSearch =
      inc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inc.mine.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inc.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "All" || inc.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight">Incident Management & RCA</h2>
          <p className="text-sm text-muted-foreground">
            Log safety incidents, dispatch emergency teams, perform Root Cause Analysis (RCA), and manage corrective actions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setIsLogModalOpen(true)} className="gap-2 bg-rose-600 hover:bg-rose-700 text-white">
            <Siren className="size-4" /> Log Safety Incident
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="dashboard-card p-4">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Open Incidents</span>
            <AlertTriangle className="size-4 text-amber-500" />
          </div>
          <p className="mt-2 font-display text-3xl font-bold text-amber-600">08</p>
          <p className="mt-1 text-xs text-muted-foreground">Requires active monitoring</p>
        </div>
        <div className="dashboard-card p-4">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Under Investigation</span>
            <Clock className="size-4 text-primary" />
          </div>
          <p className="mt-2 font-display text-3xl font-bold text-primary">03</p>
          <p className="mt-1 text-xs text-muted-foreground">RCA team deployed</p>
        </div>
        <div className="dashboard-card p-4">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Corrective Actions</span>
            <UserCheck className="size-4 text-emerald-500" />
          </div>
          <p className="mt-2 font-display text-3xl font-bold text-emerald-600">37</p>
          <p className="mt-1 text-xs text-emerald-600 font-medium">25 closed this month</p>
        </div>
        <div className="dashboard-card p-4">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Overdue Actions</span>
            <AlertTriangle className="size-4 text-rose-500" />
          </div>
          <p className="mt-2 font-display text-3xl font-bold text-rose-600">12</p>
          <p className="mt-1 text-xs text-rose-600 font-medium">Escalated to Mine Manager</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search incidents by title, mine or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-md border bg-background pl-9 pr-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:border-primary"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="size-4 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-md border bg-background px-3 py-1.5 text-xs font-medium outline-none focus:border-primary"
          >
            <option value="All">All Statuses</option>
            <option value="Investigating">Investigating</option>
            <option value="Assigned">Assigned</option>
            <option value="Resolved">Resolved</option>
            <option value="Escalated">Escalated</option>
          </select>
        </div>
      </div>

      {/* Incidents Table */}
      <div className="dashboard-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="dashboard-table min-w-full">
            <thead>
              <tr>
                <th>Incident ID</th>
                <th>Incident Details</th>
                <th>Mine Location</th>
                <th>Severity</th>
                <th>Date</th>
                <th>Status</th>
                <th>Lead Officer</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredIncidents.map((inc) => (
                <tr key={inc.id} className="hover:bg-muted/30">
                  <td className="font-mono text-xs font-bold text-primary">{inc.id}</td>
                  <td className="font-semibold text-foreground">{inc.title}</td>
                  <td className="text-xs text-muted-foreground">{inc.mine}</td>
                  <td>
                    <span className={cn("status-badge", `status-${inc.tone}`)}>{inc.severity}</span>
                  </td>
                  <td className="text-xs text-muted-foreground">{inc.date}</td>
                  <td>
                    <span className="text-xs font-semibold">{inc.status}</span>
                  </td>
                  <td className="text-xs font-medium">{inc.assignee}</td>
                  <td>
                    <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => setSelectedIncident(inc)}>
                      View RCA <ChevronRight className="size-3" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Incident RCA Modal */}
      {selectedIncident && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="dashboard-card max-h-[90vh] w-full max-w-xl overflow-y-auto bg-card p-6 shadow-2xl">
            <div className="flex items-start justify-between border-b pb-4">
              <div>
                <span className="font-mono text-xs font-bold text-rose-600">{selectedIncident.id}</span>
                <h3 className="font-display text-lg font-bold">{selectedIncident.title}</h3>
                <p className="text-xs text-muted-foreground">{selectedIncident.mine} · Lead Officer {selectedIncident.assignee}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setSelectedIncident(null)}>
                <X className="size-4" />
              </Button>
            </div>

            <div className="mt-4 space-y-4 text-sm">
              <div className="rounded-lg border bg-muted/40 p-3">
                <p className="text-xs text-muted-foreground">Incident Summary</p>
                <p className="font-medium text-foreground mt-1">{selectedIncident.summary}</p>
              </div>

              <div>
                <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-1">
                  Root Cause Analysis (RCA)
                </h4>
                <div className="rounded-lg border border-amber-300 bg-amber-50/50 dark:bg-amber-950/20 p-3 text-xs text-amber-900 dark:text-amber-300 font-medium">
                  {selectedIncident.rca}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t pt-4">
              <Button variant="outline" onClick={() => setSelectedIncident(null)}>Close</Button>
              <Button className="gap-2"><FileText className="size-4" /> Export RCA PDF</Button>
            </div>
          </div>
        </div>
      )}

      {/* Log New Incident Modal */}
      {isLogModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="dashboard-card w-full max-w-lg bg-card p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-display text-lg font-bold text-rose-600 flex items-center gap-2">
                <Siren className="size-5" /> Log Safety Incident Report
              </h3>
              <Button variant="ghost" size="icon" onClick={() => setIsLogModalOpen(false)}>
                <X className="size-4" />
              </Button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                alert("Incident logged and emergency response dispatched!");
                setIsLogModalOpen(false);
              }}
              className="mt-4 space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Incident Title / Brief</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Methane spike or slope crack observation"
                  className="w-full rounded-md border bg-background p-2 text-sm outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Mine Site</label>
                  <select className="w-full rounded-md border bg-background p-2 text-sm outline-none focus:border-primary">
                    <option>Kusunda Opencast Mine</option>
                    <option>Jharia Underground Coal Mine</option>
                    <option>Moonidih Shaft & Washery</option>
                    <option>Karkali Open Pit</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Severity Level</label>
                  <select className="w-full rounded-md border bg-background p-2 text-sm outline-none focus:border-primary">
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                    <option value="CRITICAL">CRITICAL</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Detailed Description & Location</label>
                <textarea
                  rows={3}
                  placeholder="Specify Bench number, Seam level, sensor node ID or equipment tag..."
                  className="w-full rounded-md border bg-background p-2 text-sm outline-none focus:border-primary"
                />
              </div>

              <div className="flex justify-end gap-2 border-t pt-4">
                <Button type="button" variant="outline" onClick={() => setIsLogModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-rose-600 hover:bg-rose-700 text-white">
                  Submit Incident & Dispatch
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
