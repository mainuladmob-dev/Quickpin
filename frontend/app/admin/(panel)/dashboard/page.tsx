"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AdminLoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });

      if (error) {
        setErrorMsg(error.message || "Invalid login credentials");
        setLoading(false);
        return;
      }

      if (data?.user) {
        // রোল যাচাইকরণ
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", data.user.id)
          .maybeSingle();

        if (
          profile &&
          ["admin", "super_admin", "staff"].includes(profile.role)
        ) {
          // সরাসরি নতুন অল-ইন-ওয়ান ড্যাশবোর্ডে রিডাইরেক্ট
          router.replace("/admin/orders");
          router.refresh();
        } else {
          await supabase.auth.signOut();
          setErrorMsg("Access Denied: You are not authorized as Admin.");
          setLoading(false);
        }
      }
    } catch (err: any) {
      setErrorMsg("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl space-y-5">
        <div className="text-center space-y-1">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-50 text-blue-600 text-2xl font-black mb-1">
            ⚡
          </div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            Quickpin Admin
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Sign in to manage live store operations
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Admin Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@quickpin.com"
              className="w-full border border-slate-300 rounded-xl p-2.5 font-medium outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-slate-50"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full border border-slate-300 rounded-xl p-2.5 font-medium outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-slate-50"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-xs transition active:scale-95"
          >
            {loading ? "Verifying..." : "Sign In to Panel"}
          </button>
        </form>
      </div>
    </div>
  );
}
