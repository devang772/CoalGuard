import React from "react";
import { ShieldCheck, ShieldAlert, AlertOctagon } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TrustScoreBadgeProps {
  score: number;
  flags?: string[];
}

const flagDescriptions: Record<string, string> = {
  outside_boundary: "Photo taken 412 m outside registered mine boundary",
  reused_photo: "Duplicate photo matches previously submitted inspection #INS-881",
  time_mismatch: "EXIF device timestamp differs from server reception time",
  no_exif: "Missing EXIF camera metadata & hardware signature",
  mock_location: "Mock GPS / Mock Location developer tool detected on mobile device",
  low_gps_accuracy: "GPS accuracy lower than required threshold (±25m)",
};

export const TrustScoreBadge: React.FC<TrustScoreBadgeProps> = ({ score, flags = [] }) => {
  let badgeColor = "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/40";
  let icon = <ShieldCheck size={13} className="text-emerald-600 dark:text-emerald-400" />;
  let label = "Verified";

  if (score < 60) {
    badgeColor = "bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-500/40 animate-pulse";
    icon = <AlertOctagon size={13} className="text-rose-600 dark:text-rose-400" />;
    label = "Suspicious";
  } else if (score < 80) {
    badgeColor = "bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-500/40";
    icon = <ShieldAlert size={13} className="text-amber-600 dark:text-amber-400" />;
    label = "Review";
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium border shadow-sm cursor-help ${badgeColor}`}
          >
            {icon}
            <span>Trust: {score}/100 ({label})</span>
          </div>
        </TooltipTrigger>
        <TooltipContent className="bg-slate-900 border-slate-700 text-slate-200 max-w-xs text-xs space-y-1 p-3">
          <p className="font-semibold text-slate-100 flex items-center gap-1">
            Satya Proof Integrity Check
          </p>
          <p className="text-slate-400">Score: <strong className="text-amber-300">{score}/100</strong></p>
          {flags.length > 0 ? (
            <div className="pt-1.5 border-t border-slate-800 space-y-1">
              <p className="text-rose-400 font-medium text-[11px] uppercase tracking-wider">Detected Flags:</p>
              <ul className="list-disc list-inside text-rose-300 space-y-0.5">
                {flags.map((flag) => (
                  <li key={flag}>{flagDescriptions[flag] || flag}</li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-emerald-400 text-[11px] pt-1">All anti-tamper and EXIF checks passed clean.</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
