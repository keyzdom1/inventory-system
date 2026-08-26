"use client";

import { motion } from "motion/react";
import { PageHeader } from "@/components/StatCard";
import { useToast } from "@/components/Toast";
import { EmptyState, Modal, TableSkeleton } from "@/components/ui";
import { api } from "@/lib/api";
import { naira } from "@/lib/format";
import type { Product, Supplier } from "@/lib/types";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

export default function LowStockPage() {
  const toast = useToast();
  const [products, setProducts] = useState<Product[] | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [restocking, setRestocking] = useState<Product | null>(null);
  const [restockQty, setRestockQty] = useState(1);
  const [restockSupplier, setRestockSupplier] = useState<number | "">("");
  const [flashId, setFlashId] = useState<number | null>(null);

  const reload = useCallback(async () => {
    try {
      setProducts(await api.products.lowStock());
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Failed to load low-stock products");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    reload();
    api.suppliers.list(1, 100).then((res) => setSuppliers(res.items)).catch(() => {});
  }, [reload]);

  function flash(id: number) {
    setFlashId(id);
    setTimeout(() => setFlashId(null), 1200);
  }

  function shortfall(p: Product) {
    return Math.max(0, p.reorder_level - p.quantity_in_stock);
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
      flash(restocking.id);
      reload();
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Restock failed");
    }
  }

  const inputCls =
    "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition-colors duration-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";
  const labelCls = "mb-1 block text-xs font-semibold text-slate-600";

  return (
    <div>
      <PageHeader title="Low Stock Alerts" subtitle="Products at or below their reorder level">
        <Link
          href="/products"
          className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600 transition-all duration-200 hover:scale-[1.02] hover:bg-slate-200"
        >
          All products →
        </Link>
      </PageHeader>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {!products ? (
          <TableSkeleton rows={5} cols={5} />
        ) : products.length === 0 ? (
          <EmptyState title="All stocked up 🎉" hint="Every product is above its reorder level right now." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs tracking-wide text-slate-400 uppercase">
                  <th className="px-5 py-3 font-semibold">Product</th>
                  <th className="px-3 py-3 text-right font-semibold">In Stock</th>
                  <th className="px-3 py-3 text-right font-semibold">Reorder At</th>
                  <th className="px-3 py-3 text-right font-semibold">Shortfall</th>
                  <th className="px-5 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => {
                  const short = shortfall(p);
                  return (
                    <motion.tr
                      key={p.id}
                      animate={flashId === p.id ? { backgroundColor: ["#d1fae5", "#ffffff"] } : { backgroundColor: "#ffffff" }}
                      transition={{ duration: 1 }}
                      className="border-b border-slate-50 last:border-0"
                    >
                      <td className="px-5 py-3">
                        <p className="font-medium text-slate-800">{p.name}</p>
                        <span className="text-xs text-slate-400">{p.category}</span>
                      </td>
                      <td className="px-3 py-3 text-right font-bold tabular-nums text-amber-600">{p.quantity_in_stock}</td>
                      <td className="px-3 py-3 text-right tabular-nums text-slate-400">{p.reorder_level}</td>
                      <td className="px-3 py-3 text-right tabular-nums">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                            short > 0 ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {short > 0 ? `+${short}` : "at limit"}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={() => {
                            setRestocking(p);
                            setRestockQty(Math.max(1, short));
                          }}
                          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-all duration-200 hover:scale-[1.02] hover:bg-emerald-700"
                        >
                          Restock
                        </button>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {products !== null && products.length > 0 && (
        <p className="mt-3 text-xs text-slate-400">
          {products.length} product{products.length === 1 ? "" : "s"} need{products.length === 1 ? "s" : ""} attention · restocking records a purchase and increases stock automatically.
        </p>
      )}

      <Modal open={restocking !== null} onClose={() => setRestocking(null)} title={`Restock — ${restocking?.name ?? ""}`}>
        <div className="space-y-4">
          <div>
            <label className={labelCls}>Supplier</label>
            {suppliers.length === 0 ? (
              <p className="text-sm text-red-600">No suppliers yet — add one on the Suppliers page first.</p>
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
              <p className="mt-1.5 text-xs text-slate-400">
                Current stock: {restocking.quantity_in_stock} → will become{" "}
                {Math.max(0, restocking.quantity_in_stock + (Number.isFinite(restockQty) ? restockQty : 0))}
                {shortfall(restocking) > 0 && <> · shortfall is {shortfall(restocking)}</>}
              </p>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setRestocking(null)} className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-500 transition-colors duration-200 hover:bg-slate-100">
              Cancel
            </button>
            <button
              onClick={restock}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:scale-[1.02] hover:bg-emerald-700"
            >
              Record Purchase
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
