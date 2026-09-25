import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  ArrowUpDown,
  Bell,
  Bot,
  BrainCircuit,
  CalendarDays,
  ChevronDown,
  CircleDot,
  ClipboardCheck,
  ClipboardList,
  FileBarChart,
  FileSearch,
  Files,
  Filter,
  Gauge,
  Map,
  MapPin,
  MapPinned,
  Menu,
  Mountain,
  PanelLeftClose,
  PanelLeftOpen,
  Radio,
  RefreshCcw,
  ScrollText,
  Search,
  Settings,
  ShieldCheck,
  Siren,
  Trophy,
  Sparkles,
  UserCheck,
  MessageSquare,
  Globe,
  Upload,
  UserCircle,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { useState, type CSSProperties, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Check, LogOut, User } from "lucide-react";

import { MinesView } from "@/components/dashboard-views/MinesView";
import { InspectionsView } from "@/components/dashboard-views/InspectionsView";
import { ComplianceView } from "@/components/dashboard-views/ComplianceView";
import { RiskIntelligenceView } from "@/components/dashboard-views/RiskIntelligenceView";
import { GISMapView } from "@/components/dashboard-views/GISMapView";
import { DocumentsView } from "@/components/dashboard-views/DocumentsView";
import { IncidentsView } from "@/components/dashboard-views/IncidentsView";
import { ReportsView } from "@/components/dashboard-views/ReportsView";
import { AlertsView } from "@/components/dashboard-views/AlertsView";
import { UsersView } from "@/components/dashboard-views/UsersView";
import { SettingsView } from "@/components/dashboard-views/SettingsView";
import { AuditLogsView } from "@/components/dashboard-views/AuditLogsView";

import { RuleStudioView } from "@/components/dashboard-views/RuleStudioView";
import { ContractorsView } from "@/components/dashboard-views/ContractorsView";
import { AttendanceView } from "@/components/dashboard-views/AttendanceView";
import { GrievancesView } from "@/components/dashboard-views/GrievancesView";
import { LeaderboardView } from "@/components/dashboard-views/LeaderboardView";

import { ScopeSwitcher } from "@/components/common/ScopeSwitcher";
import { RoleSwitcher } from "@/components/common/RoleSwitcher";
import { AskNetraFloating } from "@/components/common/AskNetraFloating";
import { useAppStore } from "@/store/useAppStore";
import "@/lib/i18n";


export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "CoalGuard Dashboard — Mine Command Center" },
      {
        name: "description",
        content:
          "CoalGuard dashboard for monitoring mine safety, compliance, inspections, risks, incidents, GIS intelligence and AI operational insights.",
      },
      { property: "og:title", content: "CoalGuard Dashboard — Mine Command Center" },
      {
        property: "og:description",
        content:
          "A centralized AI-powered command dashboard for mine managers, safety officers and compliance administrators.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CoalGuardDashboard,
});

const primaryNav: Array<{ label: string; icon: LucideIcon }> = [
  { label: "Dashboard", icon: Gauge },
  { label: "GIS Map", icon: Map },
  { label: "Leaderboard", icon: Trophy },
  { label: "Mine Profile & Rules", icon: Sparkles },
  { label: "Mines", icon: Mountain },
  { label: "Inspections", icon: ClipboardCheck },
  { label: "Compliance", icon: ShieldCheck },
  { label: "Risk Intelligence", icon: BrainCircuit },
  { label: "Contractors", icon: Users },
  { label: "Attendance", icon: UserCheck },
  { label: "Grievances", icon: MessageSquare },
  { label: "Documents", icon: Files },
  { label: "Incidents", icon: AlertTriangle },
  { label: "Reports", icon: FileBarChart },
  { label: "Alerts", icon: Bell },
];

const adminNav: Array<{ label: string; icon: LucideIcon }> = [
  { label: "Users", icon: Users },
  { label: "Settings", icon: Settings },
  { label: "Audit Logs", icon: ScrollText },
];

const quickActions = [
  { label: "New Inspection", icon: ClipboardList },
  { label: "Upload Document", icon: Upload },
  { label: "Generate Report", icon: FileBarChart },
  { label: "View GIS", icon: MapPinned },
  { label: "Create Alert", icon: Siren },
];

const kpis = [
  { label: "Total Mines", value: "24", note: "+2 this month", tone: "neutral" },
  { label: "Compliance Rate", value: "82.4%", note: "↑ 4.2%", tone: "safe", progress: 82 },
  { label: "Active Inspections", value: "18", note: "6 require action", tone: "warning" },
  { label: "High-Risk Issues", value: "05", note: "2 critical", tone: "critical" },
  { label: "Open Corrective Actions", value: "37", note: "12 overdue", tone: "warning" },
  { label: "AI Alerts", value: "14", note: "4 require review", tone: "ai" },
];

const mines = [
  {
    mine: "Jharia Mine",
    location: "Dhanbad",
    compliance: 91,
    issues: 3,
    risk: "LOW",
    inspection: "21 Sep 2026",
    status: "Operational",
    tone: "low",
  },
  {
    mine: "Kusunda Mine",
    location: "Dhanbad",
    compliance: 74,
    issues: 11,
    risk: "HIGH",
    inspection: "19 Sep 2026",
    status: "Attention Required",
    tone: "high",
  },
  {
    mine: "Moonidih Mine",
    location: "Dhanbad",
    compliance: 88,
    issues: 5,
    risk: "MEDIUM",
    inspection: "20 Sep 2026",
    status: "Operational",
    tone: "medium",
  },
  {
    mine: "Karkali Mine",
    location: "Bokaro",
    compliance: 67,
    issues: 14,
    risk: "CRITICAL",
    inspection: "18 Sep 2026",
    status: "Critical Review",
    tone: "critical",
  },
];

const riskCategories = [
  ["Safety", 86],
  ["Environment", 64],
  ["Equipment", 72],
  ["Ground Stability", 91],
  ["Fire", 42],
  ["Ventilation", 58],
  ["Statutory Compliance", 76],
] as const;

const criticalActions = [
  {
    level: "HIGH",
    issue: "Slope instability detected",
    mine: "Jharia Mine",
    time: "12 min ago",
    officer: "A. Kumar",
    tone: "high",
  },
  {
    level: "MEDIUM",
    issue: "Safety inspection overdue",
    mine: "Kusunda Mine",
    time: "2 hrs ago",
    officer: "R. Singh",
    tone: "medium",
  },
  {
    level: "CRITICAL",
    issue: "Compliance document missing",
    mine: "Moonidih Mine",
    time: "4 hrs ago",
    officer: "P. Verma",
    tone: "critical",
  },
];

const complianceItems = [
  ["Safety", 91],
  ["Environment", 76],
  ["Equipment", 88],
  ["Labour", 94],
  ["Statutory", 68],
] as const;

const complianceCounts = [
  ["Overdue", "12", "critical"],
  ["Due Soon", "18", "warning"],
  ["Compliant", "346", "safe"],
  ["Non-Compliant", "29", "critical"],
] as const;

const inspectionMetrics = [
  ["Completed", "42"],
  ["Pending", "18"],
  ["Overdue", "07"],
  ["High-Risk Findings", "11"],
] as const;

const inspectionRows = [
  ["21 Sep", "Jharia", "A. Kumar", "Safety", "3 findings", "Medium", "Completed"],
  ["21 Sep", "Kusunda", "R. Singh", "Environment", "1 finding", "High", "Review"],
  ["20 Sep", "Moonidih", "S. Das", "Equipment", "0 findings", "Low", "Completed"],
  ["19 Sep", "Karkali", "N. Prasad", "Statutory", "6 findings", "Critical", "Escalated"],
] as const;

const fieldTeams = [
  ["A. Kumar", "Jharia Mine", "Safety Inspection"],
  ["R. Singh", "Kusunda Mine", "Environmental Inspection"],
  ["S. Das", "Moonidih Mine", "Equipment Audit"],
] as const;

const incidentMetrics = [
  ["Open Incidents", "08"],
  ["Under Investigation", "03"],
  ["Corrective Actions", "37"],
  ["Overdue Actions", "12"],
] as const;

const incidents = [
  ["Slope movement", "Jharia", "High", "21 Sep", "Investigating", "A. Kumar"],
  ["Ventilation reading", "Kusunda", "Medium", "20 Sep", "Assigned", "R. Singh"],
  ["Missing barricade", "Moonidih", "Low", "20 Sep", "Resolved", "S. Das"],
] as const;

const alerts = [
  ["Critical", "AI detected potential slope instability", "Jharia Mine", "critical"],
  ["High", "Inspection overdue by 3 days", "Kusunda Mine", "high"],
  ["Medium", "Compliance document expiring in 7 days", "Moonidih Mine", "medium"],
  ["Information", "GPS field report synchronized", "Karkali Mine", "info"],
] as const;

const trendValues = [28, 34, 31, 42, 47, 39, 54, 61, 57, 63, 68, 72];
const activityBars = [62, 46, 70, 52, 82, 74, 58, 67, 79, 64, 55, 71];

const quickActionMap: Record<string, string> = {
  "New Inspection": "Inspections",
  "Upload Document": "Documents",
  "Generate Report": "Reports",
  "View GIS": "GIS Map",
  "Create Alert": "Alerts",
};

function CoalGuardDashboard() {
  const navigate = useNavigate();
  const { user, language, setLanguage, isAuthenticated, logoutUser } = useAppStore();

  // Auth guard: redirect to login page if not authenticated
  if (!isAuthenticated) {
    navigate({ to: "/login" });
    return null;
  }
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [range, setRange] = useState("Today");
  const [activeTab, setActiveTab] = useState("Dashboard");

  // Interactive Filter States
  const [selectedMine, setSelectedMine] = useState("All Mines");
  const [selectedRisk, setSelectedRisk] = useState("All");
  const [selectedCompliance, setSelectedCompliance] = useState("All");
  const [selectedInspectionStatus, setSelectedInspectionStatus] = useState("All");

  const resetFilters = () => {
    setSelectedMine("All Mines");
    setSelectedRisk("All");
    setSelectedCompliance("All");
    setSelectedInspectionStatus("All");
    setRange("Today");
  };

  const handleSelectTab = (tab: string) => {
    setActiveTab(tab);
    setMobileNavOpen(false);
  };

  const filteredOverviewMines = mines.filter((mineItem) => {
    const matchesMine = selectedMine === "All Mines" || mineItem.mine.toLowerCase().includes(selectedMine.toLowerCase());
    const matchesRisk = selectedRisk === "All" || mineItem.risk.toUpperCase() === selectedRisk.toUpperCase();
    const matchesStatus = selectedInspectionStatus === "All" || mineItem.status.toLowerCase().includes(selectedInspectionStatus.toLowerCase());
    return matchesMine && matchesRisk && matchesStatus;
  });

  return (
    <main className="coalguard-dashboard min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen">
        <aside
          className={cn(
            "dashboard-sidebar fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0",
            collapsed && "lg:w-20",
            mobileNavOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className={cn("flex h-16 items-center border-b px-3", collapsed ? "justify-center" : "justify-between gap-3 px-4")}>
            {!collapsed ? (
              <>
                <Link to="/" className="flex items-center gap-3 min-w-0" aria-label="CoalGuard home">
                  <div className="dashboard-brand-mark">
                    <ShieldCheck size={20} />
                  </div>
                  <div className="min-w-0">
                    <span className="block font-display text-lg font-semibold leading-none">CoalGuard</span>
                    <span className="block text-[10px] uppercase tracking-[0.18em] text-[var(--dashboard-sidebar-muted)] mt-1">
                      Mine Command
                    </span>
                  </div>
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  className="hidden text-[var(--dashboard-sidebar-muted)] hover:bg-[var(--dashboard-sidebar-hover)] hover:text-[var(--dashboard-sidebar-foreground)] lg:inline-flex"
                  aria-label="Collapse sidebar"
                  onClick={() => setCollapsed(true)}
                >
                  <PanelLeftClose />
                </Button>
              </>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                className="mx-auto hidden text-[var(--dashboard-sidebar-muted)] hover:bg-[var(--dashboard-sidebar-hover)] hover:text-[var(--dashboard-sidebar-foreground)] lg:inline-flex"
                aria-label="Expand sidebar"
                onClick={() => setCollapsed(false)}
              >
                <PanelLeftOpen />
              </Button>
            )}

            <Button
              variant="ghost"
              size="icon"
              className="ml-auto text-[var(--dashboard-sidebar-muted)] hover:bg-[var(--dashboard-sidebar-hover)] hover:text-[var(--dashboard-sidebar-foreground)] lg:hidden"
              aria-label="Close navigation"
              onClick={() => setMobileNavOpen(false)}
            >
              <X />
            </Button>
          </div>

          <nav className="flex-1 space-y-6 overflow-y-auto p-3" aria-label="Dashboard navigation">
            <SidebarGroup title="Monitor" collapsed={collapsed} items={primaryNav} activeTab={activeTab} onSelectTab={handleSelectTab} />
            <SidebarGroup title="Administration" collapsed={collapsed} items={adminNav} activeTab={activeTab} onSelectTab={handleSelectTab} />
          </nav>

          <div className="border-t p-3">
            <div className={cn("dashboard-sync rounded-lg p-3", collapsed && "px-2 text-center")}>
              <Radio className="mx-auto mb-2 size-4 text-primary" />
              {!collapsed && (
                <>
                  <p className="text-xs font-semibold">Live data sync</p>
                  <p className="mt-1 text-[10px] text-[var(--dashboard-sidebar-muted)]">Updated 08 seconds ago</p>
                </>
              )}
            </div>
          </div>
        </aside>

        {mobileNavOpen && (
          <Button
            variant="ghost"
            className="fixed inset-0 z-30 h-auto w-auto rounded-none bg-foreground/20 p-0 hover:bg-foreground/20 lg:hidden"
            aria-label="Close navigation overlay"
            onClick={() => setMobileNavOpen(false)}
          />
        )}

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85">
            <div className="flex min-h-16 flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between md:gap-6 xl:px-6">
              <div className="flex items-center gap-3 shrink-0">
                <Button variant="outline" size="icon" className="lg:hidden" aria-label="Open navigation" onClick={() => setMobileNavOpen(true)}>
                  <Menu />
                </Button>
                <div className="hidden md:block">
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Central command center</p>
                  <h1 className="font-display text-xl font-semibold tracking-tight">{activeTab === "Dashboard" ? "Dashboard Overview" : activeTab}</h1>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 shrink-0">
                <div className="dashboard-search flex h-10 w-72 sm:w-80 items-center gap-2.5 rounded-lg border bg-card px-3.5 shadow-xs shrink-0">
                  <Search className="size-4 text-emerald-600 shrink-0" />
                  <input
                    aria-label="Global search"
                    placeholder="Search mine, inspection, incident..."
                    className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  />
                </div>

                <ScopeSwitcher />

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="h-10 gap-2 px-3 cursor-pointer bg-card shrink-0">
                      <UserCircle className="size-5 text-emerald-600 shrink-0" />
                      <div className="hidden text-left sm:block">
                        <p className="text-xs font-semibold leading-none">{user.name}</p>
                        <p className="mt-1 text-[10px] text-muted-foreground">{user.orgUnit}</p>
                      </div>
                      <ChevronDown className="size-3 text-muted-foreground shrink-0" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>My Account & Profile</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleSelectTab("Users")}>
                      <User className="mr-2 size-4 text-primary" /> Profile & Personnel
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleSelectTab("Settings")}>
                      <Settings className="mr-2 size-4 text-primary" /> System Settings
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleSelectTab("Audit Logs")}>
                      <ScrollText className="mr-2 size-4 text-primary" /> Security Audit Trail
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-rose-600 focus:text-rose-600 cursor-pointer" onClick={() => { logoutUser(); navigate({ to: "/login" }); }}>
                      <LogOut className="mr-2 size-4" /> Logout Session
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>

          <section className="space-y-6 px-4 py-6 xl:px-8 max-w-[1700px] mx-auto">
            {activeTab === "Mines" && <MinesView />}
            {activeTab === "Inspections" && <InspectionsView />}
            {activeTab === "Compliance" && <ComplianceView />}
            {activeTab === "Risk Intelligence" && <RiskIntelligenceView />}
            {activeTab === "GIS Map" && <GISMapView />}
            {activeTab === "Mine Profile & Rules" && <RuleStudioView />}
            {activeTab === "Contractors" && <ContractorsView />}
            {activeTab === "Attendance" && <AttendanceView />}
            {activeTab === "Grievances" && <GrievancesView />}
            {activeTab === "Leaderboard" && <LeaderboardView />}
            {activeTab === "Documents" && <DocumentsView />}
            {activeTab === "Incidents" && <IncidentsView />}
            {activeTab === "Reports" && <ReportsView />}
            {activeTab === "Alerts" && <AlertsView />}
            {activeTab === "Users" && <UsersView />}
            {activeTab === "Settings" && <SettingsView />}
            {activeTab === "Audit Logs" && <AuditLogsView />}

            {activeTab === "Dashboard" && (
              <div className="space-y-6">
                {/* Control Bar: Filters & Quick Actions */}
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  {/* Filter Group */}
                  <div className="flex flex-wrap items-center gap-2 p-2 bg-card border rounded-xl shadow-xs">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="gap-2 text-xs font-medium h-8 px-2.5">
                          <Filter className="size-3.5 text-muted-foreground" />
                          <span className="text-muted-foreground">Mine:</span> {selectedMine} <ChevronDown className="size-3 text-muted-foreground" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-56">
                        <DropdownMenuLabel>Filter by Mine Site</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {["All Mines", "Jharia Mine", "Kusunda Mine", "Moonidih Mine", "Karkali Mine", "Raniganj South", "Singrauli North"].map((m) => (
                          <DropdownMenuItem key={m} onClick={() => setSelectedMine(m)}>
                            <Check className={cn("mr-2 size-4 text-primary", selectedMine === m ? "opacity-100" : "opacity-0")} />
                            {m}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="gap-2 text-xs font-medium h-8 px-2.5">
                          <Filter className="size-3.5 text-muted-foreground" />
                          <span className="text-muted-foreground">Risk Level:</span> {selectedRisk} <ChevronDown className="size-3 text-muted-foreground" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-48">
                        <DropdownMenuLabel>Filter by Risk Level</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {["All", "LOW", "MEDIUM", "HIGH", "CRITICAL"].map((r) => (
                          <DropdownMenuItem key={r} onClick={() => setSelectedRisk(r)}>
                            <Check className={cn("mr-2 size-4 text-primary", selectedRisk === r ? "opacity-100" : "opacity-0")} />
                            {r}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="gap-2 text-xs font-medium h-8 px-2.5">
                          <Filter className="size-3.5 text-muted-foreground" />
                          <span className="text-muted-foreground">Compliance:</span> {selectedCompliance} <ChevronDown className="size-3 text-muted-foreground" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-52">
                        <DropdownMenuLabel>Filter by Compliance</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {["All", "High Compliance (>85%)", "Moderate (70-85%)", "Low Compliance (<70%)"].map((c) => (
                          <DropdownMenuItem key={c} onClick={() => setSelectedCompliance(c)}>
                            <Check className={cn("mr-2 size-4 text-primary", selectedCompliance === c ? "opacity-100" : "opacity-0")} />
                            {c}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="gap-2 text-xs font-medium h-8 px-2.5">
                          <Filter className="size-3.5 text-muted-foreground" />
                          <span className="text-muted-foreground">Status:</span> {selectedInspectionStatus} <ChevronDown className="size-3 text-muted-foreground" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-52">
                        <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {["All", "Operational", "Attention Required", "Critical Review"].map((s) => (
                          <DropdownMenuItem key={s} onClick={() => setSelectedInspectionStatus(s)}>
                            <Check className={cn("mr-2 size-4 text-primary", selectedInspectionStatus === s ? "opacity-100" : "opacity-0")} />
                            {s}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="gap-2 text-xs font-medium h-8 px-2.5">
                          <CalendarDays className="size-3.5 text-muted-foreground" />
                          <span className="text-muted-foreground">Date Range:</span> {range} <ChevronDown className="size-3 text-muted-foreground" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-48">
                        <DropdownMenuLabel>Date Horizon</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {["Today", "7 Days", "30 Days", "Custom"].map((d) => (
                          <DropdownMenuItem key={d} onClick={() => setRange(d)}>
                            <Check className={cn("mr-2 size-4 text-primary", range === d ? "opacity-100" : "opacity-0")} />
                            {d}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-muted-foreground hover:text-foreground h-8 px-2.5" onClick={resetFilters}>
                      <RefreshCcw className="size-3.5" /> Reset Filters
                    </Button>
                  </div>

                  {/* Quick Actions */}
                  <div className="flex flex-wrap items-center gap-2.5">
                    {quickActions.map(({ label, icon: Icon }, index) => (
                      <Button
                        key={label}
                        size="sm"
                        variant={index === 0 ? "default" : "outline"}
                        className="gap-2 h-9 px-3.5 shadow-xs text-xs font-semibold cursor-pointer"
                        onClick={() => handleSelectTab(quickActionMap[label] || "Dashboard")}
                      >
                        <Icon className="size-3.5" /> {label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* KPI Metrics */}
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
                  {kpis.map((kpi) => (
                    <article key={kpi.label} className={cn("dashboard-card kpi-card p-4 sm:p-5", `kpi-${kpi.tone}`)}>
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{kpi.label}</p>
                        <CircleDot className="size-3 text-current" />
                      </div>
                      <div className="mt-3 flex items-end justify-between gap-2">
                        <strong className="font-display text-3xl font-bold leading-none">{kpi.value}</strong>
                        <span className="text-xs font-medium text-muted-foreground">{kpi.note}</span>
                      </div>
                      {typeof kpi.progress === "number" && <ProgressBar value={kpi.progress} tone="safe" className="mt-3" />}
                    </article>
                  ))}
                </div>

                {/* Main Command Overview Grid */}
                <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)]">
                  <Panel title="Mine Health Overview" icon={Mountain} action="View all mines" onAction={() => handleSelectTab("Mines")}>
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <div className="dashboard-search flex h-9 flex-1 items-center gap-2 rounded-lg border bg-background px-3">
                        <Search className="size-4 text-muted-foreground" />
                        <input
                          aria-label="Search mines"
                          placeholder="Search mine by name or location..."
                          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                          onChange={(e) => setSelectedMine(e.target.value || "All Mines")}
                        />
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="gap-2">
                            Mine: {selectedMine} <ChevronDown className="size-3 text-muted-foreground" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-52">
                          <DropdownMenuLabel>Mine Site Filter</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {["All Mines", "Jharia", "Kusunda", "Moonidih", "Karkali"].map((m) => (
                            <DropdownMenuItem key={m} onClick={() => setSelectedMine(m)}>
                              <Check className={cn("mr-2 size-4 text-primary", selectedMine === m ? "opacity-100" : "opacity-0")} />
                              {m}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="gap-2">
                            Risk: {selectedRisk} <ChevronDown className="size-3 text-muted-foreground" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-44">
                          <DropdownMenuLabel>Risk Level</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {["All", "LOW", "MEDIUM", "HIGH", "CRITICAL"].map((r) => (
                            <DropdownMenuItem key={r} onClick={() => setSelectedRisk(r)}>
                              <Check className={cn("mr-2 size-4 text-primary", selectedRisk === r ? "opacity-100" : "opacity-0")} />
                              {r}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="gap-2">
                            Status: {selectedInspectionStatus} <ChevronDown className="size-3 text-muted-foreground" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-48">
                          <DropdownMenuLabel>Operational Status</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {["All", "Operational", "Attention Required", "Critical Review"].map((s) => (
                            <DropdownMenuItem key={s} onClick={() => setSelectedInspectionStatus(s)}>
                              <Check className={cn("mr-2 size-4 text-primary", selectedInspectionStatus === s ? "opacity-100" : "opacity-0")} />
                              {s}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="hidden overflow-x-auto xl:block">
                      <table className="dashboard-table min-w-full">
                        <thead className="sticky top-0 bg-card">
                          <tr>
                            {["Mine", "Location", "Compliance", "Open Issues", "Risk Level", "Last Inspection", "Status", "Action"].map((heading) => (
                              <th key={heading}>
                                <Button variant="ghost" size="sm" className="h-auto gap-1 px-0 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground hover:bg-transparent">
                                  {heading} {heading !== "Action" && <ArrowUpDown className="size-3" />}
                                </Button>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {filteredOverviewMines.map((mine) => (
                            <tr key={mine.mine}>
                              <td className="font-semibold">{mine.mine}</td>
                              <td>{mine.location}</td>
                              <td>
                                <div className="flex min-w-32 items-center gap-2">
                                  <span className="w-10 font-semibold">{mine.compliance}%</span>
                                  <ProgressBar value={mine.compliance} tone={mine.tone} />
                                </div>
                              </td>
                              <td>{mine.issues}</td>
                              <td><StatusBadge tone={mine.tone}>{mine.risk}</StatusBadge></td>
                              <td>{mine.inspection}</td>
                              <td><StatusBadge tone={mine.status.includes("Operational") ? "low" : mine.tone}>{mine.status}</StatusBadge></td>
                              <td>
                                <Button variant="ghost" size="sm" className="gap-1 text-primary" onClick={() => handleSelectTab("Mines")}>
                                  View Details <ArrowRight className="size-3" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <PaginationSummary />
                    </div>
                    <div className="space-y-3 xl:hidden">
                      {mines.map((mine) => (
                        <MobileMineCard key={mine.mine} mine={mine} />
                      ))}
                    </div>
                  </Panel>

                  <Panel title="Requires Immediate Attention" icon={AlertTriangle} tone="critical" action="Review queue" onAction={() => handleSelectTab("Incidents")}>
                    <div className="space-y-3">
                      {criticalActions.map((item) => (
                        <article key={item.issue} className="rounded-lg border bg-background p-3 transition-colors hover:bg-muted/50">
                          <div className="flex items-start gap-3">
                            <StatusDot tone={item.tone} />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <StatusBadge tone={item.tone}>{item.level}</StatusBadge>
                                <span className="text-xs text-muted-foreground">{item.time}</span>
                              </div>
                              <h3 className="mt-2 text-sm font-semibold">{item.issue}</h3>
                              <p className="mt-1 text-xs text-muted-foreground">{item.mine} · Assigned officer {item.officer}</p>
                            </div>
                            <Button variant="outline" size="sm" className="gap-1" onClick={() => handleSelectTab("Incidents")}>
                              Review <ArrowRight className="size-3" />
                            </Button>
                          </div>
                        </article>
                      ))}
                    </div>
                  </Panel>
                </div>

                <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(340px,0.75fr)]">
                  <Panel title="AI Risk Intelligence" icon={BrainCircuit} action="Open analysis" onAction={() => handleSelectTab("Risk Intelligence")}>
                    <div className="grid gap-4 lg:grid-cols-3">
                      <div className="rounded-lg border bg-background p-4">
                        <div className="mb-4 flex items-center justify-between">
                          <h3 className="text-sm font-semibold">Risk Distribution</h3>
                          <span className="text-xs text-muted-foreground">All mines</span>
                        </div>
                        <div className="risk-donut mx-auto"><span>119<br /><small>events</small></span></div>
                        <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                          <LegendItem tone="low" label="Low" value="48%" />
                          <LegendItem tone="medium" label="Medium" value="25%" />
                          <LegendItem tone="high" label="High" value="19%" />
                          <LegendItem tone="critical" label="Critical" value="8%" />
                        </div>
                      </div>

                      <div className="rounded-lg border bg-background p-4">
                        <div className="mb-4 flex items-center justify-between">
                          <h3 className="text-sm font-semibold">Risk Trend</h3>
                          <div className="flex rounded-md border p-1">
                            {["7D", "30D", "90D"].map((item, index) => (
                              <span key={item} className={cn("rounded px-2 py-1 text-[10px] font-semibold", index === 1 && "bg-primary text-primary-foreground")}>{item}</span>
                            ))}
                          </div>
                        </div>
                        <TrendChart values={trendValues} />
                        <div className="mt-3 flex justify-between text-[10px] text-muted-foreground"><span>15 Sep</span><span>21 Sep</span></div>
                      </div>

                      <div className="rounded-lg border bg-background p-4">
                        <h3 className="mb-4 text-sm font-semibold">Risk Categories</h3>
                        <div className="space-y-3">
                          {riskCategories.map(([label, value]) => (
                            <div key={label}>
                              <div className="mb-1 flex justify-between text-xs"><span>{label}</span><span className="font-semibold">{value}%</span></div>
                              <ProgressBar value={value} tone={value > 84 ? "critical" : value > 69 ? "warning" : "ai"} />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </Panel>

                  <Panel title="AI Executive Insight" icon={Bot} tone="ai" action="View AI Analysis" onAction={() => handleSelectTab("Risk Intelligence")}>
                    <div className="dashboard-ai-card rounded-lg border p-5">
                      <div className="flex items-center gap-3">
                        <div className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary"><BrainCircuit className="size-5" /></div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Operational Intelligence</p>
                          <h3 className="mt-1 font-display text-lg font-semibold">3 mines require attention today.</h3>
                        </div>
                      </div>
                      <ul className="mt-4 space-y-3 text-sm leading-6 text-muted-foreground">
                        <li>Jharia Mine shows an increase in slope-related risk over the last 7 days.</li>
                        <li>12 corrective actions are overdue across 4 mines.</li>
                        <li>Kusunda compliance rate is trending below the operational threshold.</li>
                      </ul>
                      <Button className="mt-5 w-full gap-2" size="sm" onClick={() => handleSelectTab("Risk Intelligence")}>
                        View AI Analysis <ArrowRight />
                      </Button>
                    </div>
                  </Panel>
                </div>

                <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                  <Panel title="Compliance Intelligence" icon={ShieldCheck} action="Open compliance" onAction={() => handleSelectTab("Compliance")}>
                    <div className="grid gap-4 md:grid-cols-[180px_minmax(0,1fr)]">
                      <div className="rounded-lg border bg-background p-4 text-center">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Overall Compliance</p>
                        <strong className="mt-4 block font-display text-5xl font-semibold">82%</strong>
                        <ProgressBar value={82} tone="safe" className="mt-4" />
                      </div>
                      <div className="rounded-lg border bg-background p-4">
                        <div className="space-y-3">
                          {complianceItems.map(([label, value]) => (
                            <div key={label}>
                              <div className="mb-1 flex justify-between text-sm"><span>{label}</span><span className="font-semibold">{value}%</span></div>
                              <ProgressBar value={value} tone={value < 70 ? "warning" : "safe"} />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                      {complianceCounts.map(([label, value, tone]) => (
                        <div key={label} className={cn("rounded-lg border bg-background p-3", `metric-${tone}`)}>
                          <p className="text-xs text-muted-foreground">{label}</p>
                          <strong className="mt-1 block font-display text-2xl">{value}</strong>
                        </div>
                      ))}
                    </div>
                  </Panel>

                  <Panel title="Live Mine Risk Map" icon={MapPinned} action="Open Full GIS" onAction={() => handleSelectTab("GIS Map")}>
                    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_180px]">
                      <div className="dashboard-map min-h-72 rounded-lg border">
                        <span className="map-boundary boundary-one" />
                        <span className="map-boundary boundary-two" />
                        <MapMarker tone="low" label="Jharia" className="left-[25%] top-[34%]" />
                        <MapMarker tone="high" label="Kusunda" className="left-[54%] top-[46%]" />
                        <MapMarker tone="critical" label="Karkali" className="left-[70%] top-[62%]" />
                        <MapMarker tone="medium" label="Moonidih" className="left-[38%] top-[68%]" />
                        <span className="field-team-marker left-[48%] top-[28%]" />
                        <span className="field-team-marker left-[62%] top-[76%]" />
                      </div>
                      <div className="space-y-3 text-sm">
                        <LegendItem tone="low" label="Low Risk" value="7 zones" />
                        <LegendItem tone="medium" label="Medium Risk" value="5 zones" />
                        <LegendItem tone="high" label="High Risk" value="3 zones" />
                        <LegendItem tone="critical" label="Critical" value="1 zone" />
                        <div className="rounded-lg border bg-background p-3 text-xs text-muted-foreground">
                          Mine boundaries, inspection locations, incident points and active field teams are visible.
                        </div>
                        <Button variant="outline" size="sm" className="w-full gap-2" onClick={() => handleSelectTab("GIS Map")}>
                          Open Full GIS <ArrowRight />
                        </Button>
                      </div>
                    </div>
                  </Panel>
                </div>

                <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
                  <Panel title="Inspection Activity" icon={ClipboardCheck} action="View inspections" onAction={() => handleSelectTab("Inspections")}>
                    <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
                      <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
                        {inspectionMetrics.map(([label, value]) => (
                          <div key={label} className="rounded-lg border bg-background p-3">
                            <p className="text-xs text-muted-foreground">{label}</p>
                            <strong className="mt-1 block font-display text-2xl">{value}</strong>
                          </div>
                        ))}
                      </div>
                      <div className="rounded-lg border bg-background p-4">
                        <ActivityBars values={activityBars} />
                        <h3 className="mt-4 text-sm font-semibold">Recent Inspections</h3>
                        <CompactTable
                          headers={["Date", "Mine", "Inspector", "Category", "Result", "Risk", "Status"]}
                          rows={inspectionRows}
                        />
                      </div>
                    </div>
                  </Panel>

                  <Panel title="Live Field Operations" icon={Activity} action="Open field view" onAction={() => handleSelectTab("Inspections")}>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {[
                        ["Active Inspectors", "12"],
                        ["Inspections Today", "26"],
                        ["GPS Reports", "21"],
                        ["Pending Uploads", "3"],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-lg border bg-background p-3">
                          <p className="text-[11px] text-muted-foreground">{label}</p>
                          <strong className="mt-1 block font-display text-2xl">{value}</strong>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 space-y-2">
                      {fieldTeams.map(([name, mine, task]) => (
                        <div key={name} className="flex items-center gap-3 rounded-lg border bg-background p-3">
                          <div className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary"><MapPin className="size-4" /></div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold">{name}</p>
                            <p className="truncate text-xs text-muted-foreground">{mine} · {task}</p>
                          </div>
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-safe"><span className="size-2 rounded-full bg-current" /> Active</span>
                        </div>
                      ))}
                    </div>
                  </Panel>
                </div>

                <div className="grid gap-4 xl:grid-cols-[minmax(340px,0.7fr)_minmax(0,1.3fr)]">
                  <Panel title="AI Document Intelligence" icon={FileSearch} action="Review AI Findings" onAction={() => handleSelectTab("Documents")}>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        ["Documents Processed", "1,284"],
                        ["Pending Review", "17"],
                        ["AI Findings", "64"],
                        ["Compliance Matches", "48"],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-lg border bg-background p-3">
                          <p className="text-[11px] text-muted-foreground">{label}</p>
                          <strong className="mt-1 block font-display text-2xl">{value}</strong>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 rounded-lg border border-primary/30 bg-primary/5 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Recent AI finding</p>
                      <p className="mt-2 text-sm font-medium">Safety audit report contains 3 potential compliance gaps.</p>
                      <Button className="mt-4 gap-2" size="sm" variant="outline" onClick={() => handleSelectTab("Documents")}>
                        Review AI Findings <ArrowRight />
                      </Button>
                    </div>
                  </Panel>

                  <Panel title="Incident & Corrective Action" icon={AlertTriangle} action="View incidents" onAction={() => handleSelectTab("Incidents")}>
                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                      {incidentMetrics.map(([label, value], index) => (
                        <div key={label} className={cn("rounded-lg border bg-background p-3", index === 3 && "metric-critical")}>
                          <p className="text-xs text-muted-foreground">{label}</p>
                          <strong className="mt-1 block font-display text-2xl">{value}</strong>
                        </div>
                      ))}
                    </div>
                    <h3 className="mt-4 text-sm font-semibold">Recent Incidents</h3>
                    <CompactTable headers={["Incident", "Mine", "Severity", "Date", "Status", "Owner"]} rows={incidents} />
                  </Panel>
                </div>

                <Panel title="Alerts & Notifications" icon={Bell} action="Notification settings" onAction={() => handleSelectTab("Alerts")}>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    {alerts.map(([level, message, mine, tone]) => (
                      <article key={message} className="rounded-lg border bg-background p-4">
                        <div className="flex items-center gap-2">
                          <StatusDot tone={tone} />
                          <StatusBadge tone={tone}>{level}</StatusBadge>
                        </div>
                        <h3 className="mt-3 text-sm font-semibold">{message}</h3>
                        <p className="mt-1 text-xs text-muted-foreground">{mine}</p>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleSelectTab("Alerts")}>Acknowledge</Button>
                          <Button variant="outline" size="sm" onClick={() => handleSelectTab("Alerts")}>Assign</Button>
                          <Button variant="ghost" size="sm" className="text-primary" onClick={() => handleSelectTab("Alerts")}>View Details</Button>
                        </div>
                      </article>
                    ))}
                  </div>
                </Panel>
              </div>
            )}
          </section>
          <AskNetraFloating />
        </div>
      </div>
    </main>
  );
}

function SidebarGroup({
  title,
  items,
  collapsed,
  activeTab,
  onSelectTab,
}: {
  title: string;
  items: Array<{ label: string; icon: LucideIcon }>;
  collapsed: boolean;
  activeTab: string;
  onSelectTab: (label: string) => void;
}) {
  return (
    <div>
      {!collapsed && <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--dashboard-sidebar-muted)]">{title}</p>}
      <div className="space-y-1">
        {items.map(({ label, icon: Icon }) => (
          <button
            key={label}
            onClick={() => onSelectTab(label)}
            className={cn("sidebar-link w-full text-left cursor-pointer", activeTab === label && "active", collapsed && "justify-center px-2")}
            aria-label={label}
            title={collapsed ? label : undefined}
          >
            <Icon className="size-4" />
            {!collapsed && <span>{label}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

function FilterChip({ label, value, icon: Icon = Filter }: { label: string; value: string; icon?: LucideIcon }) {
  return (
    <Button variant="outline" size="sm" className="gap-2 bg-card">
      <Icon /> <span className="text-muted-foreground">{label}</span> {value} <ChevronDown />
    </Button>
  );
}

function Panel({
  title,
  icon: Icon,
  action,
  onAction,
  tone,
  children,
}: {
  title: string;
  icon: LucideIcon;
  action?: string;
  onAction?: () => void;
  tone?: "critical" | "ai";
  children: ReactNode;
}) {
  return (
    <section className={cn("dashboard-card overflow-hidden", tone === "critical" && "panel-critical", tone === "ai" && "panel-ai")}>
      <div className="flex min-h-12 items-center justify-between gap-3 border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <Icon className="size-4 text-primary" />
          <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
        </div>
        {action && (
          <Button variant="ghost" size="sm" onClick={onAction} className="gap-1 text-xs text-muted-foreground hover:text-primary">
            {action} <ArrowRight className="size-3" />
          </Button>
        )}
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </section>
  );
}

function ProgressBar({ value, tone = "safe", className }: { value: number; tone?: string; className?: string }) {
  return (
    <div className={cn("progress-track", className)}>
      <span className={cn("progress-fill", `progress-${tone}`)} style={{ "--progress": `${value}%` } as CSSProperties} />
    </div>
  );
}

function StatusBadge({ tone, children }: { tone: string; children: ReactNode }) {
  return <span className={cn("status-badge", `status-${tone}`)}>{children}</span>;
}

function StatusDot({ tone }: { tone: string }) {
  return <span className={cn("status-dot", `dot-${tone}`)} />;
}

function LegendItem({ tone, label, value }: { tone: string; label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-1.5 rounded-md border bg-card px-2 py-1.5 text-xs">
      <span className="flex min-w-0 items-center gap-1.5 truncate">
        <StatusDot tone={tone} />
        <span className="truncate">{label}</span>
      </span>
      <strong className="shrink-0 font-semibold">{value}</strong>
    </div>
  );
}

function TrendChart({ values }: { values: number[] }) {
  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * 100;
      const y = 100 - value;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg className="trend-chart" viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="Risk events trend">
      <polyline points="0,80 100,80" className="trend-grid-line" />
      <polyline points="0,55 100,55" className="trend-grid-line" />
      <polyline points="0,30 100,30" className="trend-grid-line" />
      <polyline points={points} className="trend-line" />
      {values.map((value, index) => {
        const x = (index / (values.length - 1)) * 100;
        const y = 100 - value;
        return <circle key={`${value}-${index}`} cx={x} cy={y} r="1.4" className="trend-point" />;
      })}
    </svg>
  );
}

function ActivityBars({ values }: { values: number[] }) {
  return (
    <div className="activity-bars" aria-label="Inspection activity chart">
      {values.map((value, index) => (
        <span key={`${value}-${index}`} style={{ "--bar": `${value}%` } as CSSProperties} />
      ))}
    </div>
  );
}

function CompactTable({ headers, rows }: { headers: readonly string[]; rows: readonly (readonly string[])[] }) {
  return (
    <div className="mt-3 overflow-x-auto">
      <table className="dashboard-table min-w-full">
        <thead>
          <tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.join("-")}>
              {row.map((cell, index) => (
                <td key={`${cell}-${index}`}>{index === 2 || index === 0 ? <span className="font-medium">{cell}</span> : cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PaginationSummary() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t px-2 pt-3 text-xs text-muted-foreground">
      <span>Showing 1–4 of 24 mines</span>
      <div className="flex gap-2">
        <Button variant="outline" size="sm">Previous</Button>
        <Button variant="outline" size="sm">Next</Button>
      </div>
    </div>
  );
}

function MobileMineCard({ mine }: { mine: (typeof mines)[number] }) {
  return (
    <article className="rounded-lg border bg-background p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">{mine.mine}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{mine.location} · Last inspection {mine.inspection}</p>
        </div>
        <StatusBadge tone={mine.tone}>{mine.risk}</StatusBadge>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div><p className="text-xs text-muted-foreground">Compliance</p><strong>{mine.compliance}%</strong></div>
        <div><p className="text-xs text-muted-foreground">Open Issues</p><strong>{mine.issues}</strong></div>
      </div>
      <ProgressBar value={mine.compliance} tone={mine.tone} className="mt-3" />
      <div className="mt-4 flex items-center justify-between gap-3">
        <StatusBadge tone={mine.status.includes("Operational") ? "low" : mine.tone}>{mine.status}</StatusBadge>
        <Button variant="outline" size="sm" className="gap-1">View Details <ArrowRight className="size-3" /></Button>
      </div>
    </article>
  );
}

function MapMarker({ tone, label, className }: { tone: string; label: string; className: string }) {
  return (
    <span className={cn("map-marker", `map-${tone}`, className)}>
      <span />
      <small>{label}</small>
    </span>
  );
}
