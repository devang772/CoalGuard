import { useEffect, useState } from "react";
import { Download, FileText, RefreshCw, CheckCircle, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateReportApi, getMinesApi, getReportsApi, verifyReportApi, approveReportApi, type Row } from "@/lib/api";
import { useAppStore } from "@/store/useAppStore";
import { getApiBase } from "@/lib/api";

type RowItem = Row;
const value = (item: unknown) => item === null || item === undefined || item === "" ? "—" : String(item);
const ist = (v: unknown) => { try { return new Date(String(v)).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }); } catch { return value(v); } };
const currentMonth = new Date().toISOString().slice(0, 7);

export function ReportsView() {
  const { user } = useAppStore();
  const [reports, setReports] = useState<RowItem[]>([]);
  const [mines, setMines] = useState<RowItem[]>([]);
  const [month, setMonth] = useState(currentMonth);
  const [mineId, setMineId] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [verifyFile, setVerifyFile] = useState<File | null>(null);
  const [verifyResult, setVerifyResult] = useState<Row | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [approving, setApproving] = useState<number | null>(null);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const [history, mineList] = await Promise.all([getReportsApi(), getMinesApi()]);
      setReports(history.items); setMines(mineList);
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to load reports."); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const generate = async () => {
    setCreating(true); setError(null); setNotice(null);
    try {
      const result = await generateReportApi(month, mineId ? Number(mineId) : undefined);
      setNotice(`${result.reports.length} report file(s) generated.`);
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Report generation failed."); }
    finally { setCreating(false); }
  };

  const verify = async () => {
    if (!verifyFile) return;
    setVerifying(true); setVerifyResult(null);
    try { setVerifyResult(await verifyReportApi(verifyFile) as Row); }
    catch (err) { setError(err instanceof Error ? err.message : "Verification failed."); }
    finally { setVerifying(false); }
  };

  const approve = async (id: number, decision: "approve" | "reject") => {
    setApproving(id);
    try { await approveReportApi(id, decision, decision === "reject" ? "Rejected via dashboard" : undefined); await load(); }
    catch (err) { setError(err instanceof Error ? err.message : "Approval failed."); }
    finally { setApproving(null); }
  };

  const canApprove = user && ["mine_manager", "area_gm", "subsidiary_admin", "cil_admin"].includes(user.role);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight">Compliance Reports</h2>
          <p className="text-sm text-muted-foreground">Generate, download, verify, and approve monthly compliance reports.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading} className="gap-2"><RefreshCw className="size-4" /> Refresh</Button>
      </div>

      <section className="dashboard-card grid gap-4 p-5 md:grid-cols-[1fr_1fr_auto]">
        <label className="text-sm font-medium">Report month
          <input type="month" value={month} onChange={e => setMonth(e.target.value)} className="mt-1 block w-full rounded-md border bg-background p-2" />
        </label>
        <label className="text-sm font-medium">Mine scope
          <select value={mineId} onChange={e => setMineId(e.target.value)} className="mt-1 block w-full rounded-md border bg-background p-2">
            <option value="">My current organisation scope</option>
            {mines.map(mine => <option key={value(mine.id)} value={value(mine.id)}>{value(mine.name)}</option>)}
          </select>
        </label>
        <div className="flex items-end">
          <Button className="w-full gap-2" disabled={creating || !month} onClick={() => void generate()}>
            <FileText className="size-4" />{creating ? "Generating…" : "Generate PDF + Excel"}
          </Button>
        </div>
      </section>

      {/* Verify section */}
      <section className="dashboard-card p-5 space-y-3">
        <h3 className="font-semibold text-sm flex items-center gap-2"><CheckCircle className="size-4 text-emerald-500" /> Verify Report File</h3>
        <div className="flex items-end gap-3">
          <label className="flex-1 text-sm font-medium">Upload PDF or Excel to verify
            <input type="file" accept=".pdf,.xlsx" onChange={e => setVerifyFile(e.target.files?.[0] ?? null)} className="mt-1 block w-full text-sm" />
          </label>
          <Button variant="outline" size="sm" onClick={verify} disabled={!verifyFile || verifying} className="gap-1 shrink-0">
            <Upload className="size-4" />{verifying ? "Checking…" : "Verify"}
          </Button>
        </div>
        {verifyResult && (
          <div className={`rounded-lg border p-3 text-sm ${verifyResult.match ? "border-emerald-500/30 bg-emerald-50 text-emerald-800" : "border-red-500/30 bg-red-50 text-red-800"}`}>
            {verifyResult.match ? "✓" : "✗"} {value(verifyResult.message)}
          </div>
        )}
      </section>

      {error && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}
      {notice && <p role="status" className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm text-emerald-700">{notice}</p>}

      <div className="dashboard-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="dashboard-table min-w-full">
            <thead><tr><th>Report</th><th>Scope</th><th>Month</th><th>Format</th><th>Status</th><th>Generated</th><th>File</th>{canApprove && <th>Approve</th>}</tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">Loading report history…</td></tr>
                : reports.length === 0 ? <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">No reports have been generated in this scope.</td></tr>
                : reports.map(report => (
                  <tr key={value(report.id)}>
                    <td className="font-mono text-xs font-bold text-primary">#{value(report.id)}</td>
                    <td>{value(report.scope_label)}</td>
                    <td>{value(report.month)}</td>
                    <td className="uppercase">{value(report.format)}</td>
                    <td>
                      <span className={`text-xs font-semibold ${value(report.status) === "approved" ? "text-emerald-600" : value(report.status) === "rejected" ? "text-red-600" : "text-muted-foreground"}`}>
                        {value(report.status)}
                      </span>
                      {report.approved_by_name && <p className="text-[10px] text-muted-foreground">by {value(report.approved_by_name)}</p>}
                    </td>
                    <td className="text-xs text-muted-foreground">{ist(report.created_at)}</td>
                    <td>
                      {report.url
                        ? <a href={`${getApiBase()}${String(report.url)}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"><Download className="size-3" /> Download</a>
                        : "—"}
                    </td>
                    {canApprove && (
                      <td>
                        {value(report.status) === "generated" && Number(report.generated_by) !== user?.id ? (
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline" disabled={approving === Number(report.id)} onClick={() => void approve(Number(report.id), "approve")} className="h-6 text-xs text-emerald-700">Approve</Button>
                            <Button size="sm" variant="outline" disabled={approving === Number(report.id)} onClick={() => void approve(Number(report.id), "reject")} className="h-6 text-xs text-red-700">Reject</Button>
                          </div>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </td>
                    )}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
