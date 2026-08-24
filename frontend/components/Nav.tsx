"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/products", label: "Products" },
  { href: "/products/low-stock", label: "Low Stock" },
  { href: "/sales", label: "Sales" },
  { href: "/customers", label: "Customers" },
  { href: "/suppliers", label: "Suppliers" },
];

export function Nav() {
  const pathname = usePathname();

  // Longest matching href wins so /products/low-stock doesn't also light up Products
  const activeHref =
    links
      .filter((l) => (l.href === "/" ? pathname === "/" : pathname.startsWith(l.href)))
      .sort((a, b) => b.href.length - a.href.length)[0]?.href ?? null;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-black text-white shadow-md">
            E
          </span>
          <span className="text-base font-bold tracking-tight text-slate-900">
            ElectroMart<span className="font-medium text-slate-400"> IMS</span>
          </span>
        </Link>
        <nav className="flex flex-1 items-center gap-1 overflow-x-auto">
          {links.map((l) => {
            const active = activeHref === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors duration-200 ${
                  active ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
