"use client";

import * as React from "react";
import { AppShell } from "@/components/layout/app-shell";
import { RoleGuard } from "@/components/auth/role-guard";
import { ROLES, PERMISSION_KEYS } from "@/lib/rbac";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { StatusChip } from "@/components/ui/status-chip";
import { Input, Label } from "@/components/ui/controls";
import { Dialog } from "@/components/ui/dialog-and-drawer";
import {
  ShieldCheck,
  UserPlus,
  Lock,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Search,
  UserCheck,
  UserX,
  SlidersHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface RoleData {
  id: string;
  name: string;
  description: string | null;
  limits: {
    maxRefundPesewas: number;
    maxDiscountPercent: number;
  } | null;
  permissions: string[];
}

interface PermissionData {
  id: string;
  name: string;
  description: string | null;
}

interface UserData {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: {
    id: string;
    name: string;
    description: string | null;
  };
  active: boolean;
  mustChangePassword: boolean;
  totpEnabled: boolean;
  staffId: string | null;
  staffTitle: string | null;
  createdAt: string;
}

export default function UsersAndRolesPage() {
  const [activeTab, setActiveTab] = React.useState("users");
  const [loading, setLoading] = React.useState(true);
  const [users, setUsers] = React.useState<UserData[]>([]);
  const [roles, setRoles] = React.useState<RoleData[]>([]);
  const [allPermissions, setAllPermissions] = React.useState<PermissionData[]>([]);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [notification, setNotification] = React.useState<{ type: "success" | "error"; message: string } | null>(null);

  // Modal states
  const [isAddUserOpen, setIsAddUserOpen] = React.useState(false);
  const [isResetPasswordOpen, setIsResetPasswordOpen] = React.useState(false);
  const [selectedUserForReset, setSelectedUserForReset] = React.useState<UserData | null>(null);
  const [generatedResetLink, setGeneratedResetLink] = React.useState<string | null>(null);
  const [copiedLink, setCopiedLink] = React.useState(false);

  // Form states for Add User
  const [newUserName, setNewUserName] = React.useState("");
  const [newUserEmail, setNewUserEmail] = React.useState("");
  const [newUserPhone, setNewUserPhone] = React.useState("");
  const [newUserRoleId, setNewUserRoleId] = React.useState("");
  const [createdTempPassword, setCreatedTempPassword] = React.useState<string | null>(null);
  const [isSubmittingUser, setIsSubmittingUser] = React.useState(false);

  // Fetch users and roles
  const refreshData = React.useCallback(async () => {
    try {
      const [usersRes, rolesRes] = await Promise.all([
        fetch("/api/admin/users"),
        fetch("/api/admin/roles"),
      ]);

      if (usersRes.ok) {
        const usersJson = await usersRes.json();
        setUsers(usersJson.data.users);
      }
      if (rolesRes.ok) {
        const rolesJson = await rolesRes.json();
        setRoles(rolesJson.data.roles);
        setAllPermissions(rolesJson.data.allPermissions);
      }
    } catch {
      setNotification({ type: "error", message: "Failed to reload users and roles." });
    }
  }, []);

  React.useEffect(() => {
    let ignore = false;
    async function init() {
      try {
        const [usersRes, rolesRes] = await Promise.all([
          fetch("/api/admin/users"),
          fetch("/api/admin/roles"),
        ]);
        if (ignore) return;
        if (usersRes.ok) {
          const usersJson = await usersRes.json();
          setUsers(usersJson.data.users);
        }
        if (rolesRes.ok) {
          const rolesJson = await rolesRes.json();
          setRoles(rolesJson.data.roles);
          setAllPermissions(rolesJson.data.allPermissions);
          if (rolesJson.data.roles.length > 0 && !newUserRoleId) {
            const staffRole = rolesJson.data.roles.find((r: RoleData) => r.name === "STAFF_RECEPTIONIST");
            setNewUserRoleId(staffRole?.id || rolesJson.data.roles[0].id);
          }
        }
      } catch {
        if (!ignore) {
          setNotification({ type: "error", message: "Failed to load users and roles." });
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }
    init();
    return () => {
      ignore = true;
    };
  }, [newUserRoleId]);

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  // Toggle permission for a role
  const handleTogglePermission = async (roleId: string, permissionKey: string) => {
    const role = roles.find((r) => r.id === roleId);
    if (!role) return;

    // Lockout protection: Owner cannot lose roles.manage
    if (role.name === "OWNER_ADMIN" && permissionKey === "roles.manage") {
      showNotification("error", "Lockout Protection: The Owner role cannot lose 'roles.manage'.");
      return;
    }

    const currentlyHas = role.permissions.includes(permissionKey);
    const updatedPermissions = currentlyHas
      ? role.permissions.filter((p) => p !== permissionKey)
      : [...role.permissions, permissionKey];

    // Optimistic UI update
    setRoles((prev) =>
      prev.map((r) => (r.id === roleId ? { ...r, permissions: updatedPermissions } : r))
    );

    try {
      const res = await fetch(`/api/admin/roles/${roleId}/permissions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissionKeys: updatedPermissions }),
      });

      if (!res.ok) {
        const err = await res.json();
        // Revert on failure
        setRoles((prev) =>
          prev.map((r) => (r.id === roleId ? { ...r, permissions: role.permissions } : r))
        );
        showNotification("error", err.error?.message || "Failed to update permission.");
      } else {
        showNotification("success", `Updated ${role.name} permissions. Changes applied immediately.`);
      }
    } catch {
      setRoles((prev) =>
        prev.map((r) => (r.id === roleId ? { ...r, permissions: role.permissions } : r))
      );
      showNotification("error", "Network error updating permission.");
    }
  };

  // Toggle user active status
  const handleToggleUserActive = async (user: UserData) => {
    const newStatus = !user.active;
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: newStatus }),
      });

      const json = await res.json();
      if (!res.ok) {
        showNotification("error", json.error?.message || "Failed to update user status.");
      } else {
        showNotification(
          "success",
          `${user.name} is now ${newStatus ? "activated" : "deactivated"}.`
        );
        setUsers((prev) =>
          prev.map((u) => (u.id === user.id ? { ...u, active: newStatus } : u))
        );
      }
    } catch {
      showNotification("error", "Network error updating user.");
    }
  };

  // Change user role
  const handleChangeUserRole = async (user: UserData, newRoleId: string) => {
    if (user.role.id === newRoleId) return;
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roleId: newRoleId }),
      });

      const json = await res.json();
      if (!res.ok) {
        showNotification("error", json.error?.message || "Failed to change user role.");
      } else {
        const selectedRole = roles.find((r) => r.id === newRoleId);
        showNotification("success", `Updated ${user.name}'s role to ${selectedRole?.name}.`);
        setUsers((prev) =>
          prev.map((u) =>
            u.id === user.id
              ? {
                  ...u,
                  role: {
                    id: newRoleId,
                    name: selectedRole?.name || u.role.name,
                    description: selectedRole?.description || null,
                  },
                }
              : u
          )
        );
      }
    } catch {
      showNotification("error", "Network error updating role.");
    }
  };

  // Handle Add User Submit
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingUser(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newUserName,
          email: newUserEmail,
          phone: newUserPhone || undefined,
          roleId: newUserRoleId,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        showNotification("error", json.error?.message || "Failed to create user.");
      } else {
        setCreatedTempPassword(json.data.temporaryPassword);
        showNotification("success", "User created successfully!");
        refreshData();
      }
    } catch {
      showNotification("error", "Network error creating user.");
    } finally {
      setIsSubmittingUser(false);
    }
  };

  // Generate password reset link
  const handleGenerateResetLink = async (user: UserData) => {
    setSelectedUserForReset(user);
    setGeneratedResetLink(null);
    setCopiedLink(false);
    setIsResetPasswordOpen(true);

    try {
      const res = await fetch(`/api/admin/users/${user.id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate_link" }),
      });

      const json = await res.json();
      if (res.ok) {
        setGeneratedResetLink(json.data.resetUrl);
      } else {
        showNotification("error", json.error?.message || "Failed to generate link.");
      }
    } catch {
      showNotification("error", "Network error generating link.");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.phone && u.phone.includes(searchQuery)) ||
      u.role.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <RoleGuard
      allowedRoles={[ROLES.OWNER_ADMIN]}
      requiredPermission={PERMISSION_KEYS.USERS_MANAGE}
      pageTitle="Users & Staff Management"
      activePath="/dashboard/users"
    >
      <AppShell activePath="/dashboard/users">
      <div className="space-y-6">
        {/* Page Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-[#1E1E1E] text-white">
                <ShieldCheck className="w-4 h-4" />
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-[#1E1E1E] tracking-tight">
                Users & Roles Management
              </h1>
            </div>
            <p className="text-xs text-[#71717A] mt-1">
              Three-level RBAC: Owner/Admin (Level 1), Manager (Level 2), Staff/Receptionist (Level 3).
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="blackPill"
              size="sm"
              onClick={() => {
                setCreatedTempPassword(null);
                setNewUserName("");
                setNewUserEmail("");
                setNewUserPhone("");
                setIsAddUserOpen(true);
              }}
              className="flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add Staff User</span>
            </Button>
          </div>
        </div>

        {/* Floating Notification */}
        {notification && (
          <div
            className={cn(
              "p-3.5 rounded-2xl text-xs font-semibold flex items-center justify-between animate-in fade-in duration-200",
              notification.type === "success"
                ? "bg-emerald-50 text-emerald-900 border border-emerald-200"
                : "bg-rose-50 text-rose-900 border border-rose-200"
            )}
          >
            <div className="flex items-center gap-2">
              {notification.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{notification.message}</span>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="text-current opacity-60 hover:opacity-100 cursor-pointer text-xs"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Tab Controls */}
        <div className="flex items-center justify-between border-b border-[#E4E4E7] pb-3">
          <Tabs
            tabs={[
              { id: "users", label: `Staff & Users (${users.length})` },
              { id: "permissions", label: "Permission Matrix & Limits" },
            ]}
            activeTab={activeTab}
            onChange={setActiveTab}
          />
        </div>

        {/* TAB 1: USERS LIST */}
        {activeTab === "users" && (
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="flex items-center justify-between gap-4">
              <div className="relative w-full max-w-sm">
                <Search className="w-4 h-4 text-[#71717A] absolute left-3.5 top-3 pointer-events-none" />
                <Input
                  placeholder="Search staff by name, email, phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-10 text-xs rounded-full"
                />
              </div>
              <div className="text-xs text-[#71717A]">
                Showing {filteredUsers.length} of {users.length} members
              </div>
            </div>

            {loading ? (
              <Card className="p-8 text-center text-xs text-[#71717A]">Loading users...</Card>
            ) : filteredUsers.length === 0 ? (
              <Card className="p-10 text-center">
                <p className="text-sm font-bold text-[#1E1E1E]">No staff users found</p>
                <p className="text-xs text-[#71717A] mt-1">Try refining your search query</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredUsers.map((user) => (
                  <Card
                    key={user.id}
                    className="p-5 flex flex-col justify-between hover:border-[#1E1E1E]/30 transition-all"
                  >
                    <div>
                      {/* User Top Row: Avatar & Status */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-[#1E1E1E] text-white flex items-center justify-center font-bold text-xs uppercase shadow-xs">
                            {user.name.slice(0, 2)}
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-[#1E1E1E] leading-tight">
                              {user.name}
                            </h3>
                            <p className="text-[11px] text-[#71717A]">{user.email}</p>
                          </div>
                        </div>

                        <StatusChip
                          status={user.active ? "green" : "grey"}
                          label={user.active ? "Active" : "Inactive"}
                        />
                      </div>

                      {/* Phone & Details */}
                      <div className="space-y-1.5 py-2 text-xs border-t border-[#F4F4F6]">
                        <div className="flex justify-between text-[#71717A]">
                          <span>Phone:</span>
                          <span className="font-medium text-[#1E1E1E]">
                            {user.phone || "Not set"}
                          </span>
                        </div>
                        <div className="flex justify-between text-[#71717A]">
                          <span>Security:</span>
                          <span className="font-medium text-[#1E1E1E]">
                            {user.mustChangePassword
                              ? "Password Reset Required"
                              : user.totpEnabled
                              ? "2FA Enabled"
                              : "Standard Password"}
                          </span>
                        </div>
                      </div>

                      {/* Role Selector */}
                      <div className="mt-3 pt-3 border-t border-[#F4F4F6]">
                        <Label className="text-[11px] text-[#71717A] mb-1">Assigned Role</Label>
                        <select
                          value={user.role.id}
                          onChange={(e) => handleChangeUserRole(user, e.target.value)}
                          className="w-full h-9 px-3 text-xs bg-[#F4F4F6] border border-[#E4E4E7] rounded-xl text-[#1E1E1E] font-semibold cursor-pointer focus:outline-none focus:border-[#1E1E1E]"
                        >
                          {roles.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Actions Bottom Bar */}
                    <div className="flex items-center gap-2 mt-4 pt-3 border-t border-[#F4F4F6]">
                      <Button
                        variant="outlinePill"
                        size="sm"
                        onClick={() => handleGenerateResetLink(user)}
                        className="flex-1 text-[11px] h-8 flex items-center justify-center gap-1.5"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                        <span>Reset Link</span>
                      </Button>

                      <Button
                        variant={user.active ? "outlinePill" : "blackPill"}
                        size="sm"
                        onClick={() => handleToggleUserActive(user)}
                        className={cn(
                          "h-8 px-3 text-[11px] flex items-center gap-1.5",
                          user.active ? "text-rose-600 hover:text-rose-700" : ""
                        )}
                      >
                        {user.active ? (
                          <>
                            <UserX className="w-3.5 h-3.5" />
                            <span>Deactivate</span>
                          </>
                        ) : (
                          <>
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Activate</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: PERMISSION MATRIX & LIMITS */}
        {activeTab === "permissions" && (
          <div className="space-y-6">
            {/* Explanatory Info Card */}
            <Card className="p-5 bg-white/70 border-[#E4E4E7]">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-2xl bg-[#1E1E1E] text-white flex items-center justify-center shrink-0">
                    <SlidersHorizontal className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-[#1E1E1E]">
                      Dynamic Server-Side Permission Matrix
                    </h2>
                    <p className="text-xs text-[#71717A] mt-0.5">
                      Toggle capabilities per role. All changes apply immediately without server restart.
                      Protected permissions like <code className="bg-black/5 px-1 py-0.5 rounded text-[11px]">roles.manage</code> for Owner cannot be removed.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-semibold text-[#1E1E1E]">Live Sync Active</span>
                </div>
              </div>

              {/* Role Limits Summary Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-[#F4F4F6]">
                <div className="p-3 bg-[#F4F4F6] rounded-2xl">
                  <span className="text-[10px] font-bold text-[#71717A] uppercase">Level 1: Owner/Admin</span>
                  <p className="text-xs font-bold text-[#1E1E1E] mt-0.5">Max Refund: Unlimited</p>
                  <p className="text-[11px] text-[#71717A]">Max Discount: 100%</p>
                </div>
                <div className="p-3 bg-[#F4F4F6] rounded-2xl">
                  <span className="text-[10px] font-bold text-[#71717A] uppercase">Level 2: Manager</span>
                  <p className="text-xs font-bold text-[#1E1E1E] mt-0.5">Max Refund: GH₵ 500.00</p>
                  <p className="text-[11px] text-[#71717A]">Max Discount: 20%</p>
                </div>
                <div className="p-3 bg-[#F4F4F6] rounded-2xl">
                  <span className="text-[10px] font-bold text-[#71717A] uppercase">Level 3: Staff/Receptionist</span>
                  <p className="text-xs font-bold text-[#1E1E1E] mt-0.5">Max Refund: GH₵ 50.00</p>
                  <p className="text-[11px] text-[#71717A]">Max Discount: 5%</p>
                </div>
              </div>
            </Card>

            {/* Matrix Table */}
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F4F4F6] border-b border-[#E4E4E7] text-[#71717A]">
                    <tr>
                      <th className="py-3 px-4 font-bold text-[#1E1E1E]">Permission Capability</th>
                      {roles.map((role) => (
                        <th key={role.id} className="py-3 px-4 font-bold text-center text-[#1E1E1E]">
                          <div className="flex flex-col items-center">
                            <span>{role.name}</span>
                            <span className="text-[10px] font-normal text-[#71717A]">
                              {role.name === "OWNER_ADMIN"
                                ? "Level 1"
                                : role.name === "MANAGER"
                                ? "Level 2"
                                : "Level 3"}
                            </span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-[#F4F4F6]">
                    {allPermissions.map((perm) => (
                      <tr key={perm.id} className="hover:bg-[#FAFAFB] transition-colors">
                        <td className="py-3 px-4">
                          <p className="font-semibold text-[#1E1E1E]">{perm.name}</p>
                          <p className="text-[11px] text-[#71717A]">{perm.description || perm.name}</p>
                        </td>

                        {roles.map((role) => {
                          const isAssigned = role.permissions.includes(perm.name);
                          const isLocked =
                            role.name === "OWNER_ADMIN" && perm.name === "roles.manage";

                          return (
                            <td key={role.id} className="py-3 px-4 text-center">
                              {isLocked ? (
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-black/5 text-[#71717A] rounded-full text-[11px] font-medium">
                                  <Lock className="w-3 h-3 text-[#1E1E1E]" />
                                  <span>Protected</span>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleTogglePermission(role.id, perm.name)}
                                  className={cn(
                                    "w-11 h-6 rounded-full transition-colors relative inline-block cursor-pointer",
                                    isAssigned ? "bg-[#1E1E1E]" : "bg-[#E4E4E7]"
                                  )}
                                  aria-label={`Toggle ${perm.name} for ${role.name}`}
                                >
                                  <span
                                    className={cn(
                                      "w-4 h-4 rounded-full bg-white transition-transform absolute top-1",
                                      isAssigned ? "right-1" : "left-1"
                                    )}
                                  />
                                </button>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* MODAL: ADD STAFF USER */}
        <Dialog
          isOpen={isAddUserOpen}
          onClose={() => setIsAddUserOpen(false)}
          title="Add New Staff Member"
          description="Create a team account. User will be prompted to change their password on first login."
        >
          {createdTempPassword ? (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-emerald-900 text-xs space-y-2">
                <p className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Staff Account Created Successfully
                </p>
                <p>
                  Share this temporary password with the staff member. They will be required to change it immediately upon login:
                </p>
                <div className="p-2.5 bg-white rounded-xl border border-emerald-300 font-mono text-sm font-bold text-[#1E1E1E] select-all">
                  {createdTempPassword}
                </div>
              </div>

              <Button
                variant="blackPill"
                className="w-full"
                onClick={() => {
                  setIsAddUserOpen(false);
                  setCreatedTempPassword(null);
                }}
              >
                Done
              </Button>
            </div>
          ) : (
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <Label>Full Name</Label>
                <Input
                  required
                  placeholder="e.g. Ama Mensah"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                />
              </div>

              <div>
                <Label>Email Address</Label>
                <Input
                  required
                  type="email"
                  placeholder="ama@beccascrown.gh"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                />
              </div>

              <div>
                <Label>Ghana Phone Number (Optional)</Label>
                <Input
                  placeholder="024 123 4567 or +233 24 123 4567"
                  value={newUserPhone}
                  onChange={(e) => setNewUserPhone(e.target.value)}
                />
              </div>

              <div>
                <Label>Role & Permissions Level</Label>
                <select
                  value={newUserRoleId}
                  onChange={(e) => setNewUserRoleId(e.target.value)}
                  className="w-full h-11 px-4 text-sm bg-white border border-[#E4E4E7] rounded-2xl text-[#1E1E1E] focus:outline-none focus:border-[#1E1E1E]"
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} - {r.description || "Access level"}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outlinePill"
                  onClick={() => setIsAddUserOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="blackPill"
                  disabled={isSubmittingUser}
                >
                  {isSubmittingUser ? "Creating..." : "Create Account"}
                </Button>
              </div>
            </form>
          )}
        </Dialog>

        {/* MODAL: RESET PASSWORD LINK */}
        <Dialog
          isOpen={isResetPasswordOpen}
          onClose={() => setIsResetPasswordOpen(false)}
          title="Staff Password Reset Link"
          description={`Single-use, 24-hour reset link for ${selectedUserForReset?.name}`}
        >
          <div className="space-y-4">
            {generatedResetLink ? (
              <div className="space-y-3">
                <p className="text-xs text-[#71717A]">
                  Send this secure link to the staff member. It expires in 24 hours:
                </p>
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={generatedResetLink}
                    className="text-xs font-mono select-all bg-[#F4F4F6]"
                  />
                  <Button
                    variant="blackPill"
                    size="sm"
                    onClick={() => copyToClipboard(generatedResetLink)}
                    className="shrink-0 flex items-center gap-1.5"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? "Copied" : "Copy"}</span>
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-[#71717A]">Generating secure token...</p>
            )}

            <div className="pt-2 flex justify-end">
              <Button
                variant="outlinePill"
                size="sm"
                onClick={() => setIsResetPasswordOpen(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </Dialog>
      </div>
    </AppShell>
    </RoleGuard>
  );
}
