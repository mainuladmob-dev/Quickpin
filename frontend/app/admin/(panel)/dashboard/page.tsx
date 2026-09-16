"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function AdminDashboardPage() {
  const supabase = createClient();
  const [stats, setStats] = useState({
    pending: 0,
    current: 0,
    outForDelivery: 0,
    delivered: 0,
    refund: 0,
    spam: 0,
    totalProducts: 0,
    totalCategories: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const [
        pending,
        current,
        outForDelivery,
        delivered,
        refund,
        spam,
        products,
        categories,
      ] = await Promise.all([
        supabase.from("orders").select("*", { count: "exact", head: true }).eq("order_status", "pending"),
        supabase.from("orders").select("*", { count: "exact", head: true }).eq("order_status", "current"),
        supabase.from("orders").select("*", { count: "exact", head: true }).eq("order_status", "out_for_delivery"),
        supabase.from("orders").select("*", { count: "exact", head: true }).eq("order_status", "delivered"),
        supabase.from("orders").select("*", { count: "exact", head: true }).eq("order_status", "refund"),
        supabase.from("orders").select("*", { count: "exact", head: true }).eq("order_status", "spam"),
        supabase.from("products").select("*", { count: "exact", head: true }),
        supabase.from("categories").select("*", { count: "exact", head: true }),
      ]);

      setStats({
        pending: pending.count || 0,
        current: current.count || 0,
        outForDelivery: outForDelivery.count || 0,
        delivered: delivered.count || 0,
        refund: refund.count || 0,
        spam: spam.count || 0,
        totalProducts: products.count || 0,
        totalCategories: categories.count || 0,
      });
      setLoading(false);
    };

    fetchStats();
  }, [supabase]);

  const orderCards = [
    { label: "Pending", value: stats.pending, color: "bg-yellow-50 text-yellow-700 border-yellow-200", href: "/admin/orders?status=pending" },
    { label: "Current", value: stats.current, color: "bg-green-50 text-green-700 border-green-200", href: "/admin/orders?status=current" },
    { label: "Out for Delivery", value: stats.outForDelivery, color: "bg-blue-50 text-blue-700 border-blue-200", href: "/admin/orders?status=out_for_delivery" },
    { label: "Delivered", value: stats.delivered, color: "bg-emerald-50 text-emerald-700 border-emerald-200", href: "/admin/orders?status=delivered" },
    { label: "Refund", value: stats.refund, color: "bg-purple-50 text-purple-700 border-purple-200", href: "/admin/orders?status=refund" },
    { label: "Spam", value: stats.spam, color: "bg-red-50 text-red-700 border-red-200", href: "/admin/orders?status=spam" },
  ];

  if (loading) {
    return <p className="text-gray-500">Loading dashboard...</p>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Dashboard</h1>

      <h2 className="text-lg font-semibold text-gray-700 mb-3">Orders</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {orderCards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className={`rounded-xl p-4 border-2 ${card.color} hover:shadow-md transition`}
          >
            <p className="text-3xl font-bold">{card.value}</p>
            <p className="text-xs font-medium mt-1">{card.label}</p>
          </Link>
        ))}
      </div>

      <h2 className="text-lg font-semibold text-gray-700 mb-3">Catalog</h2>
      <div className="grid grid-cols-2 gap-4">
        <Link href="/admin/products" className="bg-white rounded-xl p-5 border border-gray-200 hover:shadow-md transition">
          <p className="text-3xl font-bold text-blue-600">{stats.totalProducts}</p>
          <p className="text-sm font-medium text-gray-600 mt-1">Total Products</p>
        </Link>
        <Link href="/admin/categories" className="bg-white rounded-xl p-5 border border-gray-200 hover:shadow-md transition">
          <p className="text-3xl font-bold text-blue-600">{stats.totalCategories}</p>
          <p className="text-sm font-medium text-gray-600 mt-1">Total Categories</p>
        </Link>
      </div>
    </div>
  );
}
