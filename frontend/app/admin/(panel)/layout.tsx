"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function AdminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [adminName, setAdminName] = useState("");
  const [adminRole, setAdminRole] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);

  const isLoginPage = pathname === "/admin/login";

  useEffect(() => {
    if (isLoginPage) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const checkAdmin = async () => {
      try {
        // ✅ getSession ব্যবহার করুন — cookie/localStorage থেকে পড়ে
        const { data: { session } } = await supabase.auth.getSession();

        if (cancelled) return;

        if (!session?.user) {
          window.location.href = "/admin/login";
          return;
        }

        const { data: profile, error } = await supabase
          .from("profiles")
          .select("name, role")
          .eq("id", session.user.id)
          .single();

        if (cancelled) return;

        if (
          error ||
          !profile ||
          !["admin", "super_admin", "staff"].includes(profile.role)
        ) {
          await supabase.auth.signOut();
          window.location.href = "/admin/login";
          return;
        }

        setAdminName(profile.name || session.user.email || "Admin");
        setAdminRole(profile.role);
        setIsAuthed(true);
        setLoading(false);
      } catch (err) {
        console.error("Auth check error:", err);
        if (!cancelled) {
          window.location.href = "/admin/login";
        }
      }
    };

    checkAdmin();

    return () => {
      cancelled = true;
    };
  }, [isLoginPage, pathname, supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/admin/login";
  };

  const menuItems = [
    { name: "Dashboard", href: "/admin/dashboard", icon: "📊" },
    { name: "Orders", href: "/admin/orders", icon: "📦" },
    { name: "Products", href: "/admin/products", icon: "🛍️" },
    { name: "Categories", href: "/admin/categories", icon: "📂" },
    { name: "Banners", href: "/admin/banners", icon: "🖼️" },
    { name: "Admins", href: "/admin/admins", icon: "👤" },
    { name: "Customers", href: "/admin/customers", icon: "👥" },
    { name: "Webhook Logs", href: "/admin/webhook-logs", icon: "🔗" },
    { name: "Payments", href: "/admin/payments", icon: "💳" },
    { name: "Settings", href: "/admin/settings", icon: "⚙️" },
    { name: "My Profile", href: "/admin/profile", icon: "🔑" },
  ];

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <p className="text-gray-500 font-medium">Loading admin panel...</p>
      </div>
    );
  }

  if (!isAuthed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <p className="text-gray-500 font-medium">Redirecting to login...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex">
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 text-white transform transition-transform duration-200 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0 md:static md:inset-auto`}
      >
        <div className="p-5 border-b border-slate-700">
          <h1 className="text-xl font-bold text-blue-400">Quickpin</h1>
          <p className="text-xs text-slate-400 mt-1">Admin Panel</p>
        </div>

        <nav className="p-4 space-y-1">
          {menuItems.map((item) => {
            const isActive = pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                  isActive
                    ? "bg-blue-600 text-white"
                    : "text-slate-300 hover:bg-slate-800"
                }`}
              >
                <span>{item.icon}</span>
                <span className="text-sm font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
        ></div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white shadow-sm sticky top-0 z-20">
          <div className="px-4 py-3 flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden text-2xl text-gray-600"
            >
              ☰
            </button>

            <div className="hidden md:block"></div>

            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-gray-800">{adminName}</p>
                <p className="text-xs text-gray-500 capitalize">
                  {adminRole.replace("_", " ")}
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="text-sm bg-red-50 hover:bg-red-100 text-red-600 px-3 py-2 rounded-lg transition"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
