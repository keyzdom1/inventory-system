"use client";

import { useAuth } from "@/components/Auth";
import { useToast } from "@/components/Toast";
import type { Role } from "@/lib/types";
import Link from "next/link";
import { useState } from "react";

export default function LoginPage() {
  const { login } = useAuth();
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
    "w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition-colors duration-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-lg font-black text-white shadow-lg">
            E
          </div>
          <h1 className="text-xl font-bold text-slate-900">ElectroMart IMS</h1>
          <p className="mt-1 text-sm text-slate-500">
            {mode === "login" ? "Sign in to your account" : "Create a new account"}
          </p>
        </div>

        {registered && mode === "register" ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-amber-700">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
              </svg>
              <span className="font-semibold">Account Pending Approval</span>
            </div>
            <p className="text-sm text-amber-800">
              Your account has been created and is waiting for administrator approval. You will be able to sign in once an admin approves your account.
            </p>
            <button
              onClick={() => { setMode("login"); setRegistered(false); setUsername(""); setEmail(""); setPassword(""); }}
              className="mt-4 w-full rounded-lg border border-amber-300 bg-white py-2.5 text-sm font-bold text-amber-700 transition-all duration-200 hover:bg-amber-100"
            >
              Back to Sign In
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Username</label>
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
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Email</label>
                  <input
                    type="email"
                    className={inputCls}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Requested Role</label>
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
              <label className="mb-1 block text-xs font-semibold text-slate-600">Password</label>
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

            <p className="text-center text-xs text-slate-500">
              {mode === "login" ? (
                <>
                  Don&apos;t have an account?{" "}
                  <button type="button" onClick={() => setMode("register")} className="font-semibold text-indigo-600 hover:text-indigo-800">
                    Register
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button type="button" onClick={() => setMode("login")} className="font-semibold text-indigo-600 hover:text-indigo-800">
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
