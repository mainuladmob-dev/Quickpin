"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

// Navigation Links Component with Date Persistence
function NavigationMenu({
  onItemClick,
}: {
  onItemClick: () => void;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentDate = searchParams.get("date");

  // Operational & General Menu Structure
  const menuGroups = [
    {
      groupTitle: "OPERATIONS",
      items: [
        { name: "Dashboard", href: "/admin/dashboard", icon: "📊" },
        { name: "Orders", href: "/admin/orders", icon: "📦" },
        { name: "Deliveries", href: "/admin/deliveries", icon: "🚚" },
        { name: "Refunds", href: "/admin/refunds", icon: "🔄" },
        { name: "Accounts", href: "/admin/accounts", icon: "💰" },
      ],
    },
    {
      groupTitle: "STORE & CATALOG",
      items: [
        { name: "Products", href: "/admin/products", icon: "🛍️" },
        { name: "Categories", href: "/admin/categories", icon: "📂" },
        { name: "Banners", href: "/admin/banners", icon: "🖼️" },
        { name: "Customers", href: "/admin/customers", icon: "👥" },
      ],
    },
    {
      groupTitle: "FINANCE & SYSTEM",
      items: [
        { name: "Payments", href: "/admin/payments", icon: "💳" },
        { name: "Admins", href: "/admin/admins", icon: "👤" },
        { name: "Webhook Logs", href: "/admin/webhook-logs", icon: "🔗" },
        { name: "Settings", href: "/admin/settings", icon: "⚙️" },
        { name: "My Profile", href: "/admin/profile", icon: "🔑" },
      ],
    },
  ];

  return (
    <nav className="p-4 space-y-5 overflow-y-auto max-h-[calc(100vh-140px)]">
      {menuGroups.map((group) => (
        <div key={group.groupTitle} className="space-y-1">
          <p className="px-4 text-[10px] font-bold tracking-wider text-slate-500 uppercase">
            {group.groupTitle}
          </p>
          {group.items.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");

            // Daily Operations pages maintain date synchronization
            const isOperationsRoute = [
              "/admin/orders",
              "/admin/deliveries",
              "/admin/refunds",
              "/admin/accounts",
            ].includes(item.href);

            const targetHref =
              isOperationsRoute && currentDate
                ? `${item.href}?date=${currentDate}`
                : item.href;

            return (
              <Link
                key={item.href}
                href={targetHref}
                onClick={onItemClick}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition ${
                  isActive
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <span className="text-base">{item.icon}</span>
                <span>{item.name}</span>
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

export default function AdminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [adminName, setAdminName] = useState("");
  const [adminRole, setAdminRole] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/admin/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("name, role")
        .eq("id", user.id)
        .single();

      if (
        !profile ||
        !["admin", "super_admin", "staff"].includes(profile.role)
      ) {
        await supabase.auth.signOut();
        router.push("/admin/login");
        return;
      }

      setAdminName(profile.name || user.email || "Admin");
      setAdminRole(profile.role);
      setLoading(false);
    };

    checkAdmin();
  }, [router, supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/admin/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="flex items-center gap-3 text-slate-600">
          <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex">
      {/* Left Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 text-white flex flex-col transform transition-transform duration-200 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0 md:static md:inset-auto`}
      >
        <div className="p-5 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-black tracking-tight text-blue-400">Quickpin</h1>
              <p className="text-xs text-slate-400 mt-0.5">Admin Management</p>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="md:hidden text-slate-400 hover:text-white text-xl"
            >
              ✕
            </button>
          </div>
        </div>

        <Suspense fallback={<div className="p-4 text-xs text-slate-500">Loading navigation...</div>}>
          <NavigationMenu onItemClick={() => setSidebarOpen(false)} />
        </Suspense>
      </aside>

      {/* Backdrop for mobile */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/60 z-30 md:hidden backdrop-blur-xs"
        />
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
          <div className="px-4 py-3 flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 rounded-md hover:bg-slate-100 text-slate-700 text-xl"
            >
              ☰
            </button>

            <div className="hidden md:block">
              <span className="text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
                Live Operations Engine
              </span>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-slate-800">{adminName}</p>
                <p className="text-[11px] text-slate-500 uppercase tracking-wider font-medium">
                  {adminRole.replace("_", " ")}
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="text-xs font-medium bg-red-50 hover:bg-red-100 text-red-600 px-3.5 py-2 rounded-lg transition border border-red-200"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
