"use client";

import { useAuth } from "@/components/Auth";
import { PageHeader } from "@/components/StatCard";
import { useToast } from "@/components/Toast";
import { EmptyState, TableSkeleton } from "@/components/ui";
import { api } from "@/lib/api";
import { dateTime } from "@/lib/format";
import type { User } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

export default function AdminPage() {
  const { user } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [pendingUsers, setPendingUsers] = useState<User[] | null>(null);
  const [processing, setProcessing] = useState<number | null>(null);

  const reload = useCallback(async () => {
    try {
      const users = await api.admin.pendingUsers();
      setPendingUsers(users);
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Failed to load pending users");
    }
  }, []);

  useEffect(() => {
    if (user && user.role !== "admin") {
      router.push("/");
      return;
    }
    reload();
  }, [user, router, reload]);

  async function approve(u: User) {
    setProcessing(u.id);
    try {
      await api.admin.approveUser(u.id);
      toast("success", `Approved "${u.username}"`);
      reload();
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
      reload();
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Rejection failed");
    } finally {
      setProcessing(null);
    }
  }

  if (user && user.role !== "admin") {
    return null;
  }

  return (
    <div>
      <PageHeader title="User Management" subtitle="Approve or reject new user registrations" />

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 shadow-sm">
        {!pendingUsers ? (
          <TableSkeleton rows={5} cols={4} />
        ) : pendingUsers.length === 0 ? (
          <EmptyState title="No pending users" hint="All user registrations have been reviewed." />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700 text-left text-[10px] tracking-wide text-slate-400 dark:text-slate-500 uppercase">
                <th className="px-5 py-3 font-bold">User</th>
                <th className="px-5 py-3 font-bold">Email</th>
                <th className="px-5 py-3 font-bold">Registered</th>
                <th className="px-5 py-3 text-right font-bold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pendingUsers.map((u) => (
                <tr key={u.id} className="border-t border-slate-50 dark:border-slate-700/50 transition-colors duration-200 hover:bg-slate-50 dark:hover:bg-slate-700">
                  <td className="px-5 py-4">
                    <p className="font-medium text-slate-800 dark:text-slate-200">{u.username}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">#{u.id}</p>
                  </td>
                  <td className="px-5 py-4 text-slate-600 dark:text-slate-400">{u.email}</td>
                  <td className="px-5 py-4 text-slate-500 dark:text-slate-400">{dateTime(u.created_at || "")}</td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex justify-end gap-1.5">
                      <button
                        onClick={() => approve(u)}
                        disabled={processing === u.id}
                        className="rounded-lg bg-emerald-50 dark:bg-emerald-900/30 px-3 py-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 transition-all duration-200 hover:scale-[1.02] hover:bg-emerald-100 dark:hover:bg-emerald-900/50 disabled:opacity-60"
                      >
                        {processing === u.id ? "..." : "Approve"}
                      </button>
                      <button
                        onClick={() => reject(u)}
                        disabled={processing === u.id}
                        className="rounded-lg bg-red-50 dark:bg-red-900/30 px-3 py-1.5 text-xs font-semibold text-red-600 dark:text-red-400 transition-all duration-200 hover:scale-[1.02] hover:bg-red-100 dark:hover:bg-red-900/50 disabled:opacity-60"
                      >
                        {processing === u.id ? "..." : "Reject"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
