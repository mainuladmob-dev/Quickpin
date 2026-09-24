"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// প্রতিদিনের অপারেশনাল কাজ (Daily Live Flow)
const PRIMARY_NAV = [
  { name: "ড্যাশবোর্ড (হিসাব)", href: "/admin/dashboard", icon: "📊" },
  { name: "অর্ডার খাতা (Orders)", href: "/admin/orders", icon: "📦" },
  { name: "পণ্য ও স্টক (Products)", href: "/admin/products", icon: "🛍️" },
];

// দোকান সেটিংস ও ব্যাকঅফিস (দরকার ছাড়া প্রতিদিন খোলার প্রয়োজন নেই)
const SECONDARY_NAV = [
  { name: "ক্যাটাগরি", href: "/admin/categories", icon: "📁" },
  { name: "ব্যানার", href: "/admin/banners", icon: "🖼️" },
  { name: "কাস্টমার তালিকা", href: "/admin/customers", icon: "👥" },
  { name: "পেমেন্ট সেটিংস", href: "/admin/payments", icon: "💳" },
  { name: "দোকান সেটিংস", href: "/admin/settings", icon: "⚙️" },
  { name: "অ্যাডমিন স্টাফ", href: "/admin/admins", icon: "👤" },
  { name: "টেকনিক্যাল লগ", href: "/admin/webhook-logs", icon: "🔗" },
  { name: "প্রোফাইল", href: "/admin/profile", icon: "🔑" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showMoreSettings, setShowMoreSettings] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/admin/login");
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* মোবাইল টপবার */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-1.5 rounded-lg text-slate-700 hover:bg-slate-100 text-lg"
          aria-label="Open Menu"
        >
          ☰
        </button>
        <span className="font-bold text-slate-900 tracking-tight">Quickpin Admin</span>
        <button
          onClick={handleLogout}
          className="px-2.5 py-1 text-xs font-semibold text-rose-600 bg-rose-50 rounded-lg border border-rose-100"
        >
          Logout
        </button>
      </header>

      {/* মোবাইল ব্যাকড্রপ */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 z-40 md:hidden backdrop-blur-2xs"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* সাইডবার প্যানেল */}
      <aside
        className={`fixed md:sticky top-0 h-screen w-64 bg-slate-900 text-white flex flex-col z-50 transition-transform duration-200 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        {/* ব্র্যান্ড হেডার */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white tracking-wide">Quickpin</h2>
            <p className="text-[10px] text-slate-400">সহজ এডমিন ও খতিয়ান</p>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden text-slate-400 hover:text-white text-lg p-1"
          >
            ✕
          </button>
        </div>

        {/* স্ক্রোলযোগ্য নেভিগেশন */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {/* জোন ১: মূল অপারেশন */}
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-1">
              দৈনন্দিন কাজ (Operations)
            </p>
            <nav className="space-y-1">
              {PRIMARY_NAV.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                      isActive
                        ? "bg-blue-600 text-white shadow-xs"
                        : "text-slate-300 hover:bg-slate-800 hover:text-white"
                    }`}
                  >
                    <span>{item.icon}</span>
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* জোন ২: ড্রপডাউনে গোছানো ব্যাকঅফিস সেটিংস */}
          <div className="pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setShowMoreSettings(!showMoreSettings)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-800 hover:text-white transition"
            >
              <span className="flex items-center gap-2">
                <span>⚙️</span> দোকান ও সেটিংস
              </span>
              <span className="text-[10px]">{showMoreSettings ? "▲" : "▼"}</span>
            </button>

            {showMoreSettings && (
              <nav className="mt-1 space-y-0.5 pl-2">
                {SECONDARY_NAV.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition ${
                        isActive
                          ? "bg-slate-800 text-blue-400 font-semibold"
                          : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
                      }`}
                    >
                      <span>{item.icon}</span>
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </nav>
            )}
          </div>
        </div>

        {/* সাইডবার ফুটার */}
        <div className="p-3 border-t border-slate-800 hidden md:block">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold text-rose-400 bg-rose-950/40 hover:bg-rose-900/50 rounded-xl border border-rose-900/50 transition"
          >
            🚪 Logout
          </button>
        </div>
      </aside>

      {/* পেজ কনটেন্ট */}
      <main className="flex-1 overflow-x-hidden min-h-screen">
        {children}
      </main>
    </div>
  );
} 
