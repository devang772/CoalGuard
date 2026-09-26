import { ShieldCheck } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";

/** Displays the role supplied by the authenticated backend session. Roles cannot be simulated in the client. */
export function RoleSwitcher() {
  const user = useAppStore((state) => state.user);
  if (!user) return null;
  return <span className="inline-flex items-center gap-2 rounded-md border border-primary/30 bg-primary/5 px-2.5 py-1.5 text-xs font-medium"><ShieldCheck size={14} className="text-primary" />{user.role.replaceAll("_", " ")}</span>;
}
