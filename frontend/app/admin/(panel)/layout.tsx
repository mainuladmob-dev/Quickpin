"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [adminName, setAdminName] = useState("");
  const [adminRole, setAdminRole] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isLoginPage = pathname === "/admin/login";

  const navItems = [
    { name: "Orders (All-in-One)", href: "/admin/orders", icon: "📦" },
    { name: "Products", href: "/admin/products", icon: "🛍️" },
    { name: "Categories", href: "/admin/categories", icon: "📂" },
    { name: "Banners", href: "/admin/banners", icon: "🖼️" },
    { name: "Customers", href: "/admin/customers", icon: "👥" },
    { name: "Settings", href: "/admin/settings", icon: "⚙️" },
  ];

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (isLoginPage) {
      setLoading(false);
      return;
    }

    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        window.location.replace("/admin/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("name, role")
        .eq("id", session.user.id)
        .maybeSingle();

      if (!profile || !["admin", "super_admin", "staff"].includes(profile.role)) {
        await supabase.auth.signOut();
        window.location.replace("/admin/login");
        return;
      }

      setAdminName(profile.name || session.user.email || "Admin");
      setAdminRole(profile.role);
      setLoading(false);
    };

    checkAuth();
  }, [isLoginPage, supabase]);

  // Login page hole kono header ba drawer chara sudhu clean login form dekhabe
  if (isLoginPage) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex">
      {/* Sidebar Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white flex flex-col justify-between transform transition-transform duration-200 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0 md:static md:inset-auto shadow-2xl md:shadow-none`}
      >
        <div>
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">⚡</span>
              <div>
                <h1 className="text-lg font-black tracking-tight text-white leading-tight">
                  Quickpin
                </h1>
                <p className="text-[10px] text-slate-400">Admin Control Panel</p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="md:hidden text-slate-400 hover:text-white text-lg p-1"
            >
              ✕
            </button>
          </div>

          <nav className="p-3 space-y-1 overflow-y-auto">
            <p className="px-3 py-1.5 text-[10px] font-bold tracking-wider text-slate-500 uppercase">
              Management
            </p>
            {navItems.map((item) => {
              const isActive =
                pathname === item.href || pathname?.startsWith(item.href + "/");

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition ${
                    isActive
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <span className="text-base">{item.icon}</span>
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-3 border-t border-slate-800">
          <Link
            href="/"
            className="w-full flex items-center justify-center gap-2 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition border border-slate-700"
          >
            🌐 View Storefront
          </Link>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-2xs transition-opacity"
        />
      )}

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
          <div className="px-4 py-2.5 flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-lg leading-none active:scale-95 transition"
            >
              ☰
            </button>

            <div className="hidden md:block">
              <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
                ⚡ Live Operations Hub
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold text-slate-800">{adminName}</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                  {adminRole.replace("_", " ")}
                </p>
              </div>
              <button
                onClick={async () => {
                  await supabase.auth.signOut();
                  window.location.replace("/admin/login");
                }}
                className="text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-600 px-3 py-1.5 rounded-xl transition border border-rose-200"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 p-3 md:p-6 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
                }

