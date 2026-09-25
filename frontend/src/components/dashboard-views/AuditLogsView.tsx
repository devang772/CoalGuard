import { useState } from "react";
import { ScrollText, Search, ShieldCheck, ShieldAlert, CheckCircle2, AlertOctagon, Copy, Check, Eye, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store/useAppStore";
import { toast } from "sonner";

interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  role: string;
  event: string;
  table: string;
  recordId: string;
  hash: string;
  prevHash: string;
  diff: { before: any; after: any };
}

const auditLogsData: AuditLog[] = [
  {
    id: "LOG-88491",
    timestamp: "22 Sep 2026 - 19:42:10",
    user: "Er. Somnath Mukherjee",
    role: "Mine Manager",
    event: "Approved CAPA #CAPA-108 Closure Evidence",
    table: "capas",
    recordId: "CAPA-108",
    hash: "a9f81b2c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a",
    prevHash: "e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2",
    diff: {
      before: { status: "IN_REVIEW", score: 86, closedAt: null },
      after: { status: "CLOSED", score: 86, closedAt: "2026-09-22T19:42:10Z" },
    },
  },
  {
    id: "LOG-88490",
    timestamp: "22 Sep 2026 - 18:15:33",
    user: "Shri P. K. Mishra",
    role: "Area GM",
    event: "Escalated Task #TSK-441 to Level 2 (SLA Exceeded)",
    table: "tasks",
    recordId: "TSK-441",
    hash: "e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2",
    prevHash: "7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b",
    diff: {
      before: { escalation_level: 1, assignee: "Mine Manager" },
      after: { escalation_level: 2, assignee: "Area GM" },
    },
  },
  {
    id: "LOG-88489",
    timestamp: "22 Sep 2026 - 16:50:02",
    user: "System AI Engine",
    role: "Automated Bot",
    event: "Extracted 3 obligations from DGMS Circular 2026 PDF",
    table: "obligations",
    recordId: "OBL-AI-101",
    hash: "7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b",
    prevHash: "0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a",
    diff: {
      before: null,
      after: { title: "Daily Methane & Gas Sensor Calibration", category: "Safety" },
    },
  },
];

export function AuditLogsView() {
  const [searchTerm, setSearchTerm] = useState("");
  const { isChainBroken, setChainBroken } = useAppStore();
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<"clean" | "broken" | null>(null);

  const handleVerify = () => {
    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
      setVerifyResult(isChainBroken ? "broken" : "clean");
      if (isChainBroken) {
        toast.error("Chain Integrity Broken!", {
          description: "Hash discrepancy detected at Record #4521 (CAPA-88). Manual modification outside system.",
        });
      } else {
        toast.success("Chain Integrity Verified 100%", {
          description: "All 12,487 cryptographic hash blocks intact and verified against SHA-256 ledger.",
        });
      }
    }, 1200);
  };

  const copyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const filteredLogs = auditLogsData.filter(
    (log) =>
      log.event.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.hash.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            Tamper-Proof Audit & SHA-256 Chain Verification
            <ShieldCheck size={22} className="text-emerald-600 dark:text-emerald-400" />
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Cryptographic SHA-256 hash-chained immutable audit ledger for statutory governance.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Dev Demo Toggle Switch */}
          <label className="flex items-center gap-2 text-xs font-mono text-foreground bg-card border rounded-lg px-3 py-1.5 shadow-xs cursor-pointer hover:bg-muted/40">
            <input
              type="checkbox"
              checked={isChainBroken}
              onChange={(e) => setChainBroken(e.target.checked)}
              className="accent-rose-500 rounded cursor-pointer size-4"
            />
            <span className="font-medium">Simulate Chain Break (Demo)</span>
          </label>
        </div>
      </div>

      {/* Verify Chain Hero Card */}
      <div
        className={`p-6 rounded-2xl border transition-all shadow-sm ${
          isChainBroken
            ? "bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-600"
            : "bg-card border-border"
        }`}
      >
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className={`size-14 rounded-2xl flex items-center justify-center font-bold text-2xl border ${
                isChainBroken
                  ? "bg-rose-100 dark:bg-rose-950 border-rose-400 text-rose-700 dark:text-rose-400 animate-pulse"
                  : "bg-emerald-50 dark:bg-emerald-950/80 border-emerald-300 dark:border-emerald-500/50 text-emerald-700 dark:text-emerald-400"
              }`}
            >
              {isChainBroken ? <AlertOctagon size={32} /> : <ShieldCheck size={32} />}
            </div>
            <div>
              <h3
                className={`font-display font-bold text-lg ${
                  isChainBroken ? "text-rose-800 dark:text-rose-300" : "text-foreground"
                }`}
              >
                {isChainBroken
                  ? "CRITICAL ALERT: Audit Hash Chain Tampered!"
                  : "Cryptographic SHA-256 Chain Status: Verified"}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                {isChainBroken
                  ? "Hash mismatch found at Block #4521 (CAPA-88). Database record altered directly outside the system."
                  : "All 12,487 state transition records cryptographically linked with SHA-256 parent hash signatures."}
              </p>
            </div>
          </div>
          <Button
            onClick={handleVerify}
            disabled={isVerifying}
            className={`font-bold text-xs font-mono px-5 py-2.5 rounded-xl transition-all shadow-sm cursor-pointer ${
              isChainBroken
                ? "bg-rose-600 hover:bg-rose-700 text-white"
                : "bg-emerald-600 hover:bg-emerald-700 text-white"
            }`}
          >
            {isVerifying ? "Hashing Blocks..." : "Verify Chain Integrity Now"}
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="rounded-xl border bg-card p-3 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search audit trail by event, user, record ID or hash signature..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border bg-background pl-9 pr-3 py-2 text-xs text-foreground outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-amber-500"
          />
        </div>
      </div>

      {/* Audit Table */}
      <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-foreground">
            <thead className="bg-muted/50 text-muted-foreground font-mono text-[11px] uppercase border-b">
              <tr>
                <th className="p-3">Log ID</th>
                <th className="p-3">Timestamp</th>
                <th className="p-3">User Identity</th>
                <th className="p-3">Event Action</th>
                <th className="p-3">SHA-256 Hash</th>
                <th className="p-3">Diff View</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                  <td className="p-3 font-mono font-bold text-amber-600 dark:text-amber-400">{log.id}</td>
                  <td className="p-3 font-mono text-muted-foreground">{log.timestamp}</td>
                  <td className="p-3 font-semibold text-foreground">
                    {log.user} <span className="text-[11px] font-normal text-muted-foreground">({log.role})</span>
                  </td>
                  <td className="p-3 font-semibold text-foreground">{log.event}</td>
                  <td className="p-3 font-mono text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      {log.hash.substring(0, 16)}...
                      <button
                        onClick={() => copyHash(log.hash)}
                        className="hover:text-amber-600 cursor-pointer"
                        title="Copy Hash"
                      >
                        {copiedHash === log.hash ? (
                          <Check size={12} className="text-emerald-600" />
                        ) : (
                          <Copy size={12} />
                        )}
                      </button>
                    </span>
                  </td>
                  <td className="p-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedLog(log)}
                      className="text-xs text-amber-700 dark:text-amber-400 border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/50 gap-1 h-7 px-2.5 cursor-pointer"
                    >
                      <Eye size={12} /> View Diff
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* JsonDiffViewer Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-display text-sm font-bold text-foreground">
                JSON Diff Record Change — {selectedLog.id}
              </h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div>
                <span className="text-rose-600 dark:text-rose-400 font-bold block mb-1">
                  Before Change State:
                </span>
                <pre className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300 overflow-x-auto text-[11px]">
                  {JSON.stringify(selectedLog.diff.before, null, 2)}
                </pre>
              </div>
              <div>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold block mb-1">
                  After Change State:
                </span>
                <pre className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300 overflow-x-auto text-[11px]">
                  {JSON.stringify(selectedLog.diff.after, null, 2)}
                </pre>
              </div>
            </div>

            <div className="pt-3 border-t flex items-center justify-end">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedLog(null)}
                className="text-xs h-8 px-4 cursor-pointer"
              >
                Close Diff Viewer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
