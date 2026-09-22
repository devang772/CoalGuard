import { useState } from "react";
import {
  Users,
  Plus,
  Search,
  Shield,
  UserCheck,
  Mail,
  MoreVertical,
  X,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const usersData = [
  {
    id: "USR-001",
    name: "Er. Rajesh Kumar",
    role: "Chief Safety Administrator",
    mine: "Jharia Underground Coal Mine",
    email: "r.kumar@coalguard.gov.in",
    status: "Active",
    access: "Super Admin",
    tone: "low",
  },
  {
    id: "USR-002",
    name: "Er. Vikram Sharma",
    role: "Opencast Mine Manager",
    mine: "Kusunda Opencast Mine",
    email: "v.sharma@coalguard.gov.in",
    status: "Active",
    access: "Mine Manager",
    tone: "low",
  },
  {
    id: "USR-003",
    name: "Er. Sneha Das",
    role: "Senior Safety Inspector",
    mine: "Moonidih Shaft & Washery",
    email: "s.das@coalguard.gov.in",
    status: "Active",
    access: "Inspector",
    tone: "low",
  },
  {
    id: "USR-004",
    name: "Er. N. Prasad",
    role: "Environmental Compliance Auditor",
    mine: "Karkali Open Pit",
    email: "n.prasad@coalguard.gov.in",
    status: "Active",
    access: "Auditor",
    tone: "low",
  },
  {
    id: "USR-005",
    name: "Er. Amit Sen",
    role: "Underground Ventilation Officer",
    mine: "Raniganj South Seam",
    email: "a.sen@coalguard.gov.in",
    status: "On Leave",
    access: "Inspector",
    tone: "medium",
  },
];

export function UsersView() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);

  const filteredUsers = usersData.filter(
    (u) =>
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.mine.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight">User & Role Management</h2>
          <p className="text-sm text-muted-foreground">
            Manage organization personnel, safety officers, mine managers, role-based access permissions, and 2FA credentials.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setIsAddUserOpen(true)} className="gap-2">
            <Plus className="size-4" /> Provision New User
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="dashboard-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Registered Users</p>
          <p className="mt-2 font-display text-3xl font-bold">148</p>
          <p className="mt-1 text-xs text-muted-foreground">Across all regions</p>
        </div>
        <div className="dashboard-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Active Field Inspectors</p>
          <p className="mt-2 font-display text-3xl font-bold text-primary">32</p>
          <p className="mt-1 text-xs text-muted-foreground">Mobile DGMS app verified</p>
        </div>
        <div className="dashboard-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Mine Managers</p>
          <p className="mt-2 font-display text-3xl font-bold text-emerald-600">14</p>
          <p className="mt-1 text-xs text-muted-foreground">Site safety clearers</p>
        </div>
        <div className="dashboard-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">System Admins</p>
          <p className="mt-2 font-display text-3xl font-bold text-indigo-600">06</p>
          <p className="mt-1 text-xs text-muted-foreground">Full clearance access</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="rounded-lg border bg-card p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by user name, role or mine assignment..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-md border bg-background pl-9 pr-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:border-primary"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="dashboard-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="dashboard-table min-w-full">
            <thead>
              <tr>
                <th>User ID</th>
                <th>Full Name</th>
                <th>Designation / Role</th>
                <th>Assigned Mine Site</th>
                <th>Email Address</th>
                <th>Access Level</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((usr) => (
                <tr key={usr.id} className="hover:bg-muted/30">
                  <td className="font-mono text-xs font-bold text-primary">{usr.id}</td>
                  <td className="font-semibold text-foreground">{usr.name}</td>
                  <td className="text-xs text-muted-foreground">{usr.role}</td>
                  <td className="text-xs text-muted-foreground">{usr.mine}</td>
                  <td className="text-xs font-mono">{usr.email}</td>
                  <td>
                    <span className="text-xs font-semibold text-primary">{usr.access}</span>
                  </td>
                  <td>
                    <span className={cn("status-badge", `status-${usr.tone}`)}>{usr.status}</span>
                  </td>
                  <td>
                    <Button variant="ghost" size="sm" className="gap-1 text-xs">
                      Edit Role
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Provision User Modal */}
      {isAddUserOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="dashboard-card w-full max-w-lg bg-card p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-display text-lg font-bold">Provision New System User</h3>
              <Button variant="ghost" size="icon" onClick={() => setIsAddUserOpen(false)}>
                <X className="size-4" />
              </Button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                alert("New user account provisioned and invitation email sent!");
                setIsAddUserOpen(false);
              }}
              className="mt-4 space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Er. Rajiv Sen"
                  className="w-full rounded-md border bg-background p-2 text-sm outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Official Email</label>
                  <input
                    type="email"
                    required
                    placeholder="user@coalguard.gov.in"
                    className="w-full rounded-md border bg-background p-2 text-sm outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Access Level</label>
                  <select className="w-full rounded-md border bg-background p-2 text-sm outline-none focus:border-primary">
                    <option>Inspector</option>
                    <option>Mine Manager</option>
                    <option>Auditor</option>
                    <option>Super Admin</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Assigned Mine Site</label>
                <select className="w-full rounded-md border bg-background p-2 text-sm outline-none focus:border-primary">
                  <option>Jharia Underground Coal Mine</option>
                  <option>Kusunda Opencast Mine</option>
                  <option>Moonidih Shaft & Washery</option>
                  <option>Karkali Open Pit</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 border-t pt-4">
                <Button type="button" variant="outline" onClick={() => setIsAddUserOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Create Credentials</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
