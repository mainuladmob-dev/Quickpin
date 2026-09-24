"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AdminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const pathname = usePathname();

  // পেজ পরিবর্তন হলে মোবাইল মেনু স্বয়ংক্রিয়ভাবে বন্ধ হবে
  useEffect(() => {
    setIsDrawerOpen(false);
  }, [pathname]);

  // মেনু খোলা থাকলে পেজের ব্যাকগ্রাউন্ড স্ক্রোল বন্ধ রাখা
  useEffect(() => {
    if (isDrawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isDrawerOpen]);

  const navItems = [
    { label: "📦 Orders", href: "/admin/orders" },
    { label: "🥦 Products", href: "/admin/products" },
    { label: "👥 Customers", href: "/admin/users" },
  ];

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-800">
      {/* ১. স্টিকি মোবাইল হেডার */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 px-4 py-2.5 flex items-center justify-between md:hidden shadow-2xs">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            aria-label="Open navigation menu"
            className="p-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-base font-bold active:scale-95 transition"
          >
            ☰
          </button>
          <span className="font-black text-sm text-slate-900 tracking-tight">
            Quickpin Admin
          </span>
        </div>
        <Link
          href="/"
          className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 hover:bg-blue-100 transition"
        >
          🌐 Store
        </Link>
      </header>

      {/* ২. মোবাইল ভাসমান সাইড ড্রয়ার ও ব্যাকড্রপ */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* কালো ব্যাকড্রপ (বাইরে ট্যাপ করলেই বন্ধ হবে) */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-2xs transition-opacity"
            onClick={() => setIsDrawerOpen(false)}
          />

          {/* স্ক্রিনের বাঁ দিক থেকে ভেসে ওঠা সাইড ড্রয়ার */}
          <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-2xl p-4 flex flex-col justify-between z-50 animate-in slide-in-from-left duration-200">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="text-base">⚡</span>
                  <span className="font-black text-sm text-slate-900">
                    Quickpin Panel
                  </span>
                </div>
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 text-xs font-bold"
                >
                  ✕
                </button>
              </div>

              {/* নেভিগেশন লিঙ্কসমূহ */}
              <nav className="space-y-1">
                {navItems.map((item) => {
                  const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition ${
                        isActive
                          ? "bg-slate-900 text-white shadow-xs"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* ড্রয়ারের ফুটার */}
            <div className="pt-3 border-t border-slate-100">
              <Link
                href="/"
                className="w-full flex items-center justify-center gap-1.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold border border-slate-200 transition"
              >
                🌐 View Storefront
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ৩. ডেস্কটপ সাইডবার (পিসি স্ক্রিনের জন্য ফিক্সড) */}
      <aside className="hidden md:flex md:w-60 md:flex-col md:fixed md:inset-y-0 bg-white border-r border-slate-200 p-4 justify-between z-30">
        <div className="space-y-6">
          <div className="flex items-center gap-2 px-2">
            <span className="text-xl">⚡</span>
            <span className="font-black text-base text-slate-900 tracking-tight">
              Quickpin Admin
            </span>
          </div>

          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition ${
                    isActive
                      ? "bg-slate-900 text-white shadow-xs"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="pt-4 border-t border-slate-100">
          <Link
            href="/"
            className="w-full flex items-center justify-center gap-1.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold border border-slate-200 transition"
          >
            🌐 View Storefront
          </Link>
        </div>
      </aside>

      {/* ৪. মূল কনটেন্ট রেন্ডারিং এরিয়া */}
      <main className="md:pl-60">
        <div className="p-3 md:p-6 max-w-6xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
