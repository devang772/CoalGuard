import React from "react";
import { Trophy, Medal, ArrowUpRight, ArrowDownRight, ShieldCheck, Mountain } from "lucide-react";

interface MineRank {
  rank: number;
  mineName: string;
  subsidiary: string;
  safetyScore: number;
  compliancePct: number;
  avgCapaDays: number;
  incidentsMonth: number;
  trend: "up" | "down" | "same";
}

const mockLeaderboard: MineRank[] = [
  {
    rank: 1,
    mineName: "Jharia Underground Coal Mine",
    subsidiary: "BCCL",
    safetyScore: 96.4,
    compliancePct: 98.2,
    avgCapaDays: 2.1,
    incidentsMonth: 0,
    trend: "up",
  },
  {
    rank: 2,
    mineName: "Moonidih Shaft & Washery",
    subsidiary: "BCCL",
    safetyScore: 92.8,
    compliancePct: 94.5,
    avgCapaDays: 3.4,
    incidentsMonth: 1,
    trend: "up",
  },
  {
    rank: 3,
    mineName: "Ashoka Opencast Mine",
    subsidiary: "CCL",
    safetyScore: 89.1,
    compliancePct: 91.0,
    avgCapaDays: 4.2,
    incidentsMonth: 1,
    trend: "same",
  },
  {
    rank: 4,
    mineName: "Lingaraj Opencast Mine",
    subsidiary: "MCL",
    safetyScore: 84.5,
    compliancePct: 87.3,
    avgCapaDays: 5.8,
    incidentsMonth: 2,
    trend: "down",
  },
  {
    rank: 5,
    mineName: "Kusunda Opencast Mine",
    subsidiary: "BCCL",
    safetyScore: 68.2,
    compliancePct: 74.1,
    avgCapaDays: 12.4,
    incidentsMonth: 4,
    trend: "down",
  },
];

export const LeaderboardView: React.FC = () => {
  const top1 = mockLeaderboard[0];
  const top2 = mockLeaderboard[1];
  const top3 = mockLeaderboard[2];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col justify-between gap-2 md:flex-row md:items-center border-b pb-3">
        <div>
          <h2 className="font-display text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            CIL Safety & Compliance Leaderboard
            <Trophy size={20} className="text-amber-500" />
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Monthly national ranking based on DGMS safety audits, zero-incident records, and CAPA closure SLAs.
          </p>
        </div>
      </div>

      {/* Podium Display (Top 3) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end pt-2">
        {/* Silver #2 */}
        <div className="bg-card border rounded-xl p-4 text-center space-y-2.5 relative overflow-hidden order-2 md:order-1 shadow-sm">
          <div className="inline-flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold font-mono text-base mx-auto border border-slate-300 dark:border-slate-700 shadow-sm">
            <span>🥈</span>
            <span>2nd</span>
          </div>
          <h3 className="font-display font-semibold text-foreground text-sm">{top2.mineName}</h3>
          <p className="text-xs text-muted-foreground">{top2.subsidiary} Subsidiary</p>
          <div className="text-2xl font-bold font-mono text-foreground">{top2.safetyScore}<span className="text-xs text-muted-foreground">/100</span></div>
          <div className="text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 py-1 px-2 rounded-full border border-emerald-300 dark:border-emerald-500/30 font-medium">
            Compliance: {top2.compliancePct}% · Avg CAPA: {top2.avgCapaDays}d
          </div>
        </div>

        {/* Gold #1 (Tallest) */}
        <div className="bg-gradient-to-b from-amber-500/10 to-card border-2 border-amber-500/80 rounded-xl p-5 text-center space-y-2.5 relative shadow-md order-1 md:order-2 -mt-2">
          <div className="absolute top-2 right-2 text-amber-600 dark:text-amber-400 text-xs font-mono font-bold flex items-center gap-1">
            <Trophy size={14} /> Winner
          </div>
          <div className="inline-flex items-center justify-center gap-1.5 px-5 py-2 rounded-full bg-amber-500 text-slate-950 font-bold font-mono text-lg mx-auto shadow-md border border-amber-400">
            <span>🥇</span>
            <span>1st</span>
          </div>
          <h3 className="font-display font-bold text-foreground text-base">{top1.mineName}</h3>
          <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">{top1.subsidiary} Subsidiary</p>
          <div className="text-3xl font-bold font-mono text-amber-600 dark:text-amber-400">{top1.safetyScore}<span className="text-xs text-muted-foreground">/100</span></div>
          <div className="text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/80 py-1 px-2 rounded-full border border-emerald-300 dark:border-emerald-500/40 font-semibold">
            Compliance: {top1.compliancePct}% · Zero Incidents
          </div>
        </div>

        {/* Bronze #3 */}
        <div className="bg-card border rounded-xl p-4 text-center space-y-2.5 relative overflow-hidden order-3 shadow-sm">
          <div className="inline-flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-400 font-bold font-mono text-base mx-auto border border-amber-300 dark:border-amber-700/50 shadow-sm">
            <span>🥉</span>
            <span>3rd</span>
          </div>
          <h3 className="font-display font-semibold text-foreground text-sm">{top3.mineName}</h3>
          <p className="text-xs text-muted-foreground">{top3.subsidiary} Subsidiary</p>
          <div className="text-2xl font-bold font-mono text-foreground">{top3.safetyScore}<span className="text-xs text-muted-foreground">/100</span></div>
          <div className="text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 py-1 px-2 rounded-full border border-emerald-300 dark:border-emerald-500/30 font-medium">
            Compliance: {top3.compliancePct}% · Avg CAPA: {top3.avgCapaDays}d
          </div>
        </div>
      </div>

      {/* Leaderboard Ranked Table */}
      <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm text-foreground">
          <thead className="bg-muted/50 text-muted-foreground font-mono text-xs uppercase border-b">
            <tr>
              <th className="p-3">Rank</th>
              <th className="p-3">Mine Name</th>
              <th className="p-3">Subsidiary</th>
              <th className="p-3">Safety Score</th>
              <th className="p-3">Compliance Rate</th>
              <th className="p-3">Avg CAPA SLA</th>
              <th className="p-3">Monthly Incidents</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border text-sm">
            {mockLeaderboard.map((m) => (
              <tr key={m.rank} className="hover:bg-muted/30">
                <td className="p-3 font-mono font-bold text-amber-600 dark:text-amber-400">#{m.rank}</td>
                <td className="p-3 font-semibold text-foreground">{m.mineName}</td>
                <td className="p-3 text-muted-foreground">{m.subsidiary}</td>
                <td className="p-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">{m.safetyScore}%</td>
                <td className="p-3 font-mono text-foreground">{m.compliancePct}%</td>
                <td className="p-3 font-mono text-amber-600 dark:text-amber-400">{m.avgCapaDays} Days</td>
                <td className="p-3 font-mono">{m.incidentsMonth === 0 ? <span className="text-emerald-600 dark:text-emerald-400 font-bold">0 (Clean)</span> : <span className="text-rose-600 dark:text-rose-400">{m.incidentsMonth}</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
