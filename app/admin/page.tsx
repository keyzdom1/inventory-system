"use client";

import { useAuth } from "@/components/Auth";
import { PageHeader, StatCard } from "@/components/StatCard";
import { useToast } from "@/components/Toast";
import { EmptyState, Modal, TableSkeleton } from "@/components/ui";
import { api } from "@/lib/api";
import { dateTime } from "@/lib/format";
import type { Role, User, UserStats } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

const ROLES: { value: Role; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "manager", label: "Manager" },
  { value: "cashier", label: "Cashier" },
  { value: "salesperson", label: "Salesperson" },
  { value: "inventory_clerk", label: "Inventory Clerk" },
  { value: "accountant", label: "Accountant" },
  { value: "user", label: "User" },
];

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  manager: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
  cashier: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  salesperson: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
  inventory_clerk: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  accountant: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
  user: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400",
};

function roleBadge(role: string) {
  return ROLE_COLORS[role] || ROLE_COLORS.user;
}

function statusBadge(u: User) {
  if (!u.is_approved) return { text: "Pending", cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" };
  if (!u.is_active) return { text: "Inactive", cls: "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400" };
  return { text: "Active", cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" };
}

export default function AdminPage() {
  const { user } = useAuth();
  const router = useRouter();
  const toast = useToast();

  const [users, setUsers] = useState<User[] | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [processing, setProcessing] = useState<number | null>(null);

  // Modal state
  const [roleModalUser, setRoleModalUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role>("user");
  const [deleteModalUser, setDeleteModalUser] = useState<User | null>(null);
  const [approveModalUser, setApproveModalUser] = useState<User | null>(null);
  const [approveRole, setApproveRole] = useState<Role>("cashier");

  const loadData = useCallback(async () => {
    try {
      const [u, s] = await Promise.all([
        api.admin.listUsers({
          role: roleFilter || undefined,
          status: statusFilter || undefined,
          q: search || undefined,
        }),
        api.admin.userStats(),
      ]);
      setUsers(u);
      setStats(s);
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Failed to load users");
    }
  }, [roleFilter, statusFilter, search]);

  useEffect(() => {
    if (user && user.role !== "admin") {
      router.push("/");
      return;
    }
    loadData();
  }, [user, router, loadData]);

  async function approve(u: User) {
    setProcessing(u.id);
    try {
      await api.admin.approveUser(u.id, approveRole);
      toast("success", `Approved "${u.username}" as ${approveRole}`);
      setApproveModalUser(null);
      loadData();
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Approval failed");
    } finally {
      setProcessing(null);
    }
  }

  async function reject(u: User) {
    if (!window.confirm(`Reject and delete "${u.username}"? This cannot be undone.`)) return;
    setProcessing(u.id);
    try {
      await api.admin.rejectUser(u.id);
      toast("success", `Rejected "${u.username}"`);
      loadData();
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Rejection failed");
    } finally {
      setProcessing(null);
    }
  }

  async function changeRole() {
    if (!roleModalUser) return;
    setProcessing(roleModalUser.id);
    try {
      await api.admin.updateUserRole(roleModalUser.id, selectedRole);
      toast("success", `Changed "${roleModalUser.username}" role to ${selectedRole}`);
      setRoleModalUser(null);
      loadData();
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Failed to change role");
    } finally {
      setProcessing(null);
    }
  }

  async function toggleActive(u: User) {
    setProcessing(u.id);
    try {
      await api.admin.updateUserStatus(u.id, !u.is_active);
      toast("success", `${u.is_active ? "Deactivated" : "Activated"} "${u.username}"`);
      loadData();
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Failed to update status");
    } finally {
      setProcessing(null);
    }
  }

  async function deleteUser() {
    if (!deleteModalUser) return;
    setProcessing(deleteModalUser.id);
    try {
      await api.admin.deleteUser(deleteModalUser.id);
      toast("success", `Deleted "${deleteModalUser.username}"`);
      setDeleteModalUser(null);
      loadData();
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Failed to delete user");
    } finally {
      setProcessing(null);
    }
  }

  const filteredUsers = useMemo(() => {
    if (!users) return null;
    return users;
  }, [users]);

  if (user && user.role !== "admin") return null;

  return (
    <div>
      <PageHeader title="User Management" subtitle="Manage roles and access for all users" />

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total Users" value={stats?.total ?? 0} accent="indigo" delay={0} />
        <StatCard label="Active" value={stats?.active ?? 0} accent="emerald" delay={0.05} />
        <StatCard label="Pending Approval" value={stats?.pending ?? 0} accent="amber" delay={0.1} pulse />
        <StatCard
          label="Roles Assigned"
          value={stats ? stats.total - stats.pending : 0}
          accent="violet"
          delay={0.15}
        />
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 sm:max-w-xs">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-800 placeholder-slate-400 transition-colors focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:placeholder-slate-500 dark:focus:border-indigo-500"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition-colors focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
        >
          <option value="">All Roles</option>
          {ROLES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition-colors focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        {!filteredUsers ? (
          <TableSkeleton rows={6} cols={5} />
        ) : filteredUsers.length === 0 ? (
          <EmptyState title="No users found" hint="Try adjusting your search or filters." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700 text-left text-[10px] tracking-wide text-slate-400 dark:text-slate-500 uppercase">
                  <th className="px-5 py-3 font-bold">User</th>
                  <th className="px-5 py-3 font-bold">Role</th>
                  <th className="px-5 py-3 font-bold">Status</th>
                  <th className="px-5 py-3 font-bold hidden sm:table-cell">Joined</th>
                  <th className="px-5 py-3 text-right font-bold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => {
                  const st = statusBadge(u);
                  return (
                    <tr
                      key={u.id}
                      className="border-t border-slate-50 dark:border-slate-700/50 transition-colors duration-200 hover:bg-slate-50 dark:hover:bg-slate-700"
                    >
                      <td className="px-5 py-4">
                        <p className="font-medium text-slate-800 dark:text-slate-200">{u.username}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500">{u.email}</p>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${roleBadge(u.role)}`}>
                          {u.role.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${st.cls}`}>
                          {st.text}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-500 dark:text-slate-400 hidden sm:table-cell">
                        —
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Pending approval actions */}
                          {!u.is_approved && (
                            <>
                              <button
                                onClick={() => { setApproveRole("cashier"); setApproveModalUser(u); }}
                                disabled={processing === u.id}
                                className="rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-600 transition-all duration-200 hover:bg-emerald-100 disabled:opacity-60 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50"
                              >
                                {processing === u.id ? "..." : "Approve"}
                              </button>
                              <button
                                onClick={() => reject(u)}
                                disabled={processing === u.id}
                                className="rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-600 transition-all duration-200 hover:bg-red-100 disabled:opacity-60 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50"
                              >
                                {processing === u.id ? "..." : "Reject"}
                              </button>
                            </>
                          )}

                          {/* Approved user actions */}
                          {u.is_approved && (
                            <>
                              <button
                                onClick={() => {
                                  setSelectedRole(u.role as Role);
                                  setRoleModalUser(u);
                                }}
                                disabled={processing === u.id || u.role === "admin" && u.id === user?.id}
                                className="rounded-lg bg-indigo-50 px-2.5 py-1.5 text-xs font-semibold text-indigo-600 transition-all duration-200 hover:bg-indigo-100 disabled:opacity-60 dark:bg-indigo-900/30 dark:text-indigo-400 dark:hover:bg-indigo-900/50"
                                title="Change role"
                              >
                                Role
                              </button>
                              <button
                                onClick={() => toggleActive(u)}
                                disabled={
                                  processing === u.id ||
                                  (u.role === "admin" && u.id === user?.id) ||
                                  (u.role === "admin" && u.is_active)
                                }
                                className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all duration-200 disabled:opacity-60 ${
                                  u.is_active
                                    ? "bg-amber-50 text-amber-600 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400 dark:hover:bg-amber-900/50"
                                    : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50"
                                }`}
                                title={u.is_active ? "Deactivate" : "Activate"}
                              >
                                {processing === u.id ? "..." : u.is_active ? "Deactivate" : "Activate"}
                              </button>
                              <button
                                onClick={() => setDeleteModalUser(u)}
                                disabled={processing === u.id || u.role === "admin"}
                                className="rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-600 transition-all duration-200 hover:bg-red-100 disabled:opacity-60 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50"
                                title="Delete user"
                              >
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                                </svg>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Role Change Modal */}
      <Modal open={!!roleModalUser} onClose={() => setRoleModalUser(null)} title="Change User Role">
        {roleModalUser && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Changing role for <span className="font-semibold text-slate-800 dark:text-slate-200">{roleModalUser.username}</span>
            </p>
            <div className="space-y-2">
              {ROLES.map((r) => (
                <label
                  key={r.value}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-all duration-200 ${
                    selectedRole === r.value
                      ? "border-indigo-400 bg-indigo-50 dark:border-indigo-500 dark:bg-indigo-900/30"
                      : "border-slate-200 hover:border-slate-300 dark:border-slate-600 dark:hover:border-slate-500"
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={r.value}
                    checked={selectedRole === r.value}
                    onChange={() => setSelectedRole(r.value)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{r.label}</span>
                    <span className={`ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${roleBadge(r.value)}`}>
                      {r.value}
                    </span>
                  </div>
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setRoleModalUser(null)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={changeRole}
                disabled={processing === roleModalUser.id || selectedRole === roleModalUser.role}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-60"
              >
                {processing === roleModalUser.id ? "Saving..." : "Save Role"}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal open={!!deleteModalUser} onClose={() => setDeleteModalUser(null)} title="Delete User">
        {deleteModalUser && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-slate-800 dark:text-slate-200">{deleteModalUser.username}</span>?
              This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteModalUser(null)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={deleteUser}
                disabled={processing === deleteModalUser.id}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
              >
                {processing === deleteModalUser.id ? "Deleting..." : "Delete User"}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Approve User Modal with Role Selection */}
      <Modal open={!!approveModalUser} onClose={() => setApproveModalUser(null)} title="Approve User">
        {approveModalUser && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Approve <span className="font-semibold text-slate-800 dark:text-slate-200">{approveModalUser.username}</span> and assign a role:
            </p>
            <div className="space-y-2">
              {ROLES.filter((r) => r.value !== "admin").map((r) => (
                <label
                  key={r.value}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-all duration-200 ${
                    approveRole === r.value
                      ? "border-emerald-400 bg-emerald-50 dark:border-emerald-500 dark:bg-emerald-900/30"
                      : "border-slate-200 hover:border-slate-300 dark:border-slate-600 dark:hover:border-slate-500"
                  }`}
                >
                  <input
                    type="radio"
                    name="approve-role"
                    value={r.value}
                    checked={approveRole === r.value}
                    onChange={() => setApproveRole(r.value)}
                    className="h-4 w-4 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{r.label}</span>
                    <span className={`ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${roleBadge(r.value)}`}>
                      {r.value}
                    </span>
                  </div>
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setApproveModalUser(null)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={() => approve(approveModalUser)}
                disabled={processing === approveModalUser.id}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-60"
              >
                {processing === approveModalUser.id ? "Approving..." : `Approve as ${approveRole}`}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
