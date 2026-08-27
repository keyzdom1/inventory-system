"use client";

import { PageHeader } from "@/components/StatCard";
import { useToast } from "@/components/Toast";
import { EmptyState, Modal, TableSkeleton } from "@/components/ui";
import { api, type ProductInput } from "@/lib/api";
import { naira, toNumber } from "@/lib/format";
import type { Product, Supplier } from "@/lib/types";
import { useEffect, useState } from "react";
import { motion } from "motion/react";

const emptyForm: ProductInput = {
  name: "",
  category: "",
  cost_price: 0,
  selling_price: 0,
  quantity_in_stock: 0,
  reorder_level: 5,
};

export default function ProductsPage() {
  const toast = useToast();
  const [products, setProducts] = useState<Product[] | null>(null);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Product | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<ProductInput>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [restocking, setRestocking] = useState<Product | null>(null);
  const [restockQty, setRestockQty] = useState(10);
  const [restockSupplier, setRestockSupplier] = useState<number | "">("");
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [flashId, setFlashId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => {
      api.products
        .list(query || undefined, page)
        .then((res) => {
          setProducts(res.items);
          setTotalPages(res.pages);
          setTotal(res.total);
        })
        .catch((e) => toast("error", e instanceof Error ? e.message : "Failed to load products"));
    }, query ? 250 : 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, page]);

  useEffect(() => {
    api.suppliers.list(1, 100).then((res) => setSuppliers(res.items)).catch(() => {});
  }, []);

  function flash(id: number) {
    setFlashId(id);
    setTimeout(() => setFlashId(null), 1200);
  }

  function openEdit(p: Product) {
    setEditing(p);
    setForm({
      name: p.name,
      category: p.category,
      cost_price: toNumber(p.cost_price),
      selling_price: toNumber(p.selling_price),
      quantity_in_stock: p.quantity_in_stock,
      reorder_level: p.reorder_level,
    });
  }

  function openAdd() {
    setEditing(null);
    setForm(emptyForm);
    setShowAdd(true);
  }

  async function save() {
    if (!form.name.trim()) return toast("error", "Product name is required");
    if (toNumber(form.selling_price) < toNumber(form.cost_price))
      return toast("error", "Selling price cannot be below cost price");
    setSaving(true);
    try {
      if (editing) {
        await api.products.update(editing.id, form);
        flash(editing.id);
        toast("success", `Updated "${form.name}"`);
      } else {
        const created = await api.products.create(form);
        flash(created.id);
        toast("success", `Added "${created.name}"`);
        setShowAdd(false);
      }
      const res = await api.products.list(query || undefined, page);
      setProducts(res.items);
      setTotalPages(res.pages);
      setTotal(res.total);
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function remove(p: Product) {
    if (!window.confirm(`Delete "${p.name}"? This cannot be undone.`)) return;
    try {
      await api.products.remove(p.id);
      toast("success", `Deleted "${p.name}"`);
      const res = await api.products.list(query || undefined, page);
      setProducts(res.items);
      setTotalPages(res.pages);
      setTotal(res.total);
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Delete failed");
    }
  }

  async function restock() {
    if (!restocking) return;
    if (restockSupplier === "") return toast("error", "Choose a supplier first");
    if (restockQty <= 0) return toast("error", "Quantity must be at least 1");
    try {
      await api.purchases.create({
        supplier_id: Number(restockSupplier),
        product_id: restocking.id,
        quantity: restockQty,
        unit_cost: null,
      });
      toast("success", `Restocked ${restockQty} × ${restocking.name}`);
      setRestocking(null);
      setRestockQty(10);
      flash(restocking.id);
      const res = await api.products.list(query || undefined, page);
      setProducts(res.items);
      setTotalPages(res.pages);
      setTotal(res.total);
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Restock failed");
    }
  }

  const inputCls =
    "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition-colors duration-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:focus:ring-indigo-800";
  const labelCls = "mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400";

  return (
    <div>
      <PageHeader title="Products" subtitle="Manage stock, prices, and reorder levels">
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setPage(1); }}
          placeholder="Search name or category…"
          className="w-52 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition-colors duration-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:focus:ring-indigo-800"
        />
        <button
          onClick={openAdd}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:scale-[1.02] hover:bg-indigo-700 hover:shadow-md"
        >
          + Add Product
        </button>
      </PageHeader>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        {!products ? (
          <TableSkeleton rows={6} cols={6} />
        ) : products.length === 0 ? (
          <EmptyState title={query ? `No products match "${query}"` : "No products yet"} hint="Add your first product to get started." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs tracking-wide text-slate-400 uppercase dark:border-slate-700 dark:text-slate-500">
                  <th className="px-5 py-3 font-semibold">Product</th>
                  <th className="px-3 py-3 text-right font-semibold">Cost</th>
                  <th className="px-3 py-3 text-right font-semibold">Price</th>
                  <th className="px-3 py-3 text-right font-semibold">Stock</th>
                  <th className="px-3 py-3 text-right font-semibold">Reorder At</th>
                  <th className="px-5 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => {
                  const low = p.quantity_in_stock <= p.reorder_level;
                  return (
                    <motion.tr
                      key={p.id}
                      animate={flashId === p.id ? { backgroundColor: ["#fef3c7", "#ffffff"] } : { backgroundColor: "#ffffff" }}
                      transition={{ duration: 1 }}
                      className="border-b border-slate-50 last:border-0 dark:border-slate-700"
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-800 dark:text-slate-200">{p.name}</span>
                          {low && (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold tracking-wide text-amber-700 uppercase dark:bg-amber-900/30 dark:text-amber-400">
                              Low
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-slate-400 dark:text-slate-500">{p.category}</span>
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-slate-500 dark:text-slate-400">{naira(p.cost_price)}</td>
                      <td className="px-3 py-3 text-right font-semibold tabular-nums text-slate-800 dark:text-slate-200">{naira(p.selling_price)}</td>
                      <td className={`px-3 py-3 text-right font-semibold tabular-nums ${low ? "text-amber-600" : "text-slate-700 dark:text-slate-300"}`}>
                        {p.quantity_in_stock}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-slate-400 dark:text-slate-500">{p.reorder_level}</td>
                      <td className="px-5 py-3">
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => setRestocking(p)}
                            className="rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 transition-all duration-200 hover:scale-[1.02] hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50"
                          >
                            Restock
                          </button>
                          <button
                            onClick={() => openEdit(p)}
                            className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition-all duration-200 hover:scale-[1.02] hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-400 dark:hover:bg-slate-600"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => remove(p)}
                            className="rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-600 transition-all duration-200 hover:scale-[1.02] hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Showing {((page - 1) * 20) + 1}–{Math.min(page * 20, total)} of {total} products
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors duration-200 hover:bg-slate-100 disabled:opacity-40 dark:text-slate-400 dark:hover:bg-slate-700"
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
                    p === page ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
                  }`}
                >
                  {p}
                </button>
              );
            })}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors duration-200 hover:bg-slate-100 disabled:opacity-40 dark:text-slate-400 dark:hover:bg-slate-700"
            >
              Next
            </button>
          </div>
        </div>
      )}

      <Modal open={showAdd || editing !== null} onClose={() => { setShowAdd(false); setEditing(null); }} title={editing ? "Edit Product" : "Add Product"}>
        <div className="space-y-4">
          <div>
            <label className={labelCls}>Name</label>
            <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. HP Pavilion 15 Laptop" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Category</label>
              <input className={inputCls} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Laptops" />
            </div>
            <div>
              <label className={labelCls}>Reorder level</label>
              <input type="number" min={0} className={inputCls} value={form.reorder_level} onChange={(e) => setForm({ ...form, reorder_level: Math.max(0, Number(e.target.value)) })} />
            </div>
            <div>
              <label className={labelCls}>Cost price (₦)</label>
              <input type="number" min={0} step="0.01" className={inputCls} value={form.cost_price} onChange={(e) => setForm({ ...form, cost_price: Math.max(0, Number(e.target.value)) })} />
            </div>
            <div>
              <label className={labelCls}>Selling price (₦)</label>
              <input type="number" min={0} step="0.01" className={inputCls} value={form.selling_price} onChange={(e) => setForm({ ...form, selling_price: Math.max(0, Number(e.target.value)) })} />
            </div>
            {!editing && (
              <div>
                <label className={labelCls}>Opening stock</label>
                <input type="number" min={0} className={inputCls} value={form.quantity_in_stock} onChange={(e) => setForm({ ...form, quantity_in_stock: Math.max(0, Number(e.target.value)) })} />
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => { setShowAdd(false); setEditing(null); }} className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-500 transition-colors duration-200 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700">
              Cancel
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:scale-[1.02] hover:bg-indigo-700 disabled:opacity-60"
            >
              {saving ? "Saving…" : editing ? "Save Changes" : "Add Product"}
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={restocking !== null} onClose={() => setRestocking(null)} title={`Restock — ${restocking?.name ?? ""}`}>
        <div className="space-y-4">
          <div>
            <label className={labelCls}>Supplier</label>
            {suppliers.length === 0 ? (
              <p className="text-sm text-red-600 dark:text-red-400">
                No suppliers yet — add one on the Suppliers page first.
              </p>
            ) : (
              <select className={inputCls} value={restockSupplier} onChange={(e) => setRestockSupplier(e.target.value === "" ? "" : Number(e.target.value))}>
                <option value="">Choose supplier…</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            )}
          </div>
          <div>
            <label className={labelCls}>Quantity received</label>
            <input type="number" min={1} className={inputCls} value={restockQty} onChange={(e) => setRestockQty(Number(e.target.value))} />
            {restocking && (
              <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">
                Current stock: {restocking.quantity_in_stock} → will become {Math.max(0, restocking.quantity_in_stock + (Number.isFinite(restockQty) ? restockQty : 0))}
              </p>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setRestocking(null)} className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-500 transition-colors duration-200 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700">
              Cancel
            </button>
            <button onClick={restock} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:scale-[1.02] hover:bg-emerald-700">
              Record Purchase
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
