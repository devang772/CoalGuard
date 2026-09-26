import { useCallback, useEffect, useState } from "react";
import { RefreshCcw } from "lucide-react";
import { apiRequest, type Page } from "@/lib/api";
import { Button } from "@/components/ui/button";

type Data = Record<string, unknown> | Record<string, unknown>[] | Page<Record<string, unknown>>;
const value = (item: unknown) => item === null || item === undefined ? "—" : typeof item === "object" ? JSON.stringify(item) : String(item);
function rowsOf(data: Data): Record<string, unknown>[] { return Array.isArray(data) ? data : "items" in data && Array.isArray(data.items) ? data.items : [data]; }
export function LiveDataView({ title, endpoint, description }: { title: string; endpoint: string; description: string }) {
  const [data, setData] = useState<Data | null>(null); const [error, setError] = useState<string | null>(null); const [loading, setLoading] = useState(true);
  const load = useCallback(async () => { setLoading(true); setError(null); try { setData(await apiRequest<Data>(endpoint)); } catch (e) { setData(null); setError(e instanceof Error ? e.message : "API request failed"); } finally { setLoading(false); } }, [endpoint]);
  useEffect(() => { void load(); }, [load]);
  const rows = data ? rowsOf(data) : []; const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))].slice(0, 8);
  return <section className="dashboard-card overflow-hidden"><div className="flex items-center justify-between gap-4 border-b p-5"><div><h2 className="font-display text-xl font-semibold">{title}</h2><p className="mt-1 text-sm text-muted-foreground">{description}</p></div><Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}><RefreshCcw className="mr-2 size-4" />Refresh</Button></div><div className="p-5">{loading && <p className="text-muted-foreground">Loading from the backend…</p>}{error && <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">Backend data unavailable: {error}</p>}{!loading && !error && rows.length === 0 && <p className="text-muted-foreground">The backend returned no records.</p>}{!loading && !error && rows.length > 0 && <div className="overflow-x-auto"><table className="dashboard-table min-w-full"><thead><tr>{columns.map((column) => <th key={column}>{column.replaceAll("_", " ")}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={String(row.id ?? index)}>{columns.map((column) => <td key={column} className="max-w-72 truncate" title={value(row[column])}>{value(row[column])}</td>)}</tr>)}</tbody></table></div>}</div></section>;
}
