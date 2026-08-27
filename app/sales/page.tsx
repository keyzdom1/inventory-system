"use client";

import { motion } from "motion/react";
import { PageHeader } from "@/components/StatCard";
import { useToast } from "@/components/Toast";
import { EmptyState, TableSkeleton } from "@/components/ui";
import { ApiError, api } from "@/lib/api";
import { dateTime, naira, toNumber } from "@/lib/format";
import type { Customer, Product, Sale } from "@/lib/types";
import { useCallback, useEffect, useState } from "react";

interface Line {
  key: number;
  product_id: number | "";
  quantity: number;
}

let lineKey = 1;

export default function SalesPage() {
  const toast = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [recent, setRecent] = useState<Sale[] | null>(null);
  const [lines, setLines] = useState<Line[]>([{ key: lineKey++, product_id: "", quantity: 1 }]);
  const [customerId, setCustomerId] = useState<number | "">("");
  const [submitting, setSubmitting] = useState(false);
  const [shaking, setShaking] = useState<Set<number>>(new Set());
  const [lineErrors, setLineErrors] = useState<Record<number, string>>({});

  const refresh = useCallback(async () => {
    try {
      const [productRes, customerRes, sales] = await Promise.all([
        api.products.list(undefined, 1, 100),
        api.customers.list(1, 100),
        api.sales.list(10),
      ]);
      setProducts(productRes.items);
      setCustomers(customerRes.items);
      setRecent(sales);
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Failed to load data");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  function updateLine(key: number, patch: Partial<Line>) {
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
    setLineErrors({});
  }

  const productById = new Map(products.map((p) => [p.id, p]));
  const grandTotal = lines.reduce((sum, l) => {
    const p = l.product_id === "" ? null : productById.get(l.product_id);
    return p ? sum + toNumber(p.selling_price) * l.quantity : sum;
  }, 0);

  async function submit() {
    if (lines.some((l) => l.product_id === "")) return toast("error", "Pick a product for every line");
    if (lines.some((l) => !Number.isInteger(l.quantity) || l.quantity < 1)) return toast("error", "Quantities must be whole numbers ≥ 1");
    setSubmitting(true);
    setLineErrors({});
    try {
      const sale = await api.sales.create({
        customer_id: customerId === "" ? null : customerId,
        items: lines.map((l) => ({ product_id: Number(l.product_id), quantity: l.quantity })),
      });
      toast("success", `Sale #${sale.id} recorded — ${naira(sale.total_amount)} (${naira(sale.total_profit)} profit)`);
      setLines([{ key: lineKey++, product_id: "", quantity: 1 }]);
      refresh();
    } catch (e) {
      if (e instanceof ApiError && e.shortages.length > 0) {
        const errs: Record<number, string> = {};
        const shakeSet = new Set<number>();
        for (const s of e.shortages) {
          errs[s.product_id] = `Only ${s.available} in stock (you asked for ${s.requested})`;
          lines.forEach((l, i) => {
            if (Number(l.product_id) === s.product_id) shakeSet.add(i);
          });
        }
        setLineErrors(errs);
        setShaking(shakeSet);
        toast("error", "Not enough stock for this sale");
      } else {
        toast("error", e instanceof Error ? e.message : "Sale failed");
      }
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls =
    "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition-colors duration-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:focus:ring-indigo-800";

  return (
    <div>
      <PageHeader title="Record a Sale" subtitle="Stock is checked and deducted atomically on save" />

      <div className="grid gap-6 lg:grid-cols-5">
        <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm lg:col-span-3">
          <div className="mb-4">
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Customer</label>
            <select className={inputCls} value={customerId} onChange={(e) => setCustomerId(e.target.value === "" ? "" : Number(e.target.value))}>
              <option value="">Walk-in customer</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            {lines.map((l, i) => {
              const p = l.product_id === "" ? null : productById.get(l.product_id);
              const lineTotal = p ? toNumber(p.selling_price) * l.quantity : 0;
              const err = p ? lineErrors[p.id] : undefined;
              return (
                <motion.div
                  key={l.key}
                  animate={shaking.has(i) ? { x: [0, -9, 9, -7, 7, -4, 4, 0] } : { x: 0 }}
                  transition={{ duration: 0.4 }}
                  onAnimationComplete={() =>
                    setShaking((s) => {
                      const next = new Set(s);
                      next.delete(i);
                      return next;
                    })
                  }
                  className={`rounded-xl border p-3 ${err ? "border-red-300 bg-red-50/50 dark:bg-red-900/20" : "border-slate-200 dark:border-slate-700"}`}
                >
                  <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
                    <span className="hidden h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700 text-xs font-bold text-slate-500 dark:text-slate-400 sm:flex">
                      {i + 1}
                    </span>
                    <select
                      className={`${inputCls} flex-1`}
                      value={l.product_id}
                      onChange={(e) => updateLine(l.key, { product_id: e.target.value === "" ? "" : Number(e.target.value) })}
                    >
                      <option value="">Select product…</option>
                      {products.map((pr) => (
                        <option key={pr.id} value={pr.id} disabled={pr.quantity_in_stock === 0}>
                          {pr.name} — {naira(pr.selling_price)} ({pr.quantity_in_stock} in stock)
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min={1}
                      className={`${inputCls} w-20`}
                      value={l.quantity}
                      onChange={(e) => updateLine(l.key, { quantity: Math.max(1, Math.floor(Number(e.target.value) || 1)) })}
                    />
                    <span className="w-24 shrink-0 text-right text-sm font-semibold tabular-nums text-slate-700 dark:text-slate-300">{naira(lineTotal)}</span>
                    {lines.length > 1 && (
                      <button
                        onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-50 dark:bg-red-900/30 text-red-500 dark:text-red-400 transition-all duration-200 hover:scale-[1.02] hover:bg-red-100 dark:hover:bg-red-900/50"
                        aria-label="Remove line"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  {err && <p className="mt-2 pl-1 text-xs font-semibold text-red-600 dark:text-red-400">{err}</p>}
                </motion.div>
              );
            })}
          </div>

          <button
            onClick={() => setLines((ls) => [...ls, { key: lineKey++, product_id: "", quantity: 1 }])}
            className="mt-3 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 px-3 py-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400 transition-all duration-200 hover:scale-[1.02] hover:bg-indigo-100 dark:hover:bg-indigo-900/50"
          >
            + Add another product
          </button>

          <div className="mt-5 flex items-center justify-between rounded-xl bg-slate-50 dark:bg-slate-700/50 px-4 py-3">
            <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">Total</span>
            <motion.span key={grandTotal} initial={{ scale: 0.97 }} animate={{ scale: 1 }} className="text-xl font-black tabular-nums text-slate-900">
              {naira(grandTotal)}
            </motion.span>
          </div>

          <button
            onClick={submit}
            disabled={submitting}
            className="mt-4 w-full rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white shadow-md transition-all duration-200 hover:scale-[1.01] hover:bg-indigo-700 disabled:opacity-60"
          >
            {submitting ? "Saving sale…" : "Complete Sale"}
          </button>
        </section>

        <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm lg:col-span-2">
          <div className="border-b border-slate-100 dark:border-slate-700 px-5 py-4">
            <h2 className="text-sm font-bold tracking-wide text-slate-500 dark:text-slate-400 uppercase">Recent Sales</h2>
          </div>
          {!recent ? (
            <TableSkeleton rows={6} cols={2} />
          ) : recent.length === 0 ? (
            <EmptyState title="No sales recorded yet" hint="Your first sale will appear here." />
          ) : (
            <ul className="divide-y divide-slate-50">
              {recent.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">{s.customer_name ?? "Walk-in customer"}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      #{s.id} · {dateTime(s.sale_date)} ·{" "}
                      {s.items[0]?.product_name ?? ""}
                      {s.items.length > 1 && ` +${s.items.length - 1} more`}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-bold tabular-nums text-slate-800 dark:text-slate-200">{naira(s.total_amount)}</p>
                    <p className="text-xs font-medium tabular-nums text-emerald-600">+{naira(s.total_profit)} profit</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
