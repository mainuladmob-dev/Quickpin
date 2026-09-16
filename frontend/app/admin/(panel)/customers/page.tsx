"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Customer = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
};

export default function AdminCustomersPage() {
  const supabase = createClient();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchCustomers = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("profiles")
        .select("id, name, email, phone, avatar_url, created_at")
        .eq("role", "customer")
        .order("created_at", { ascending: false });
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
      (c.phone || "").toLowerCase().includes(q)
    );
  });

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
          placeholder="Search by name, email, phone..."
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
              className="bg-white rounded-xl p-4 border border-gray-200 flex items-center gap-3"
            >
              {c.avatar_url ? (
                <img
                  src={c.avatar_url}
                  alt={c.name || "Customer"}
                  className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold flex-shrink-0">
                  {(c.name || c.email || "C").charAt(0).toUpperCase()}
                </div>
              )}

              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-800 text-sm truncate">
                  {c.name || "—"}
                </p>
                <p className="text-xs text-gray-500 truncate">{c.email}</p>
                {c.phone && (
                  <p className="text-xs text-gray-400 truncate">
                    📱 {c.phone}
                  </p>
                )}
              </div>

              <div className="text-right flex-shrink-0">
                <p className="text-xs text-gray-400">
                  {new Date(c.created_at).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
                }
