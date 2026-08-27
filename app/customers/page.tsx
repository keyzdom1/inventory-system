"use client";

import { motion } from "motion/react";
import { PageHeader } from "@/components/StatCard";
import { useToast } from "@/components/Toast";
import { EmptyState, Modal, TableSkeleton } from "@/components/ui";
import { api, type CustomerInput } from "@/lib/api";
import { dateTime, naira } from "@/lib/format";
import type { Customer, CustomerHistory } from "@/lib/types";
import { useCallback, useEffect, useState } from "react";

const emptyForm: CustomerInput = { name: "", phone: "", email: "", address: "" };

export default function CustomersPage() {
  const toast = useToast();
  const [customers, setCustomers] = useState<Customer[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState<CustomerInput>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [history, setHistory] = useState<Record<number, CustomerHistory | "loading" | "error">>({});
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const reload = useCallback(async (p = page) => {
    try {
      const res = await api.customers.list(p);
      setCustomers(res.items);
      setTotalPages(res.pages);
      setTotal(res.total);
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Failed to load customers");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    reload(page);
  }, [reload, page]);

  async function toggleHistory(id: number) {
    if (expanded === id) {
      setExpanded(null);
      return;
    }
    setExpanded(id);
    if (!history[id]) {
      setHistory((h) => ({ ...h, [id]: "loading" }));
      try {
        const hist = await api.customers.history(id);
        setHistory((h) => ({ ...h, [id]: hist }));
      } catch {
        setHistory((h) => ({ ...h, [id]: "error" }));
      }
    }
  }

  async function save() {
    if (!form.name.trim()) return toast("error", "Customer name is required");
    setSaving(true);
    try {
      if (editing) {
        await api.customers.update(editing.id, form);
        toast("success", `Updated "${form.name}"`);
      } else {
        await api.customers.create(form);
        toast("success", `Added "${form.name}"`);
      }
      setShowForm(false);
      setEditing(null);
      setForm(emptyForm);
      reload();
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function openAdd() {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function openEdit(c: Customer) {
    setEditing(c);
    setForm({ name: c.name, phone: c.phone ?? "", email: c.email ?? "", address: c.address ?? "" });
    setShowForm(true);
  }

  async function remove(c: Customer) {
    if (!window.confirm(`Delete "${c.name}"? This cannot be undone.`)) return;
    try {
      await api.customers.remove(c.id);
      toast("success", `Deleted "${c.name}"`);
      reload();
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Delete failed");
    }
  }

  const inputCls =
    "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition-colors duration-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:focus:ring-indigo-800";

  return (
    <div>
      <PageHeader title="Customers" subtitle="Track everyone who shops with you">
        <button
          onClick={openAdd}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:scale-[1.02] hover:bg-indigo-700 hover:shadow-md"
        >
          + Add Customer
        </button>
      </PageHeader>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 shadow-sm">
        {!customers ? (
          <TableSkeleton rows={6} cols={4} />
        ) : customers.length === 0 ? (
          <EmptyState title="No customers yet" hint="Walk-in sales don't need a customer record — add regulars here." />
        ) : (
          <ul className="divide-y divide-slate-50">
            {customers.map((c) => {
              const open = expanded === c.id;
              const h = history[c.id];
              return (
                <li key={c.id}>
                  <div className="flex items-center justify-between gap-3 px-5 py-4 transition-colors duration-200 hover:bg-slate-50 dark:hover:bg-slate-700">
                    <motion.button
                      onClick={() => toggleHistory(c.id)}
                      whileHover={{ scale: 1.005 }}
                      className="flex min-w-0 flex-1 items-center justify-between gap-4 text-left"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-slate-800 dark:text-slate-200">{c.name}</p>
                        <p className="truncate text-xs text-slate-400 dark:text-slate-500">
                          {[c.phone, c.email].filter(Boolean).join(" · ") || "No contact details"}
                        </p>
                      </div>
                      <span className={`shrink-0 text-xs font-semibold transition-transform duration-300 ${open ? "rotate-180 text-indigo-500" : "text-slate-400 dark:text-slate-500"}`}>
                        ▼
                      </span>
                    </motion.button>
                    <div className="flex shrink-0 gap-1.5">
                      <button
                        onClick={() => openEdit(c)}
                        className="rounded-lg bg-slate-100 px-2.5 py-1.5 dark:bg-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-400 transition-all duration-200 hover:scale-[1.02] hover:bg-slate-200"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => remove(c)}
                        className="rounded-lg bg-red-50 dark:bg-red-900/30 px-2.5 py-1.5 text-xs font-semibold text-red-600 dark:text-red-400 transition-all duration-200 hover:scale-[1.02] hover:bg-red-100 dark:hover:bg-red-900/50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {open && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden bg-slate-50/60 dark:bg-slate-700/30"
                    >
                      <div className="px-5 pt-1 pb-4">
                        {c.address && <p className="mb-3 text-xs text-slate-400 dark:text-slate-500">{c.address}</p>}
                        {!h || h === "loading" ? (
                          <div className="h-16 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-700" />
                        ) : h === "error" ? (
                          <p className="text-sm text-red-600 dark:text-red-400">Couldn&apos;t load purchase history.</p>
                        ) : h.sales.length === 0 ? (
                          <p className="py-2 text-sm text-slate-400 dark:text-slate-500">No purchases yet.</p>
                        ) : (
                          <>
                            <div className="mb-3 flex gap-6">
                              <div>
                                <p className="text-[10px] font-bold tracking-wide text-slate-400 dark:text-slate-500 uppercase">Total spent</p>
                                <p className="text-base font-black tabular-nums text-slate-800 dark:text-slate-200">{naira(h.total_spent)}</p>
                              </div>
                              <div>
                                <p className="text-[10px] font-bold tracking-wide text-slate-400 dark:text-slate-500 uppercase">Purchases</p>
                                <p className="text-base font-black tabular-nums text-slate-800 dark:text-slate-200">{h.sales_count}</p>
                              </div>
                            </div>
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="text-left text-[10px] tracking-wide text-slate-400 dark:text-slate-500 uppercase">
                                  <th className="py-1.5 pr-4 font-bold">Sale</th>
                                  <th className="py-1.5 pr-4 font-bold">Date</th>
                                  <th className="py-1.5 pr-4 text-right font-bold">Items</th>
                                  <th className="py-1.5 text-right font-bold">Amount</th>
                                </tr>
                              </thead>
                              <tbody>
                                {h.sales.map((s) => (
                                  <tr key={s.sale_id} className="border-t border-slate-100 dark:border-slate-700">
                                    <td className="py-2 pr-4 text-slate-500 dark:text-slate-400">#{s.sale_id}</td>
                                    <td className="py-2 pr-4 text-slate-600 dark:text-slate-400">{dateTime(s.sale_date)}</td>
                                    <td className="py-2 pr-4 text-right tabular-nums text-slate-600 dark:text-slate-400">{s.items_count}</td>
                                    <td className="py-2 text-right font-semibold tabular-nums text-slate-800 dark:text-slate-200">{naira(s.total_amount)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </>
                        )}
                      </div>
                    </motion.div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Showing {((page - 1) * 20) + 1}–{Math.min(page * 20, total)} of {total} customers
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 transition-colors duration-200 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40"
            >
              Previous
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const p = page <= 3 ? i + 1 : page + i - 2;
              if (p < 1 || p > totalPages) return null;
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors duration-200 ${
                    p === page ? "bg-indigo-600 text-white" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                  }`}
                >
                  {p}
                </button>
              );
            })}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 transition-colors duration-200 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}

      <Modal
        open={showForm}
        onClose={() => {
          setShowForm(false);
          setEditing(null);
        }}
        title={editing ? "Edit Customer" : "Add Customer"}
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Name *</label>
            <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full name" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Phone</label>
              <input className={inputCls} value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="0803…" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Email</label>
              <input type="email" className={inputCls} value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="name@mail.com" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Address</label>
            <input className={inputCls} value={form.address ?? ""} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Street, city" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => {
                setShowForm(false);
                setEditing(null);
              }}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-500 dark:text-slate-400 transition-colors duration-200 hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:scale-[1.02] hover:bg-indigo-700 disabled:opacity-60"
            >
              {saving ? "Saving…" : editing ? "Save Changes" : "Add Customer"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
