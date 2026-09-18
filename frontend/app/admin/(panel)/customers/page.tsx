"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Customer = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  joined_at: string;
  order_count: number;
  total_spent: number;
  last_order_at: string | null;
  city: string | null;
  state: string | null;
  address_line1: string | null;
};

export default function AdminCustomersPage() {
  const supabase = createClient();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchCustomers = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("customer_stats")
        .select("*")
        .order("joined_at", { ascending: false });

      if (error) console.error(error);
      setCustomers(data || []);
      setLoading(false);
    };

    fetchCustomers();
  }, [supabase]);

  const filtered = customers.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (c.name || "").toLowerCase().includes(q) ||
      (c.email || "").toLowerCase().includes(q) ||
      (c.phone || "").toLowerCase().includes(q) ||
      (c.city || "").toLowerCase().includes(q) ||
      (c.state || "").toLowerCase().includes(q)
    );
  });

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hr ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Customers</h1>
        <span className="text-sm text-gray-500">
          Total: {customers.length}
        </span>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by name, email, phone, city..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full md:w-80 px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 text-sm"
        />
      </div>

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center text-gray-500">
          {search ? "No matching customers" : "No customers yet"}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => (
            <div
              key={c.id}
              className="bg-white rounded-xl p-4 border border-gray-200"
            >
              {/* Header Row */}
              <div className="flex items-start gap-3 mb-3">
                {c.avatar_url ? (
                  <img
                    src={c.avatar_url}
                    alt={c.name || "Customer"}
                    className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold flex-shrink-0">
                    {(c.name || c.email || "C").charAt(0).toUpperCase()}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-800 text-sm truncate">
                    {c.name || "—"}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{c.email}</p>
                </div>
              </div>

              {/* Contact Info */}
              <div className="bg-gray-50 rounded-lg p-3 mb-3 space-y-1">
                {c.phone ? (
                  <a
                    href={`tel:${c.phone}`}
                    className="flex items-center gap-2 text-blue-600 hover:underline text-sm"
                  >
                    <span>📱</span>
                    <span className="font-medium">{c.phone}</span>
                  </a>
                ) : (
                  <p className="flex items-center gap-2 text-xs text-gray-400">
                    <span>📱</span>
                    <span>No phone number</span>
                  </p>
                )}

                {c.city && c.state ? (
                  <p className="flex items-center gap-2 text-xs text-gray-600">
                    <span>📍</span>
                    <span>
                      {c.city}, {c.state}
                    </span>
                  </p>
                ) : null}
              </div>

              {/* Stats Row */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="bg-blue-50 rounded-lg p-2.5 text-center">
                  <p className="text-xs text-blue-600 font-medium mb-0.5">
                    🛒 Orders
                  </p>
                  <p className="text-lg font-bold text-blue-700">
                    {c.order_count}
                  </p>
                </div>
                <div className="bg-green-50 rounded-lg p-2.5 text-center">
                  <p className="text-xs text-green-600 font-medium mb-0.5">
                    💰 Total Spent
                  </p>
                  <p className="text-lg font-bold text-green-700">
                    ₹{Number(c.total_spent).toFixed(0)}
                  </p>
                </div>
              </div>

              {/* Last Order + Joined */}
              <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-100">
                <span>
                  🕐 Last order:{" "}
                  <span className="font-medium text-gray-700">
                    {formatTime(c.last_order_at)}
                  </span>
                </span>
                <span>
                  📅 Joined:{" "}
                  <span className="font-medium text-gray-700">
                    {formatDate(c.joined_at)}
                  </span>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
                  }
