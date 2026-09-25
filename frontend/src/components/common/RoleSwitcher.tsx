import React from "react";
import { UserCheck, ShieldAlert } from "lucide-react";
import { useAppStore, UserRole } from "@/store/useAppStore";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

const roleLabels: Record<UserRole, string> = {
  cil_admin: "CIL Corporate Admin",
  subsidiary_admin: "Subsidiary Admin (BCCL)",
  area_gm: "Area GM (Jharia)",
  mine_manager: "Mine Manager (Kusunda)",
  safety_officer: "Safety Officer",
  regulator: "DGMS / SPCB Regulator",
  contractor_admin: "Contractor Admin",
};

export const RoleSwitcher: React.FC = () => {
  const { user, setUserRole } = useAppStore();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 hover:text-amber-200 text-xs font-mono"
        >
          <ShieldAlert size={14} className="text-amber-400" />
          <span>Role: {user.role.toUpperCase().replace("_", " ")}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-slate-900 border-slate-700 text-slate-200">
        <DropdownMenuLabel className="text-xs text-slate-400 uppercase font-mono">
          Switch Demo Role (RBAC)
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-slate-800" />
        {(Object.keys(roleLabels) as UserRole[]).map((roleKey) => (
          <DropdownMenuItem
            key={roleKey}
            onClick={() => setUserRole(roleKey)}
            className={`flex items-center justify-between text-xs cursor-pointer ${
              user.role === roleKey ? "bg-amber-500/20 text-amber-300 font-semibold" : "hover:bg-slate-800"
            }`}
          >
            <span>{roleLabels[roleKey]}</span>
            {user.role === roleKey && <UserCheck size={14} className="text-amber-400" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
