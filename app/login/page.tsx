"use client";

import { useAuth } from "@/components/Auth";
import { useTheme } from "@/components/ThemeProvider";
import { useToast } from "@/components/Toast";
import type { Role } from "@/lib/types";
import { useState } from "react";

export default function LoginPage() {
  const { login } = useAuth();
  const { theme, toggle } = useTheme();
  const toast = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [requestedRole, setRequestedRole] = useState<Role>("accountant");
  const [registered, setRegistered] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim()) return toast("error", "Username is required");
    if (!password) return toast("error", "Password is required");
    setSubmitting(true);
    try {
      if (mode === "login") {
        await login(username, password);
      } else {
        if (!email.trim()) return toast("error", "Email is required");
        const { api } = await import("@/lib/api");
        const res = await api.auth.register(username, email, password, requestedRole);
        toast("success", res.message);
        setRegistered(true);
      }
    } catch (err) {
      toast("error", err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls =
    "w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition-colors duration-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:placeholder:text-slate-500 dark:focus:ring-indigo-800";

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <button
            onClick={toggle}
            className="fixed right-4 top-4 flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors duration-200 hover:bg-slate-200 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
            aria-label="Toggle dark mode"
          >
            {theme === "dark" ? (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
              </svg>
            )}
          </button>
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-lg font-black text-white shadow-lg">
            E
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">ElectroMart IMS</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {mode === "login" ? "Sign in to your account" : "Create a new account"}
          </p>
        </div>

        {registered && mode === "register" ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm dark:border-amber-800 dark:bg-amber-950">
            <div className="mb-3 flex items-center gap-2 text-amber-700 dark:text-amber-300">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
              </svg>
              <span className="font-semibold">Account Pending Approval</span>
            </div>
            <p className="text-sm text-amber-800 dark:text-amber-200">
              Your account has been created and is waiting for administrator approval. You will be able to sign in once an admin approves your account.
            </p>
            <button
              onClick={() => { setMode("login"); setRegistered(false); setUsername(""); setEmail(""); setPassword(""); }}
              className="mt-4 w-full rounded-lg border border-amber-300 bg-white py-2.5 text-sm font-bold text-amber-700 transition-all duration-200 hover:bg-amber-100 dark:border-amber-700 dark:bg-slate-800 dark:text-amber-300 dark:hover:bg-slate-700"
            >
              Back to Sign In
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Username</label>
              <input
                className={inputCls}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                autoFocus
              />
            </div>

            {mode === "register" && (
              <>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Email</label>
                  <input
                    type="email"
                    className={inputCls}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Requested Role</label>
                  <select
                    className={inputCls}
                    value={requestedRole}
                    onChange={(e) => setRequestedRole(e.target.value as Role)}
                  >
                    <option value="salesperson">Salesperson — record sales, view products, manage customers</option>
                    <option value="manager">Manager — full access to all features</option>
                    <option value="accountant">Accountant — view dashboard, sales, and purchase reports</option>
                  </select>
                </div>
              </>
            )}

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Password</label>
              <input
                type="password"
                className={inputCls}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-bold text-white shadow-sm transition-all duration-200 hover:bg-indigo-700 disabled:opacity-60"
            >
              {submitting ? "Please wait…" : mode === "login" ? "Sign In" : "Create Account"}
            </button>

            <p className="text-center text-xs text-slate-500 dark:text-slate-400">
              {mode === "login" ? (
                <>
                  Don&apos;t have an account?{" "}
                  <button type="button" onClick={() => setMode("register")} className="font-semibold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300">
                    Register
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button type="button" onClick={() => setMode("login")} className="font-semibold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300">
                    Sign in
                  </button>
                </>
              )}
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
