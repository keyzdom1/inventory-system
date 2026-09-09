"use client";

import { naira, toNumber } from "@/lib/format";
import type { Sale } from "@/lib/types";

export default function Receipt({ sale }: { sale: Sale }) {
  return (
    <div className="receipt-print mx-auto max-w-sm bg-white p-6 font-mono text-sm text-black">
      <div className="text-center">
        <h1 className="text-xl font-bold">Keyzdommarts</h1>
        <p className="text-xs text-gray-500">Inventory & Sales System</p>
      </div>

      <hr className="my-3 border-dashed border-gray-300" />

      <div className="flex justify-between text-xs">
        <span>Sale #{sale.id}</span>
        <span>{new Date(sale.sale_date).toLocaleString("en-NG")}</span>
      </div>
      <div className="mt-1 text-xs text-gray-600">
        Customer: {sale.customer_name ?? "Walk-in customer"}
      </div>

      <hr className="my-3 border-dashed border-gray-300" />

      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-gray-200 text-left">
            <th className="py-1 font-semibold">Item</th>
            <th className="py-1 text-center font-semibold">Qty</th>
            <th className="py-1 text-right font-semibold">Price</th>
            <th className="py-1 text-right font-semibold">Total</th>
          </tr>
        </thead>
        <tbody>
          {sale.items.map((item) => (
            <tr key={item.id} className="border-b border-dashed border-gray-100">
              <td className="py-1.5 max-w-[140px] truncate">{item.product_name}</td>
              <td className="py-1.5 text-center">{item.quantity}</td>
              <td className="py-1.5 text-right">{naira(item.unit_price)}</td>
              <td className="py-1.5 text-right font-semibold">{naira(item.line_total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <hr className="my-3 border-dashed border-gray-300" />

      <div className="flex justify-between font-bold text-base">
        <span>TOTAL</span>
        <span>{naira(sale.total_amount)}</span>
      </div>

      <hr className="my-3 border-dashed border-gray-300" />

      <p className="text-center text-xs text-gray-500">Thank you for your purchase!</p>
    </div>
  );
}
