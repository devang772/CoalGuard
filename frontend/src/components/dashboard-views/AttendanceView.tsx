import React, { useCallback, useEffect, useState } from "react";
import { RefreshCw, Users, UserCheck, AlertTriangle, CheckCircle, XCircle, Calendar, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAttendanceApi, getAttendanceSummaryApi, type Page, type Row } from "@/lib/api";

const fmt = (v: unknown) => (v === null || v === undefined || v === "" ? "—" : String(v));
const ist = (v: unknown) => {
  try {
    return new Date(String(v)).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  } catch {
    return fmt(v);
  }
};

const getTodayIstStr = () => {
  try {
    return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
};

const getYesterdayIstStr = () => {
  try {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  } catch {
    return "";
  }
};

function SummaryCard({ label, value, sub, icon, active, onClick }: { label: string; value: string | number; sub?: string; icon: React.ReactNode; active?: boolean; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className={`dashboard-card p-4 transition-all ${onClick ? "cursor-pointer hover:border-primary/50" : ""} ${active ? "ring-2 ring-primary border-primary" : ""}`}
    >
      <div className="flex items-center justify-between text-muted-foreground mb-2">
        <span className="text-xs font-semibold uppercase tracking-wider">{label}</span>
        {icon}
      </div>
      <p className="font-display text-3xl font-bold">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

export function AttendanceView() {
  const todayIst = getTodayIstStr();
  const yesterdayIst = getYesterdayIstStr();

  const [page, setPage] = useState<Page<Row> | null>(null);
  const [summary, setSummary] = useState<Row | null>(null);
  const [date, setDate] = useState(todayIst);
  const [allDates, setAllDates] = useState(false);
  const [validFilter, setValidFilter] = useState<string>(""); // "", "true", "false"
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string | boolean | undefined> = {};
      if (allDates) {
        params.all_dates = true;
      } else {
        params.date = date;
      }
      if (validFilter === "true") params.valid = true;
      if (validFilter === "false") params.valid = false;

      const [att, sum] = await Promise.all([
        getAttendanceApi(params as any),
        getAttendanceSummaryApi(allDates ? {} : { date }),
      ]);
      setPage(att);
      setSummary(sum);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load attendance");
    } finally {
      setLoading(false);
    }
  }, [date, allDates, validFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const items = page?.items ?? [];
  const sum = summary as Record<string, unknown> | null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight">Attendance Monitor</h2>
          <p className="text-sm text-muted-foreground">Real-time worker attendance records, geofenced checks, and invalid attempts from backend.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Date Chips */}
          <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-lg border">
            <button
              onClick={() => {
                setAllDates(false);
                setDate(todayIst);
              }}
              className={`text-xs px-2.5 py-1 rounded-md font-semibold transition-all ${!allDates && date === todayIst ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              Today (IST)
            </button>
            <button
              onClick={() => {
                setAllDates(false);
                setDate(yesterdayIst);
              }}
              className={`text-xs px-2.5 py-1 rounded-md font-semibold transition-all ${!allDates && date === yesterdayIst ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              Yesterday
            </button>
            <button
              onClick={() => {
                setAllDates(true);
              }}
              className={`text-xs px-2.5 py-1 rounded-md font-semibold transition-all ${allDates ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              All Recent Days
            </button>
          </div>

          {!allDates && (
            <div className="flex items-center gap-1.5">
              <Calendar className="size-4 text-muted-foreground" />
              <input
                type="date"
                value={date}
                onChange={(e) => {
                  setAllDates(false);
                  setDate(e.target.value);
                }}
                className="rounded-md border bg-background px-3 py-1.5 text-sm"
              />
            </div>
          )}

          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-1">
            <RefreshCw className="size-4" /> Refresh
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      {sum && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard label="Present (Valid)" value={fmt(sum.present)} icon={<Users className="size-4 text-emerald-500" />} />
          <SummaryCard
            label="Invalid Records"
            value={fmt(sum.invalid)}
            icon={<AlertTriangle className="size-4 text-amber-500" />}
            sub="Outside boundary / selfie checks failed"
            active={validFilter === "false"}
            onClick={() => setValidFilter(validFilter === "false" ? "" : "false")}
          />
          <SummaryCard label="No Gate Entry" value={fmt(sum.without_gate_entry)} icon={<UserCheck className="size-4 text-muted-foreground" />} />
          <SummaryCard label="Expired Training" value={fmt(sum.expired_training)} icon={<AlertTriangle className="size-4 text-red-500" />} />
        </div>
      )}

      {/* Validation Status Filter Bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-bold text-muted-foreground flex items-center gap-1">
          <Filter className="size-3.5" /> Status Filter:
        </span>
        {[
          { key: "", label: "All Records" },
          { key: "true", label: "Valid Only ✓" },
          { key: "false", label: "Invalid Attempts Only ✗" },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setValidFilter(f.key)}
            className={`rounded-full text-xs px-3 py-1 border font-medium transition-all ${
              validFilter === f.key ? "bg-primary text-primary-foreground border-primary" : "border-muted bg-muted/30 hover:bg-muted text-muted-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && (
        <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive flex justify-between items-center">
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={load}>
            Retry
          </Button>
        </div>
      )}

      {/* Attendance Log Table */}
      <div className="dashboard-card overflow-hidden border rounded-xl">
        <div className="overflow-x-auto">
          <table className="dashboard-table min-w-full text-left">
            <thead>
              <tr className="bg-muted/40 border-b text-xs font-bold uppercase text-muted-foreground">
                <th className="p-3">#</th>
                <th className="p-3">Worker Name</th>
                <th className="p-3">Contractor</th>
                <th className="p-3">Mine Site</th>
                <th className="p-3">Timestamp (IST)</th>
                <th className="p-3">Source</th>
                <th className="p-3">Status</th>
                <th className="p-3">Details / Rejection Reason</th>
                <th className="p-3">Gate Entry</th>
              </tr>
            </thead>
            <tbody className="divide-y text-sm">
              {loading ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-muted-foreground">
                    Loading attendance records…
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-muted-foreground">
                    No attendance records found for this scope.
                  </td>
                </tr>
              ) : (
                items.map((row, i) => {
                  const isValid = Boolean(row.valid);
                  return (
                    <tr key={fmt(row.id)} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3 font-mono text-xs text-muted-foreground">{i + 1}</td>
                      <td className="p-3 font-semibold">{fmt(row.worker_name)}</td>
                      <td className="p-3 text-xs text-muted-foreground">{fmt(row.contractor_name)}</td>
                      <td className="p-3 font-medium">{fmt(row.mine_name)}</td>
                      <td className="p-3 text-xs font-mono">{ist(row.time)}</td>
                      <td className="p-3">
                        <span className="text-xs uppercase font-bold bg-muted px-2 py-0.5 rounded border">{fmt(row.source)}</span>
                      </td>
                      <td className="p-3">
                        {isValid ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 px-2 py-0.5 rounded">
                            <CheckCircle className="size-3.5" /> Valid ✓
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 dark:bg-red-950/40 border border-red-300 px-2 py-0.5 rounded">
                            <XCircle className="size-3.5" /> Invalid ✗
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-xs">
                        {!isValid && row.reason ? (
                          <span className="text-red-600 dark:text-red-400 font-medium leading-tight block max-w-md">
                            ⚠️ {fmt(row.reason)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="p-3">
                        {row.gate_entry ? (
                          <span className="text-emerald-600 font-semibold text-xs">✓ Yes</span>
                        ) : (
                          <span className="text-muted-foreground text-xs">No</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {page && (
        <div className="text-sm font-semibold text-muted-foreground">
          Total Records Displayed: <strong>{page.total}</strong> {allDates ? "(Across All Recent Days)" : `(For Date: ${date})`}
        </div>
      )}
    </div>
  );
}
