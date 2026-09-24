"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const MAIN_NAV = [
  { name: "Orders", href: "/admin/orders", icon: "📦" },
  { name: "Products", href: "/admin/products", icon: "🛍️" },
  { name: "Categories", href: "/admin/categories", icon: "📁" },
  { name: "Settings", href: "/admin/settings", icon: "⚙️" },
];

const BACKOFFICE_NAV = [
  { name: "Banners", href: "/admin/banners", icon: "🖼️" },
  { name: "Customers", href: "/admin/customers", icon: "👥" },
  { name: "Admins", href: "/admin/admins", icon: "🛡️" },
  { name: "Webhook Logs", href: "/admin/webhook-logs", icon: "📡" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [showBackoffice, setShowBackoffice] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    if (!confirm("Are you sure you want to log out?")) return;
    await supabase.auth.signOut();
    router.push("/admin/login");
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* মোবাইলের জন্য টপ হেডার বার */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between md:hidden sticky top-0 z-40">
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="text-slate-700 font-bold p-1.5 rounded-lg border border-slate-200"
        >
          {isMobileMenuOpen ? "✕ বন্ধ" : "☰ মেনু"}
        </button>
        <span className="font-black text-slate-800 text-base">Quickpin Admin</span>
        <button
          onClick={handleLogout}
          className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-lg"
        >
          Logout
        </button>
      </header>

      {/* সাইডবার মেনু */}
      <aside
        className={`${
          isMobileMenuOpen ? "block" : "hidden"
        } md:block w-full md:w-64 bg-white border-r border-slate-200 shrink-0 p-4 space-y-4`}
      >
        <div className="hidden md:flex items-center justify-between pb-3 border-b border-slate-100">
          <span className="font-black text-slate-900 text-lg">Quickpin Admin</span>
          <button
            onClick={handleLogout}
            className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-lg hover:bg-rose-100"
          >
            Logout
          </button>
        </div>

        {/* প্রতিদিনের মূল ৪টি বাটন */}
        <nav className="space-y-1">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-1.5">
            মূল ড্যাশবোর্ড
          </p>
          {MAIN_NAV.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-xs transition ${
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

        {/* ব্যাকঅফিস ও অডিট ড্রপডাউন ফোল্ডার */}
        <div className="pt-2 border-t border-slate-100">
          <button
            onClick={() => setShowBackoffice(!showBackoffice)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
          >
            <span className="flex items-center gap-2">
              <span>📁</span> ব্যাকঅফিস ও অডিট
            </span>
            <span className="text-[10px] text-slate-400">
              {showBackoffice ? "▲" : "▼"}
            </span>
          </button>

          {showBackoffice && (
            <div className="mt-1 pl-3 space-y-1 border-l-2 border-slate-200 ml-3">
              {BACKOFFICE_NAV.map((item) => {
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition ${
                      isActive
                        ? "bg-slate-900 text-white font-bold"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <span>{item.icon}</span>
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </aside>

      {/* পেজের মূল কনটেন্ট */}
      <main className="flex-1 p-3 md:p-6 overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}

