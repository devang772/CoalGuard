import { useCallback, useEffect, useState } from "react";
import { Users, Plus, RefreshCw, Edit, Key, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getUsersApi, createUserApi, updateUserApi, resetPasswordApi, getOrgUnitsApi, type Page, type Row } from "@/lib/api";
import { useAppStore } from "@/store/useAppStore";

const fmt = (v: unknown) => v === null || v === undefined || v === "" ? "—" : String(v);
const ist = (v: unknown) => { try { return new Date(String(v)).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }); } catch { return fmt(v); } };
const ROLES = ["worker", "supervisor", "safety_officer", "mine_manager", "area_gm", "subsidiary_admin", "cil_admin", "regulator", "contractor_admin"];

function UserFormDialog({ user, orgUnits, close, reload }: { user?: Row; orgUnits: Row[]; close: () => void; reload: () => Promise<void> }) {
  const [name, setName] = useState(fmt(user?.name));
  const [phone, setPhone] = useState(fmt(user?.phone));
  const [role, setRole] = useState(fmt(user?.role) || "supervisor");
  const [orgUnitId, setOrgUnitId] = useState(fmt(user?.org_unit_id));
  const [language, setLanguage] = useState(fmt(user?.language) || "en");
  const [isActive, setIsActive] = useState(user?.is_active !== false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tempPw, setTempPw] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setSubmitting(true); setError(null);
    try {
      if (user) {
        await updateUserApi(Number(user.id), { name, role, language, is_active: isActive, org_unit_id: Number(orgUnitId) });
        await reload(); close();
      } else {
        const r = await createUserApi({ name, phone, role, language, org_unit_id: Number(orgUnitId) });
        if ((r as Record<string, unknown>).temporary_password) {
          setTempPw(fmt((r as Record<string, unknown>).temporary_password));
        } else {
          await reload(); close();
        }
      }
    } catch (err) { setError(err instanceof Error ? err.message : "Operation failed"); }
    finally { setSubmitting(false); }
  };

  if (tempPw) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
        <section role="dialog" aria-modal="true" className="dashboard-card w-full max-w-md bg-card p-6 shadow-2xl text-center">
          <h3 className="font-bold mb-2">User created!</h3>
          <p className="text-sm text-muted-foreground mb-4">Share this one-time temporary password with the user.</p>
          <div className="rounded-xl border-2 border-primary p-4 bg-primary/5 mb-4">
            <p className="font-mono text-2xl font-bold">{tempPw}</p>
          </div>
          <p className="text-xs text-muted-foreground mb-4">The user must change this password at first login.</p>
          <Button onClick={async () => { await reload(); close(); }}>Done</Button>
        </section>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <section role="dialog" aria-modal="true" className="dashboard-card w-full max-w-lg bg-card p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b pb-3 mb-4">
          <h3 className="font-bold">{user ? "Edit User" : "Create User"}</h3>
          <Button variant="ghost" size="icon" onClick={close}><X className="size-4" /></Button>
        </div>
        <form onSubmit={e => void submit(e)} className="space-y-4">
          <label className="block text-sm font-medium">Full name *
            <input required value={name} onChange={e => setName(e.target.value)} className="mt-1 block w-full rounded-md border bg-background p-2 text-sm" />
          </label>
          {!user && (
            <label className="block text-sm font-medium">Phone (10-15 digits) *
              <input required type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="9000000001" className="mt-1 block w-full rounded-md border bg-background p-2 text-sm" />
            </label>
          )}
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm font-medium">Role *
              <select required value={role} onChange={e => setRole(e.target.value)} className="mt-1 block w-full rounded-md border bg-background p-2 text-sm">
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </label>
            <label className="text-sm font-medium">Language
              <select value={language} onChange={e => setLanguage(e.target.value)} className="mt-1 block w-full rounded-md border bg-background p-2 text-sm">
                <option value="en">English</option>
                <option value="hi">Hindi</option>
              </select>
            </label>
          </div>
          <label className="text-sm font-medium">Org unit *
            <select required value={orgUnitId} onChange={e => setOrgUnitId(e.target.value)} className="mt-1 block w-full rounded-md border bg-background p-2 text-sm">
              <option value="">Select…</option>
              {orgUnits.map(u => <option key={fmt(u.id)} value={fmt(u.id)}>{fmt(u.name)} ({fmt(u.type)})</option>)}
            </select>
          </label>
          {user && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="rounded" />
              Active account
            </label>
          )}
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={close}>Cancel</Button>
            <Button disabled={submitting}>{submitting ? "Saving…" : user ? "Save changes" : "Create user"}</Button>
          </div>
        </form>
      </section>
    </div>
  );
}

export function UsersView() {
  const { user: me } = useAppStore();
  const [page, setPage] = useState<Page<Row> | null>(null);
  const [orgUnits, setOrgUnits] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Row | null | "new">(null);
  const [resetting, setResetting] = useState<number | null>(null);
  const [resetResult, setResetResult] = useState<{ id: number; pw: string } | null>(null);
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const params: Record<string, string | number | undefined> = {};
      if (q) params.q = q;
      if (roleFilter) params.role = roleFilter;
      const [users, units] = await Promise.all([getUsersApi(params), getOrgUnitsApi()]);
      setPage(users); setOrgUnits(units);
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to load users"); }
    finally { setLoading(false); }
  }, [q, roleFilter]);

  useEffect(() => { void load(); }, [load]);

  const resetPw = async (id: number) => {
    setResetting(id);
    try { const r = await resetPasswordApi(id); setResetResult({ id, pw: fmt(r.temporary_password) }); }
    catch (e) { setError(e instanceof Error ? e.message : "Reset failed"); }
    finally { setResetting(null); }
  };

  const canManage = me && ["mine_manager", "area_gm", "subsidiary_admin", "cil_admin"].includes(me.role);
  const items = page?.items ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight flex items-center gap-2"><Users className="size-6 text-primary" /> Users</h2>
          <p className="text-sm text-muted-foreground">User management. RBAC controls match server authorisation.</p>
        </div>
        <div className="flex gap-2">
          {canManage && <Button size="sm" onClick={() => setEditing("new")} className="gap-1"><Plus className="size-4" /> Add user</Button>}
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-1"><RefreshCw className="size-4" /> Refresh</Button>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search name or phone…" className="rounded-md border bg-background px-3 py-2 text-sm flex-1 min-w-48" />
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="rounded-md border bg-background px-3 py-2 text-sm">
          <option value="">All roles</option>
          {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      {error && <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive flex justify-between"><span>{error}</span><Button variant="outline" size="sm" onClick={load}>Retry</Button></div>}

      {resetResult && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-50 p-4">
          <p className="font-semibold text-emerald-700 mb-1">Temporary password for user #{resetResult.id}</p>
          <p className="font-mono text-lg">{resetResult.pw}</p>
          <Button size="sm" variant="outline" className="mt-2" onClick={() => setResetResult(null)}>Dismiss</Button>
        </div>
      )}

      <div className="dashboard-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="dashboard-table min-w-full">
            <thead><tr><th>#</th><th>Name</th><th>Phone</th><th>Role</th><th>Org unit</th><th>Active</th><th>Created</th>{canManage && <th>Actions</th>}</tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">Loading users…</td></tr>
                : items.length === 0 ? <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">No users found.</td></tr>
                : items.map(u => (
                  <tr key={fmt(u.id)}>
                    <td className="font-mono text-xs text-muted-foreground">#{fmt(u.id)}</td>
                    <td className="font-semibold">{fmt(u.name)}</td>
                    <td className="font-mono text-xs">{fmt(u.phone)}</td>
                    <td><span className="text-xs font-medium bg-muted px-1.5 py-0.5 rounded">{fmt(u.role)}</span></td>
                    <td className="text-xs text-muted-foreground">{fmt(u.org_name)}</td>
                    <td>{u.is_active ? <span className="text-emerald-600 text-xs">✓ Active</span> : <span className="text-red-600 text-xs">Inactive</span>}</td>
                    <td className="text-xs text-muted-foreground">{ist(u.created_at)}</td>
                    {canManage && (
                      <td>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => setEditing(u)} className="h-7 px-2"><Edit className="size-3" /></Button>
                          <Button size="sm" variant="ghost" disabled={resetting === Number(u.id)} onClick={() => void resetPw(Number(u.id))} className="h-7 px-2"><Key className="size-3" /></Button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
      {page && <div className="text-sm text-muted-foreground">Total: <strong>{page.total}</strong></div>}

      {editing === "new" && <UserFormDialog orgUnits={orgUnits} close={() => setEditing(null)} reload={load} />}
      {editing && editing !== "new" && <UserFormDialog user={editing} orgUnits={orgUnits} close={() => setEditing(null)} reload={load} />}
    </div>
  );
}
