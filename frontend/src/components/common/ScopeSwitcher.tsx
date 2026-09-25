import React from "react";
import { Building2, MapPin, Mountain } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";

const subsidiaries = ["ALL", "BCCL", "CCL", "MCL", "ECL", "WCL", "NCL", "SECL"];
const areasMap: Record<string, string[]> = {
  ALL: ["ALL"],
  BCCL: ["ALL", "Jharia Area IX", "Kusunda Area VI", "Katras Area IV", "Barora Area I"],
  CCL: ["ALL", "Piparwar Area", "Kuju Area", "Barka-Sayal Area"],
  MCL: ["ALL", "Talcher Area", "Ib Valley Area", "Lakhanpur Area"],
};
const minesMap: Record<string, string[]> = {
  ALL: ["ALL"],
  "Jharia Area IX": ["ALL", "Jharia Underground Coal Mine", "Moonidih Underground Mine"],
  "Kusunda Area VI": ["ALL", "Kusunda Opencast Mine", "Bastacolla Opencast Mine"],
  "Katras Area IV": ["ALL", "Ramkanali Underground Shaft", "Gaslitand Coal Pit"],
  "Piparwar Area": ["ALL", "Ashoka Opencast Mine", "Piparwar Pit"],
  "Talcher Area": ["ALL", "Lingaraj Opencast Mine", "Ananta Mine"],
};

export const ScopeSwitcher: React.FC = () => {
  const { selectedSubsidiary, selectedArea, selectedMine, setScope } = useAppStore();

  const currentAreas = areasMap[selectedSubsidiary] || ["ALL"];
  const currentMines = minesMap[selectedArea] || ["ALL"];

  return (
    <div className="flex h-10 w-72 sm:w-80 items-center justify-between gap-1 bg-card border border-border rounded-lg px-2.5 shadow-xs text-xs text-foreground font-medium shrink-0">
      {/* Subsidiary Selection */}
      <div className="flex items-center gap-1 min-w-0 flex-1">
        <Building2 size={13} className="text-amber-600 dark:text-amber-400 shrink-0" />
        <select
          value={selectedSubsidiary}
          onChange={(e) => setScope(e.target.value, "ALL", "ALL")}
          className="bg-transparent text-foreground font-semibold focus:outline-none cursor-pointer w-full truncate text-[11px] sm:text-xs"
        >
          <option value="ALL" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">All Subs</option>
          {subsidiaries.filter(s => s !== "ALL").map((sub) => (
            <option key={sub} value={sub} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">
              {sub}
            </option>
          ))}
        </select>
      </div>

      <span className="text-muted-foreground shrink-0">/</span>

      {/* Area Selection */}
      <div className="flex items-center gap-1 min-w-0 flex-1">
        <MapPin size={13} className="text-blue-600 dark:text-blue-400 shrink-0" />
        <select
          value={selectedArea}
          onChange={(e) => setScope(selectedSubsidiary, e.target.value, "ALL")}
          className="bg-transparent text-foreground font-semibold focus:outline-none cursor-pointer w-full truncate text-[11px] sm:text-xs"
        >
          {currentAreas.map((area) => (
            <option key={area} value={area} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">
              {area === "ALL" ? "All Areas" : area}
            </option>
          ))}
        </select>
      </div>

      <span className="text-muted-foreground shrink-0">/</span>

      {/* Mine Selection */}
      <div className="flex items-center gap-1 min-w-0 flex-1">
        <Mountain size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
        <select
          value={selectedMine}
          onChange={(e) => setScope(selectedSubsidiary, selectedArea, e.target.value)}
          className="bg-transparent text-foreground font-semibold focus:outline-none cursor-pointer w-full truncate text-[11px] sm:text-xs"
        >
          {currentMines.map((mine) => (
            <option key={mine} value={mine} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">
              {mine === "ALL" ? "All Mines" : mine}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};
