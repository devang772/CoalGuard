import { useState } from "react";
import {
  ShieldCheck,
  FileCheck,
  AlertCircle,
  Clock,
  Download,
  Upload,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const complianceRules = [
  {
    id: "REG-DGMS-01",
    name: "DGMS Annual Mine Safety Plan (Form IV)",
    mine: "Jharia Underground Coal Mine",
    authority: "DGMS (Directorate General of Mines Safety)",
    dueDate: "15 Oct 2026",
    status: "Compliant",
    score: "100%",
    tone: "low",
    certificate: "DGMS-FORM4-2026-991",
  },
  {
    id: "REG-MOEF-02",
    name: "Environmental Impact & Clearance (MoEFCC)",
    mine: "Kusunda Opencast Mine",
    authority: "MoEFCC / Central Pollution Control Board",
    dueDate: "28 Sep 2026",
    status: "Expiring Soon",
    score: "74%",
    tone: "high",
    certificate: "EC-KUS-2021-REV-04",
  },
  {
    id: "REG-PESO-03",
    name: "Explosives Storage & Blasting License (PESO)",
    mine: "Moonidih Shaft & Washery",
    authority: "PESO (Petroleum and Explosives Safety)",
    dueDate: "30 Nov 2026",
    status: "Compliant",
    score: "98%",
    tone: "low",
    certificate: "PESO-EXP-77102-MN",
  },
  {
    id: "REG-DGMS-04",
    name: "Monsoon Inundation Safety Audit (Circular #7)",
    mine: "Karkali Open Pit",
    authority: "DGMS Eastern Zone",
    dueDate: "10 Sep 2026",
    status: "Non-Compliant",
    score: "42%",
    tone: "critical",
    certificate: "OVERDUE-SUBMISSION",
  },
  {
    id: "REG-DGMS-05",
    name: "Underground Methane Sensor Protocol",
    mine: "Jharia Underground Coal Mine",
    authority: "DGMS Tech Directorate",
    dueDate: "01 Dec 2026",
    status: "Compliant",
    score: "94%",
    tone: "low",
    certificate: "CH4-PROT-2026-JH",
  },
  {
    id: "REG-CPCB-06",
    name: "Water Discharge & Effluent Permit (NOC)",
    mine: "Singrauli North Open Pit",
    authority: "State Pollution Control Board",
    dueDate: "05 Oct 2026",
    status: "Under Review",
    score: "85%",
    tone: "medium",
    certificate: "NOC-WATER-SG-2026",
  },
];

const categoryProgress = [
  { name: "Safety & Hazard Management", percentage: 91, tone: "safe" },
  { name: "Environmental & Air Quality", percentage: 76, tone: "warning" },
  { name: "Heavy Machinery & Equipment", percentage: 88, tone: "safe" },
  { name: "Labour Welfare & Medical Certs", percentage: 94, tone: "safe" },
  { name: "Statutory Licenses & Permits", percentage: 68, tone: "critical text-rose-500" },
];

export function ComplianceView() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const filteredRules = complianceRules.filter((rule) => {
    const matchesSearch =
      rule.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rule.mine.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rule.authority.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "All" || rule.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight">Statutory & DGMS Compliance</h2>
          <p className="text-sm text-muted-foreground">
            Track regulatory compliance, mandatory filings, environmental clearances, and DGMS circular adherence.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Upload className="size-4" /> Upload Clearance Certificate
          </Button>
          <Button size="sm" className="gap-2">
            <Download className="size-4" /> Export DGMS Audit Sheet
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="dashboard-card p-4">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Overall Compliance</span>
            <ShieldCheck className="size-4 text-emerald-500" />
          </div>
          <p className="mt-2 font-display text-3xl font-bold text-emerald-600">82.4%</p>
          <p className="mt-1 text-xs text-emerald-600 font-medium">↑ 4.2% from last quarter</p>
        </div>
        <div className="dashboard-card p-4">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Compliant Items</span>
            <CheckCircle2 className="size-4 text-emerald-500" />
          </div>
          <p className="mt-2 font-display text-3xl font-bold">346</p>
          <p className="mt-1 text-xs text-muted-foreground">Verified statutory certificates</p>
        </div>
        <div className="dashboard-card p-4">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Due Soon / Review</span>
            <Clock className="size-4 text-amber-500" />
          </div>
          <p className="mt-2 font-display text-3xl font-bold text-amber-600">18</p>
          <p className="mt-1 text-xs text-amber-600 font-medium">Action required in 30 days</p>
        </div>
        <div className="dashboard-card p-4">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Overdue / Non-Compliant</span>
            <AlertCircle className="size-4 text-rose-500" />
          </div>
          <p className="mt-2 font-display text-3xl font-bold text-rose-600">12</p>
          <p className="mt-1 text-xs text-rose-600 font-medium">Notice issued by authority</p>
        </div>
      </div>

      {/* Category Progress Section */}
      <div className="dashboard-card p-5">
        <h3 className="font-display text-base font-bold mb-4">Compliance Breakdown by Domain</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {categoryProgress.map((cat) => (
            <div key={cat.name} className="space-y-2 rounded-lg border p-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground">{cat.name}</span>
                <span className="font-bold text-primary">{cat.percentage}%</span>
              </div>
              <div className="progress-track">
                <span
                  className={cn("progress-fill", cat.percentage >= 80 ? "progress-safe" : "progress-critical")}
                  style={{ "--progress": `${cat.percentage}%` } as React.CSSProperties}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search statutory requirement, mine or authority..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-md border bg-background pl-9 pr-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:border-primary"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-md border bg-background px-3 py-1.5 text-xs font-medium outline-none focus:border-primary"
          >
            <option value="All">All Statuses</option>
            <option value="Compliant">Compliant</option>
            <option value="Expiring Soon">Expiring Soon</option>
            <option value="Under Review">Under Review</option>
            <option value="Non-Compliant">Non-Compliant</option>
          </select>
        </div>
      </div>

      {/* Compliance Table */}
      <div className="dashboard-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="dashboard-table min-w-full">
            <thead>
              <tr>
                <th>Reg ID</th>
                <th>Statutory Requirement</th>
                <th>Mine Site</th>
                <th>Issuing Authority</th>
                <th>Due Date</th>
                <th>Certificate Ref</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredRules.map((rule) => (
                <tr key={rule.id} className="hover:bg-muted/30">
                  <td className="font-mono text-xs font-bold text-primary">{rule.id}</td>
                  <td className="font-semibold text-foreground">{rule.name}</td>
                  <td className="text-muted-foreground">{rule.mine}</td>
                  <td className="text-xs text-muted-foreground">{rule.authority}</td>
                  <td className="text-xs font-medium">{rule.dueDate}</td>
                  <td className="font-mono text-xs text-muted-foreground">{rule.certificate}</td>
                  <td>
                    <span className={cn("status-badge", `status-${rule.tone}`)}>{rule.status}</span>
                  </td>
                  <td>
                    <Button variant="ghost" size="sm" className="gap-1 text-xs text-primary">
                      Verify <ExternalLink className="size-3" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
