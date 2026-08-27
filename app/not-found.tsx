import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
      <p className="text-6xl font-black text-slate-200 dark:text-slate-700">404</p>
      <h1 className="mt-4 text-xl font-bold text-slate-800 dark:text-slate-200">Page not found</h1>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">The page you&apos;re looking for doesn&apos; exist or has been moved.</p>
      <Link
        href="/"
        className="mt-6 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:scale-[1.02] hover:bg-indigo-700"
      >
        Back to Dashboard
      </Link>
    </div>
  );
}
