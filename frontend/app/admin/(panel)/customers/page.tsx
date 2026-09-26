"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import CustomerCard, { type CustomerData } from "./components/CustomerCard";

export default function CustomersPage() {
  const supabase = useMemo(() => createClient(), []);

  const [customers, setCustomers] = useState<CustomerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchCustomers = useCallback(async () => {
    setLoading(true);

    try {
      // 1. Fetch all customer profiles
      const { data: profiles, error: profileErr } = await supabase
        .from("profiles")
        .select("id, name, email, phone, role")
        .eq("role", "customer");

      if (profileErr) throw profileErr;

      if (!profiles || profiles.length === 0) {
        setCustomers([]);
        setLoading(false);
        return;
      }

      const userIds = profiles.map((p) => p.id);

      // 2. Fetch all orders for these customers
      const { data: orders, error: orderErr } = await supabase
        .from("orders")
        .select(
          "id, order_number, user_id, total_amount, order_status, created_at, upi_id"
        )
        .in("user_id", userIds)
        .neq("order_status", "spam")
        .order("created_at", { ascending: false });

      if (orderErr) throw orderErr;

      // 3. Fetch default addresses
      const { data: addresses } = await supabase
        .from("addresses")
        .select(
          "user_id, full_name, phone, address_line1, address_line2, city, state, pincode, is_default"
        )
        .in("user_id", userIds)
        .eq("is_default", true);

      // 4. Build customer data
      const customerList: CustomerData[] = profiles.map((profile) => {
        const customerOrders = (orders || []).filter(
          (o) => o.user_id === profile.id
        );

        // Calculate total spent (only non-spam orders)
        const totalSpent = customerOrders.reduce(
          (sum, o) => sum + (Number(o.total_amount) || 0),
          0
        );

        // Last order date
        const lastOrder = customerOrders[0];

        // Get UPI from most recent order with UPI
        const upiFromOrder = customerOrders.find((o) => o.upi_id)?.upi_id;

        // Get address
        const addr = (addresses || []).find((a) => a.user_id === profile.id);

        return {
          id: profile.id,
          name: profile.name,
          email: profile.email,
          phone: profile.phone || addr?.phone || null,
          upi_id: upiFromOrder || null,
          address: addr
            ? {
                full_name: addr.full_name || "",
                phone: addr.phone || "",
                address_line1: addr.address_line1 || "",
                address_line2: addr.address_line2 || null,
                city: addr.city || "",
                state: addr.state || "",
                pincode: addr.pincode || "",
              }
            : null,
          total_orders: customerOrders.length,
          total_spent: totalSpent,
          last_order_date: lastOrder?.created_at || null,
          order_history: customerOrders.slice(0, 10).map((o) => ({
            id: o.id,
            order_number: o.order_number || `#${o.id.slice(0, 8)}`,
            total_amount: Number(o.total_amount) || 0,
            order_status: o.order_status || "pending",
            created_at: o.created_at,
          })),
        };
      });

      // 5. Sort by last order date (newest first)
      customerList.sort((a, b) => {
        if (!a.last_order_date) return 1;
        if (!b.last_order_date) return -1;
        return (
          new Date(b.last_order_date).getTime() -
          new Date(a.last_order_date).getTime()
        );
      });

      setCustomers(customerList);
    } catch (err) {
      console.error("Customers fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // Filter by search
  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return customers;

    const query = searchQuery.toLowerCase().trim();

    return customers.filter((c) => {
      const nameMatch = c.name?.toLowerCase().includes(query);
      const phoneMatch = c.phone?.toLowerCase().includes(query);
      const emailMatch = c.email?.toLowerCase().includes(query);
      const orderMatch = c.order_history.some((o) =>
        o.order_number.toLowerCase().includes(query)
      );

      return nameMatch || phoneMatch || emailMatch || orderMatch;
    });
  }, [customers, searchQuery]);

  // Stats
  const stats = useMemo(() => {
    const totalSpent = customers.reduce((sum, c) => sum + c.total_spent, 0);
    return {
      total: customers.length,
      totalSpent,
    };
  }, [customers]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
        <p className="text-sm text-gray-500 mt-1">
          View all customer information
        </p>
      </div>

      {/* Stats Summary */}
      {!loading && customers.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl px-4 py-3 border border-gray-100">
            <p className="text-xs text-gray-400 mb-1">Total Customers</p>
            <p className="text-xl font-bold text-blue-600">{stats.total}</p>
          </div>
          <div className="bg-white rounded-xl px-4 py-3 border border-gray-100">
            <p className="text-xs text-gray-400 mb-1">Total Revenue</p>
            <p className="text-xl font-bold text-green-600">
              ₹{stats.totalSpent.toLocaleString("en-IN")}
            </p>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="bg-white rounded-xl p-2 shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 px-2">
          <span className="text-lg">🔍</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, phone, or order ID..."
            className="flex-1 py-2 text-sm bg-transparent outline-none text-gray-800 placeholder-gray-400"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 text-xs"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Customers List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <div className="text-6xl mb-4">👥</div>
          <h2 className="text-lg font-semibold text-gray-700 mb-1">
            {searchQuery ? "No customers found" : "No customers yet"}
          </h2>
          <p className="text-sm text-gray-500">
            {searchQuery
              ? "এই search-এ কোনো customer নেই"
              : "এখনো কোনো customer signup করেনি"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredCustomers.map((customer) => (
            <CustomerCard key={customer.id} customer={customer} />
          ))}
        </div>
      )}
    </div>
  );
            }
