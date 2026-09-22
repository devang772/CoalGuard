import { useState } from "react";
import { ScrollText, Search, Filter, Shield, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

const auditLogsData = [
  {
    id: "LOG-88491",
    timestamp: "22 Sep 2026 - 19:42:10",
    user: "Er. Rajesh Kumar",
    role: "Admin",
    event: "Modified AI Slope Sensitivity Threshold from 80% to 85%",
    ip: "192.168.1.104",
    status: "SUCCESS",
  },
  {
    id: "LOG-88490",
    timestamp: "22 Sep 2026 - 18:15:33",
    user: "Er. Vikram Sharma",
    role: "Mine Manager",
    event: "Exported DGMS Safety Audit Report for Kusunda Mine",
    ip: "192.168.1.112",
    status: "SUCCESS",
  },
  {
    id: "LOG-88489",
    timestamp: "22 Sep 2026 - 16:50:02",
    user: "System Automated Worker",
    role: "System Pipeline",
    event: "IoT Telemetry Batch Sync (1,420 sensors across 24 mines)",
    ip: "127.0.0.1 (Internal)",
    status: "SUCCESS",
  },
  {
    id: "LOG-88488",
    timestamp: "22 Sep 2026 - 14:22:45",
    user: "Er. Sneha Das",
    role: "Inspector",
    event: "Uploaded statutory document DOC-2026-904.pdf",
    ip: "192.168.1.120",
    status: "SUCCESS",
  },
  {
    id: "LOG-88487",
    timestamp: "22 Sep 2026 - 12:05:11",
    user: "Er. N. Prasad",
    role: "Auditor",
    event: "Logged Incident INC-2026-042 for Kusunda Slope Movement",
    ip: "192.168.1.118",
    status: "SUCCESS",
  },
];

export function AuditLogsView() {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredLogs = auditLogsData.filter(
    (log) =>
      log.event.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight">Security & Operations Audit Logs</h2>
          <p className="text-sm text-muted-foreground">
            Immutable log trail of all user actions, security overrides, document uploads, and system telemetry syncs.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="size-4" /> Export CSV Audit Trail
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="rounded-lg border bg-card p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search audit trail by event description, user name or log ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-md border bg-background pl-9 pr-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:border-primary"
          />
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="dashboard-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="dashboard-table min-w-full">
            <thead>
              <tr>
                <th>Log ID</th>
                <th>Timestamp</th>
                <th>User / Identity</th>
                <th>Role</th>
                <th>Action & Event Description</th>
                <th>IP Address</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-muted/30">
                  <td className="font-mono text-xs font-bold text-primary">{log.id}</td>
                  <td className="text-xs text-muted-foreground font-mono">{log.timestamp}</td>
                  <td className="font-semibold text-foreground">{log.user}</td>
                  <td className="text-xs text-muted-foreground">{log.role}</td>
                  <td className="text-xs font-medium text-foreground">{log.event}</td>
                  <td className="text-xs font-mono text-muted-foreground">{log.ip}</td>
                  <td>
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded border border-emerald-300">
                      {log.status}
                    </span>
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
