import { useEffect, useState } from "react";
import { Building2, MapPin, Mountain } from "lucide-react";
import { apiRequest } from "@/lib/api";
import { useAppStore } from "@/store/useAppStore";

type Unit = { id: number; name: string; unit_type?: string };
export function ScopeSwitcher() {
  const { selectedSubsidiary, selectedArea, selectedMine, setScope } = useAppStore();
  const [units, setUnits] = useState<Unit[]>([]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { void apiRequest<Unit[]>("/org/units").then(setUnits).catch((e: Error) => setError(e.message)); }, []);
  const subsidiaries = units.filter((u) => u.unit_type === "subsidiary" || u.unit_type === "cil");
  const areas = units.filter((u) => u.unit_type === "area");
  const mines = units.filter((u) => u.unit_type === "mine");
  if (error) return <span className="text-xs text-destructive" title={error}>Scope unavailable</span>;
  return <div className="flex h-10 w-72 items-center gap-1 rounded-lg border bg-card px-2 text-xs">
    <Building2 size={13} className="text-primary" /><select value={selectedSubsidiary} onChange={(e) => setScope(e.target.value, "ALL", "ALL")} className="min-w-0 flex-1 bg-transparent"><option value="ALL">All units</option>{subsidiaries.map((u) => <option key={u.id} value={u.name}>{u.name}</option>)}</select>
    <MapPin size={13} className="text-primary" /><select value={selectedArea} onChange={(e) => setScope(selectedSubsidiary, e.target.value, "ALL")} className="min-w-0 flex-1 bg-transparent"><option value="ALL">All areas</option>{areas.map((u) => <option key={u.id} value={u.name}>{u.name}</option>)}</select>
    <Mountain size={13} className="text-primary" /><select value={selectedMine} onChange={(e) => setScope(selectedSubsidiary, selectedArea, e.target.value)} className="min-w-0 flex-1 bg-transparent"><option value="ALL">All mines</option>{mines.map((u) => <option key={u.id} value={u.name}>{u.name}</option>)}</select>
  </div>;
}
