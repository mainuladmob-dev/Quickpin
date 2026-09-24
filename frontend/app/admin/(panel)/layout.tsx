"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AdminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [backofficeOpen, setBackofficeOpen] = useState(true);
  const pathname = usePathname();
  const supabase = createClient();

  const handleLogout = async () => {
    if (confirm("আপনি কি অ্যাডমিন প্যানেল থেকে লগআউট করতে চান?")) {
      await supabase.auth.signOut();
      window.location.href = "/admin/login";
    }
  };

  const mainMenuItems = [
    { name: "Orders", href: "/admin/orders", icon: "📦" },
    { name: "Products", href: "/admin/products", icon: "🛍️" },
    { name: "Categories", href: "/admin/categories", icon: "📁" },
    { name: "Settings", href: "/admin/settings", icon: "⚙️" },
  ];

  const backofficeItems = [
    { name: "Banners", href: "/admin/banners", icon: "🖼️" },
    { name: "Customers", href: "/admin/customers", icon: "👥" },
    { name: "Admins", href: "/admin/admins", icon: "🛡️" },
    { name: "Webhook Logs", href: "/admin/webhook-logs", icon: "📡" },
  ];

  const renderNavLinks = () => (
    <div className="space-y-4">
      {/* মূল ড্যাশবোর্ড */}
      <div>
        <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
          মূল ড্যাশবোর্ড
        </p>
        <nav className="space-y-1">
          {mainMenuItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href === "/admin/orders" && pathname === "/admin");
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition ${
                  isActive
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* ব্যাকঅফিস ও অডিট */}
      <div>
        <button
          onClick={() => setBackofficeOpen(!backofficeOpen)}
          className="w-full flex items-center justify-between px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 hover:bg-slate-50 rounded-lg transition"
        >
          <span className="flex items-center gap-1.5">
            <span>📁</span> ব্যাকঅফিস ও অডিট
          </span>
          <span className="text-[10px] text-slate-400">
            {backofficeOpen ? "▲" : "▼"}
          </span>
        </button>

        {backofficeOpen && (
          <nav className="space-y-1 mt-1 pl-2">
            {backofficeItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                    isActive
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-slate-600 hover:bg-slate-100"
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
  );

  return (
    <div className="min-h-screen bg-slate-50/60 flex flex-col md:flex-row">
      {/* মোবাইল টপবার */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-3 flex items-center justify-between md:hidden">
        <button
          onClick={() => setSidebarOpen(true)}
          className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-bold flex items-center gap-1.5 shadow-2xs active:scale-95 transition"
        >
          ☰ মেনু
        </button>

        <h1 className="text-sm font-black text-slate-900 tracking-tight">
          Quickpin Admin
        </h1>

        <button
          onClick={handleLogout}
          className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs border border-rose-200 shadow-2xs active:scale-95 transition"
        >
          Logout
        </button>
      </header>

      {/* মোবাইল ভাসমান সাইড ড্রয়ার (Floating Drawer) */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* কালো ব্যাকড্রপ */}
          <div
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
          />

          {/* সাইডবার প্যানেল */}
          <aside className="relative w-72 max-w-[80vw] bg-white h-full shadow-2xl flex flex-col z-10">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <span className="font-black text-slate-900 text-base">
                Quickpin Admin
              </span>
              <button
                onClick={() => setSidebarOpen(false)}
                className="px-2.5 py-1 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1"
              >
                ✕ বন্ধ
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {renderNavLinks()}
            </div>

            <div className="p-4 border-t border-slate-100">
              <button
                onClick={handleLogout}
                className="w-full py-2.5 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs flex items-center justify-center gap-2 border border-rose-200 transition"
              >
                🚪 Logout
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* ডেস্কটপ সাইডবার */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-white border-r border-slate-200">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <span className="font-black text-slate-900 text-base">
            Quickpin Admin
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {renderNavLinks()}
        </div>

        <div className="p-4 border-t border-slate-100">
          <button
            onClick={handleLogout}
            className="w-full py-2 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs flex items-center justify-center gap-2 border border-rose-200 transition"
          >
            🚪 Logout
          </button>
        </div>
      </aside>

      {/* মূল কনটেন্ট এরিয়া */}
      <main className="flex-1 md:pl-64 p-3 sm:p-4 md:p-6">
        {children}
      </main>
    </div>
  );
}
