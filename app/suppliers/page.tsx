"use client";

import { motion } from "motion/react";
import { PageHeader } from "@/components/StatCard";
import { useToast } from "@/components/Toast";
import { EmptyState, Modal, TableSkeleton } from "@/components/ui";
import { api, type SupplierInput } from "@/lib/api";
import { dateTime, naira, toNumber } from "@/lib/format";
import type { Product, Purchase, Supplier } from "@/lib/types";
import { useCallback, useEffect, useState } from "react";

const emptyForm: SupplierInput = { name: "", phone: "", email: "", address: "" };

export default function SuppliersPage() {
  const toast = useToast();
  const [suppliers, setSuppliers] = useState<Supplier[] | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [purchases, setPurchases] = useState<Purchase[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [form, setForm] = useState<SupplierInput>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [showPurchase, setShowPurchase] = useState(false);
  const [pSupplier, setPSupplier] = useState<number | "">("");
  const [pProduct, setPProduct] = useState<number | "">("");
  const [pQty, setPQty] = useState(10);
  const [pCost, setPCost] = useState<string>("");
  const [flashPurchase, setFlashPurchase] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const refresh = useCallback(async (p = page) => {
    try {
      const [supplierRes, productRes, purchasesList] = await Promise.all([
        api.suppliers.list(p),
        api.products.list(undefined, 1, 100),
        api.purchases.list(15),
      ]);
      setSuppliers(supplierRes.items);
      setTotalPages(supplierRes.pages);
      setTotal(supplierRes.total);
      setProducts(productRes.items);
      setPurchases(purchasesList);
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Failed to load suppliers");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    refresh(page);
  }, [refresh, page]);

  async function save() {
    if (!form.name.trim()) return toast("error", "Supplier name is required");
    setSaving(true);
    try {
      if (editing) {
        await api.suppliers.update(editing.id, form);
        toast("success", `Updated supplier "${form.name}"`);
      } else {
        await api.suppliers.create(form);
        toast("success", `Added supplier "${form.name}"`);
      }
      setShowForm(false);
      setEditing(null);
      setForm(emptyForm);
      refresh();
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

  function openEdit(s: Supplier) {
    setEditing(s);
    setForm({ name: s.name, phone: s.phone ?? "", email: s.email ?? "", address: s.address ?? "" });
    setShowForm(true);
  }

  async function remove(s: Supplier) {
    if (!window.confirm(`Delete supplier "${s.name}"? This cannot be undone.`)) return;
    try {
      await api.suppliers.remove(s.id);
      toast("success", `Deleted supplier "${s.name}"`);
      refresh();
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Delete failed");
    }
  }

  function openPurchase(supplier?: Supplier) {
    if (suppliers && suppliers.length === 0) return toast("error", "Add a supplier first");
    if (products.length === 0) return toast("error", "Add a product first — purchases restock products");
    setPSupplier(supplier ? supplier.id : "");
    setPProduct("");
    setPCost("");
    setPQty(10);
    setShowPurchase(true);
  }

  async function savePurchase() {
    if (pSupplier === "") return toast("error", "Choose a supplier");
    if (pProduct === "") return toast("error", "Choose a product to restock");
    if (!Number.isInteger(pQty) || pQty < 1) return toast("error", "Quantity must be a whole number >= 1");
    try {
      await api.purchases.create({
        supplier_id: pSupplier,
        product_id: pProduct,
        quantity: pQty,
        unit_cost: pCost === "" ? null : Math.max(0, toNumber(pCost)),
      });
      toast("success", `Purchase recorded — stock increased by ${pQty}`);
      setShowPurchase(false);
      setFlashPurchase(true);
      setTimeout(() => setFlashPurchase(false), 1200);
      refresh();
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Purchase failed");
    }
  }

  const selectedProduct = pProduct === "" ? null : products.find((p) => p.id === pProduct);
  const inputCls =
    "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition-colors duration-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:focus:ring-indigo-800";

  return (
    <div>
      <PageHeader title="Suppliers & Restocking" subtitle="Record purchases — stock updates automatically">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => openPurchase()}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:scale-[1.02] hover:bg-emerald-700 hover:shadow-md"
          >
            + Record Purchase
          </button>
          <button
            onClick={openAdd}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:scale-[1.02] hover:bg-indigo-700 hover:shadow-md"
          >
            + Add Supplier
          </button>
        </div>
      </PageHeader>

      <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {!suppliers ? (
          Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-600" />)
        ) : suppliers.length === 0 ? (
          <div className="sm:col-span-2 lg:col-span-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            <EmptyState title="No suppliers yet" hint="Add your first supplier to start recording restocks." />
          </div>
        ) : (
          suppliers.map((s, i) => (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.06 }}
              whileHover={{ scale: 1.02 }}
              className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm transition-shadow duration-300 hover:shadow-md"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800 dark:text-slate-200">{s.name}</p>
                  <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500 break-all sm:truncate">{[s.phone, s.email].filter(Boolean).join(" · ") || "No contact details"}</p>
                  {s.address && <p className="mt-1 text-xs text-slate-400 dark:text-slate-500 break-all sm:truncate">{s.address}</p>}
                </div>
                <div className="flex shrink-0 flex-row gap-2 sm:flex-col">
                  <button
                    onClick={() => openPurchase(s)}
                    className="flex-1 sm:flex-none rounded-lg bg-emerald-50 dark:bg-emerald-900/30 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 transition-all duration-200 hover:scale-[1.02] hover:bg-emerald-100 dark:hover:bg-emerald-900/50"
                  >
                    Restock
                  </button>
                  <button
                    onClick={() => openEdit(s)}
                    className="flex-1 sm:flex-none rounded-lg bg-slate-100 dark:bg-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 transition-all duration-200 hover:scale-[1.02] hover:bg-slate-200 dark:hover:bg-slate-600"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => remove(s)}
                    className="flex-1 sm:flex-none rounded-lg bg-red-50 dark:bg-red-900/30 px-3 py-1.5 text-xs font-semibold text-red-600 dark:text-red-400 transition-all duration-200 hover:scale-[1.02] hover:bg-red-100 dark:hover:bg-red-900/50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </section>

      {totalPages > 1 && (
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Showing {((page - 1) * 20) + 1}–{Math.min(page * 20, total)} of {total} suppliers
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 transition-colors hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40"
            >
              Prev
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const p = page <= 3 ? i + 1 : page + i - 2;
              if (p < 1 || p > totalPages) return null;
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
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
              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 transition-colors hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
        <div className="border-b border-slate-100 dark:border-slate-700 px-5 py-4">
          <h2 className="text-sm font-bold tracking-wide text-slate-500 dark:text-slate-400 uppercase">Recent Purchases</h2>
        </div>
        {!purchases ? (
          <TableSkeleton rows={5} cols={5} />
        ) : purchases.length === 0 ? (
          <EmptyState title="No purchases recorded yet" />
        ) : (
          <>
            <div className="hidden sm:block">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-700 text-left text-xs tracking-wide text-slate-400 dark:text-slate-500 uppercase">
                    <th className="px-5 py-3 font-semibold">Product</th>
                    <th className="px-3 py-3 font-semibold">Supplier</th>
                    <th className="px-3 py-3 text-right font-semibold">Qty</th>
                    <th className="px-3 py-3 text-right font-semibold">Unit Cost</th>
                    <th className="px-5 py-3 text-right font-semibold">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {purchases.map((p, i) => (
                    <tr
                      key={p.id}
                      className={`border-b border-slate-50 dark:border-slate-700 last:border-0 ${
                        flashPurchase && i === 0 ? "bg-emerald-50 dark:bg-emerald-900/20 transition-colors duration-700" : ""
                      }`}
                    >
                      <td className="px-5 py-3 font-medium text-slate-800 dark:text-slate-200">{p.product_name}</td>
                      <td className="px-3 py-3 text-slate-500 dark:text-slate-400">{p.supplier_name}</td>
                      <td className="px-3 py-3 text-right tabular-nums text-slate-700 dark:text-slate-300">{p.quantity}</td>
                      <td className="px-3 py-3 text-right tabular-nums text-slate-500 dark:text-slate-400">{naira(p.unit_cost)}</td>
                      <td className="px-5 py-3 text-right text-xs whitespace-nowrap text-slate-400 dark:text-slate-500">{dateTime(p.purchase_date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="sm:hidden divide-y divide-slate-100 dark:divide-slate-700">
              {purchases.map((p, i) => (
                <div
                  key={p.id}
                  className={`px-4 py-3 ${
                    flashPurchase && i === 0 ? "bg-emerald-50 dark:bg-emerald-900/20 transition-colors duration-700" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-800 dark:text-slate-200">{p.product_name}</p>
                      <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">{p.supplier_name}</p>
                    </div>
                    <p className="shrink-0 text-xs text-slate-400 dark:text-slate-500">{dateTime(p.purchase_date)}</p>
                  </div>
                  <div className="mt-2 flex items-center gap-3 text-xs">
                    <span className="rounded-md bg-slate-100 dark:bg-slate-700 px-2 py-0.5 font-medium tabular-nums text-slate-700 dark:text-slate-300">
                      Qty: {p.quantity}
                    </span>
                    <span className="rounded-md bg-slate-100 dark:bg-slate-700 px-2 py-0.5 font-medium tabular-nums text-slate-700 dark:text-slate-300">
                      {naira(p.unit_cost)}/unit
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      <Modal
        open={showForm}
        onClose={() => {
          setShowForm(false);
          setEditing(null);
        }}
        title={editing ? "Edit Supplier" : "Add Supplier"}
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Name *</label>
            <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Business name" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Phone</label>
              <input className={inputCls} value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="0803…" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Email</label>
              <input type="email" className={inputCls} value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="sales@supplier.com" />
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
              {saving ? "Saving…" : editing ? "Save Changes" : "Add Supplier"}
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={showPurchase} onClose={() => setShowPurchase(false)} title="Record Purchase / Restock">
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Supplier</label>
            <select className={inputCls} value={pSupplier} onChange={(e) => setPSupplier(e.target.value === "" ? "" : Number(e.target.value))}>
              <option value="">Choose supplier…</option>
              {(suppliers ?? []).map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Product</label>
            <select
              className={inputCls}
              value={pProduct}
              onChange={(e) => {
                setPProduct(e.target.value === "" ? "" : Number(e.target.value));
                setPCost("");
              }}
            >
              <option value="">Choose product…</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({p.quantity_in_stock} in stock)</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Quantity received</label>
              <input
                type="number"
                min={1}
                className={inputCls}
                value={pQty}
                onChange={(e) => setPQty(Math.max(1, Math.floor(Number(e.target.value) || 1)))}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Unit cost (₦)</label>
              <input type="number" min={0} step="0.01" className={inputCls} value={pCost} onChange={(e) => setPCost(e.target.value)} placeholder={selectedProduct ? `default ${naira(selectedProduct.cost_price)}` : "optional"} />
            </div>
          </div>
          {selectedProduct && (
            <p className="rounded-lg bg-slate-50 dark:bg-slate-700/30 px-3 py-2 text-xs text-slate-500 dark:text-slate-400">
              Stock will go from <strong>{selectedProduct.quantity_in_stock}</strong> to{" "}
              <strong>{selectedProduct.quantity_in_stock + pQty}</strong> after saving.
            </p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setShowPurchase(false)} className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-500 dark:text-slate-400 transition-colors duration-200 hover:bg-slate-100 dark:hover:bg-slate-700">
              Cancel
            </button>
            <button onClick={savePurchase} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors duration-200 hover:scale-[1.02] hover:bg-emerald-700">
              Save Purchase
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
