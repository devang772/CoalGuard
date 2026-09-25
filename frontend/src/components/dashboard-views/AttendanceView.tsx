import React, { useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  XCircle,
  MapPin,
  Clock,
  UserCheck,
  ShieldAlert,
  Search,
  Filter,
  Camera,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface AttendanceRecord {
  id: string;
  workerName: string;
  contractorName: string;
  mineName: string;
  time: string;
  lat: number;
  lng: number;
  selfieUrl: string;
  gateEntry: boolean;
  valid: boolean;
  reason?: string;
}

const mockAttendance: AttendanceRecord[] = [
  {
    id: "ATT-101",
    workerName: "Ramesh Tudu",
    contractorName: "M/s Eastern Infra Ltd",
    mineName: "Kusunda Opencast Mine",
    time: "06:45 AM (Shift A)",
    lat: 23.7833,
    lng: 86.4333,
    selfieUrl: "https://picsum.photos/seed/w1/150/150",
    gateEntry: true,
    valid: true,
  },
  {
    id: "ATT-102",
    workerName: "Vikram Soren",
    contractorName: "M/s Eastern Infra Ltd",
    mineName: "Kusunda Opencast Mine",
    time: "06:52 AM (Shift A)",
    lat: 23.7912,
    lng: 86.4498,
    selfieUrl: "https://picsum.photos/seed/w2/150/150",
    gateEntry: false,
    valid: false,
    reason: "Outside registered mine geofence boundary by 1.2 km",
  },
  {
    id: "ATT-103",
    workerName: "Deepak Bauri",
    contractorName: "Shree Ram Mining Services",
    mineName: "Jharia Underground Mine",
    time: "07:05 AM (Shift A)",
    lat: 23.75,
    lng: 86.4167,
    selfieUrl: "https://picsum.photos/seed/w3/150/150",
    gateEntry: true,
    valid: false,
    reason: "Mandatory VTC Safety Training Certificate expired",
  },
];

export const AttendanceView: React.FC = () => {
  const [filterValid, setFilterValid] = useState<"ALL" | "VALID" | "INVALID">("ALL");

  const filtered = mockAttendance.filter((r) => {
    if (filterValid === "VALID") return r.valid;
    if (filterValid === "INVALID") return !r.valid;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            Geofenced Gate Attendance Monitor
            <UserCheck size={22} className="text-amber-500" />
          </h2>
          <p className="text-sm text-muted-foreground">
            Real-time verification of biometric selfie punch, mine boundary geofence, and gate entry compliance.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={filterValid === "ALL" ? "default" : "outline"}
            onClick={() => setFilterValid("ALL")}
          >
            All Logs ({mockAttendance.length})
          </Button>
          <Button
            size="sm"
            variant={filterValid === "INVALID" ? "default" : "outline"}
            onClick={() => setFilterValid("INVALID")}
            className="text-rose-600 dark:text-rose-400 border-rose-300 dark:border-rose-500/40"
          >
            Invalid ({mockAttendance.filter((m) => !m.valid).length})
          </Button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card border rounded-xl p-4 shadow-sm">
          <div className="text-xs text-muted-foreground font-medium">Present Today</div>
          <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">1,482</div>
        </div>
        <div className="bg-card border rounded-xl p-4 shadow-sm">
          <div className="text-xs text-muted-foreground font-medium">Invalid Geofence Punches</div>
          <div className="text-2xl font-bold font-mono text-rose-600 dark:text-rose-400 mt-1">14</div>
        </div>
        <div className="bg-card border rounded-xl p-4 shadow-sm">
          <div className="text-xs text-muted-foreground font-medium">No Gate Turnstile Record</div>
          <div className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-1">08</div>
        </div>
        <div className="bg-card border rounded-xl p-4 shadow-sm">
          <div className="text-xs text-muted-foreground font-medium">Expired Training Punches</div>
          <div className="text-2xl font-bold font-mono text-foreground mt-1">06</div>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-foreground">
            <thead className="bg-muted/50 text-muted-foreground font-mono text-[11px] uppercase border-b">
              <tr>
                <th className="p-3">Selfie</th>
                <th className="p-3">Worker Name</th>
                <th className="p-3">Contractor</th>
                <th className="p-3">Mine Location</th>
                <th className="p-3">Punch Time</th>
                <th className="p-3">Gate Turnstile</th>
                <th className="p-3">Status Check</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((rec) => (
                <tr key={rec.id} className="hover:bg-muted/30">
                  <td className="p-3">
                    <img src={rec.selfieUrl} alt="Selfie" className="size-10 rounded-lg object-cover border" />
                  </td>
                  <td className="p-3 font-semibold text-foreground">{rec.workerName}</td>
                  <td className="p-3 text-muted-foreground">{rec.contractorName}</td>
                  <td className="p-3 text-foreground">{rec.mineName}</td>
                  <td className="p-3 font-mono text-amber-600 dark:text-amber-300 font-semibold">{rec.time}</td>
                  <td className="p-3">
                    {rec.gateEntry ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                        <CheckCircle2 size={13} /> Synchronized
                      </span>
                    ) : (
                      <span className="text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1">
                        <XCircle size={13} /> Missing Turnstile
                      </span>
                    )}
                  </td>
                  <td className="p-3">
                    {rec.valid ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/40 text-[11px] font-mono font-medium">
                        Valid Punch
                      </span>
                    ) : (
                      <div className="space-y-0.5">
                        <span className="px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-500/40 text-[11px] font-mono font-medium">
                          Invalid Punch
                        </span>
                        <div className="text-[10px] text-rose-600 dark:text-rose-400">{rec.reason}</div>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
