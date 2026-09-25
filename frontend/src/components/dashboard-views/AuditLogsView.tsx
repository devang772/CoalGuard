import { useState } from "react";
import { ScrollText, Search, ShieldCheck, ShieldAlert, CheckCircle2, AlertOctagon, Copy, Check, Eye } from "lucide-react";
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

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
            Tamper-Proof Audit & SHA-256 Chain Verification
            <ShieldCheck size={22} className="text-emerald-400" />
          </h2>
          <p className="text-sm text-slate-400">
            Cryptographic SHA-256 hash-chained immutable audit ledger for statutory governance.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Dev Demo Toggle Switch */}
          <label className="flex items-center gap-2 text-xs font-mono text-slate-300 bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-lg cursor-pointer">
            <input
              type="checkbox"
              checked={isChainBroken}
              onChange={(e) => setChainBroken(e.target.checked)}
              className="accent-rose-500 rounded cursor-pointer"
            />
            <span>Simulate Chain Break (Demo)</span>
          </label>
        </div>
      </div>

      {/* Verify Chain Hero Card */}
      <div className={`p-6 rounded-2xl border transition-all ${
        isChainBroken
          ? "bg-rose-950/40 border-rose-500/80 shadow-2xl shadow-rose-500/10"
          : "bg-slate-900 border-slate-700/80 shadow-xl"
      }`}>
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`size-14 rounded-2xl flex items-center justify-center font-bold text-2xl border ${
              isChainBroken
                ? "bg-rose-950 border-rose-500 text-rose-400 animate-pulse"
                : "bg-emerald-950/80 border-emerald-500/50 text-emerald-400"
            }`}>
              {isChainBroken ? <AlertOctagon size={32} /> : <ShieldCheck size={32} />}
            </div>
            <div>
              <h3 className="font-display font-bold text-lg text-slate-100">
                {isChainBroken
                  ? "CRITICAL ALERT: Audit Hash Chain Tampered!"
                  : "Cryptographic SHA-256 Chain Status: Verified"}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {isChainBroken
                  ? "Hash mismatch found at Block #4521 (CAPA-88). Database record altered directly outside the system."
                  : "All 12,487 state transition records cryptographically linked with SHA-256 parent hash signatures."}
              </p>
            </div>
          </div>
          <Button
            onClick={handleVerify}
            disabled={isVerifying}
            className={`font-bold text-xs font-mono px-5 py-2.5 rounded-xl transition-all ${
              isChainBroken
                ? "bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/30"
                : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/30"
            }`}
          >
            {isVerifying ? "Hashing Blocks..." : "Verify Chain Integrity Now"}
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search audit trail by event, user, record ID or hash signature..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 pl-9 pr-3 py-2 text-xs text-slate-200 outline-none placeholder:text-slate-500 focus:border-amber-500"
          />
        </div>
      </div>

      {/* Audit Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-mono text-[11px] uppercase">
              <tr>
                <th className="p-3">Log ID</th>
                <th className="p-3">Timestamp</th>
                <th className="p-3">User Identity</th>
                <th className="p-3">Event Action</th>
                <th className="p-3">SHA-256 Hash</th>
                <th className="p-3">Diff View</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {auditLogsData.map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/50">
                  <td className="p-3 font-mono font-bold text-amber-400">{log.id}</td>
                  <td className="p-3 font-mono text-slate-400">{log.timestamp}</td>
                  <td className="p-3 font-medium text-slate-100">{log.user} ({log.role})</td>
                  <td className="p-3 font-medium text-slate-200">{log.event}</td>
                  <td className="p-3 font-mono text-[10px] text-slate-400">
                    <span className="flex items-center gap-1">
                      {log.hash.substring(0, 16)}...
                      <button
                        onClick={() => copyHash(log.hash)}
                        className="hover:text-amber-400"
                      >
                        {copiedHash === log.hash ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                      </button>
                    </span>
                  </td>
                  <td className="p-3">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setSelectedLog(log)}
                      className="text-xs text-amber-400 hover:text-amber-300 gap-1 h-7"
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

      {/* JsonDiffViewer Drawer */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-display text-sm font-bold text-slate-100">
                JSON Diff Record Change — {selectedLog.id}
              </h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-slate-200 text-xs font-mono"
              >
                Close ✕
              </button>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div>
                <span className="text-rose-400 font-bold block mb-1">Before Change State:</span>
                <pre className="p-3 rounded bg-slate-950 border border-slate-800 text-rose-300 overflow-x-auto text-[11px]">
                  {JSON.stringify(selectedLog.diff.before, null, 2)}
                </pre>
              </div>
              <div>
                <span className="text-emerald-400 font-bold block mb-1">After Change State:</span>
                <pre className="p-3 rounded bg-slate-950 border border-slate-800 text-emerald-300 overflow-x-auto text-[11px]">
                  {JSON.stringify(selectedLog.diff.after, null, 2)}
                </pre>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 text-right">
              <Button size="sm" onClick={() => setSelectedLog(null)} className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs">
                Close Diff Viewer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
