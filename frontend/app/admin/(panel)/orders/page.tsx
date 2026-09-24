"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import OrderCard from "@/components/admin/orders/OrderCard";
import MasterPicklistModal from "@/components/admin/orders/MasterPicklistModal";
import RefundModal from "@/components/admin/orders/RefundModal";

// Indian Standard Time (IST) onujayi YYYY-MM-DD date ber korar function
function getISTDateString(dateObj: Date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(dateObj); // Returns "YYYY-MM-DD"
}

export default function AdminOrdersPage() {
  const supabase = createClient();

  // 1. Date States (IST Timezone Based)
  const todayIST = useMemo(() => getISTDateString(new Date()), []);
  const yesterdayIST = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return getISTDateString(d);
  }, []);

  const [selectedDate, setSelectedDate] = useState<string>(todayIST);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // 2. Filter States
  const [activeMode, setActiveMode] = useState<string>("all");
  const [activeStatus, setActiveStatus] = useState<string>("all");

  // 3. Modals
  const [picklistOpen, setPicklistOpen] = useState<boolean>(false);
  const [refundModalOrder, setRefundModalOrder] = useState<any | null>(null);

  // 4. Safe Order Fetching (No risky join crashes, strict IST timestamp)
  const fetchOrders = useCallback(async () => {
    setLoading(true);

    try {
      // Indian Time onujayi din-er shuru (00:00:00+05:30) theke shesh (23:59:59+05:30)
      const startOfDayIST = `${selectedDate}T00:00:00+05:30`;
      const endOfDayIST = `${selectedDate}T23:59:59.999+05:30`;

      // Simple direct query jate foreign key-er jonno query fail na kore
      const { data: rawOrders, error } = await supabase
        .from("orders")
        .select("*")
        .gte("created_at", startOfDayIST)
        .lte("created_at", endOfDayIST)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Orders fetch error:", error);
        setOrders([]);
        setLoading(false);
        return;
      }

      if (!rawOrders || rawOrders.length === 0) {
        setOrders([]);
        setLoading(false);
        return;
      }

      // Safe Profile & Item Enrichment (Jodi alada table-e thake)
      const orderIds = rawOrders.map((o) => o.id);
      const userIds = [...new Set(rawOrders.map((o) => o.user_id).filter(Boolean))];

      // Safe fetch profiles
      let profilesMap: Record<string, any> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, name, phone, email, address")
          .in("id", userIds);
        if (profiles) {
          profiles.forEach((p) => {
            profilesMap[p.id] = p;
          });
        }
      }

      // Safe fetch order items (jodi orders.items column fanka thake)
      let itemsMap: Record<string, any[]> = {};
      const { data: orderItems } = await supabase
        .from("order_items")
        .select("*")
        .in("order_id", orderIds);

      if (orderItems) {
        orderItems.forEach((item) => {
          if (!itemsMap[item.order_id]) itemsMap[item.order_id] = [];
          itemsMap[item.order_id].push(item);
        });
      }

      // Shob data eksathe combine kora
      const finalOrders = rawOrders.map((ord) => {
        const items =
          (ord.items && Array.isArray(ord.items) && ord.items.length > 0)
            ? ord.items
            : itemsMap[ord.id] || [];

        return {
          ...ord,
          profile: profilesMap[ord.user_id] || {
            name: ord.customer_name || ord.name || "Customer",
            phone: ord.customer_phone || ord.phone || "N/A",
            address: ord.delivery_address || ord.address || "",
          },
          items,
        };
      });

      setOrders(finalOrders);
    } catch (err) {
      console.error("Unexpected fetch error:", err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [selectedDate, supabase]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // 5. Delivery Mode Filtering Logic
  const filteredByMode = useMemo(() => {
    if (activeMode === "all") return orders;

    return orders.filter((o) => {
      const type = (o.delivery_type || "").toLowerCase();
      const isHome = type.includes("home");
      const isSelf = type.includes("pickup") || type.includes("self");
      const remaining = Number(o.remaining_amount || 0);

      if (activeMode === "home_full") return isHome && remaining <= 0;
      if (activeMode === "home_adv") return isHome && remaining > 0;
      if (activeMode === "self_full") return isSelf && remaining <= 0;
      if (activeMode === "self_adv") return isSelf && remaining > 0;
      return true;
    });
  }, [orders, activeMode]);

  // 6. Status Tab Filtering Logic
  const finalFilteredOrders = useMemo(() => {
    if (activeStatus === "all") return filteredByMode;

    return filteredByMode.filter((o) => {
      const st = (o.order_status || o.status || "").toLowerCase();
      if (activeStatus === "pending") return st === "pending";
      if (activeStatus === "current") return st === "current" || st === "accepted" || st === "processing";
      if (activeStatus === "out_for_delivery") return st === "out_for_delivery";
      if (activeStatus === "delivered") return st === "delivered";
      if (activeStatus === "refund") return st === "refund" || st === "refunded" || Number(o.refund_amount || 0) > 0;
      if (activeStatus === "spam") return st === "spam" || st === "cancelled";
      return true;
    });
  }, [filteredByMode, activeStatus]);

  // 7. Status Counters for Tabs
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: filteredByMode.length,
      pending: 0,
      current: 0,
      out_for_delivery: 0,
      delivered: 0,
      refund: 0,
      spam: 0,
    };

    filteredByMode.forEach((o) => {
      const st = (o.order_status || o.status || "").toLowerCase();
      if (st === "pending") counts.pending++;
      if (st === "current" || st === "accepted" || st === "processing") counts.current++;
      if (st === "out_for_delivery") counts.out_for_delivery++;
      if (st === "delivered") counts.delivered++;
      if (st === "refund" || st === "refunded" || Number(o.refund_amount || 0) > 0) counts.refund++;
      if (st === "spam" || st === "cancelled") counts.spam++;
    });

    return counts;
  }, [filteredByMode]);

  // Current Orders for Master Picklist
  const currentOrders = useMemo(() => {
    return orders.filter((o) => {
      const st = (o.order_status || o.status || "").toLowerCase();
      return st === "current" || st === "accepted" || st === "processing";
    });
  }, [orders]);

  return (
    <div className="space-y-4 pb-12">
      {/* 1. Date Selector & Master Picklist Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <button
              onClick={() => setSelectedDate(todayIST)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                selectedDate === todayIST
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700"
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setSelectedDate(yesterdayIST)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                selectedDate === yesterdayIST
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700"
              }`}
            >
              Yesterday
            </button>
          </div>

          <button
            onClick={() => setPicklistOpen(true)}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-xs active:scale-95 transition"
          >
            <span>📋 Master Picklist</span>
            <span className="bg-emerald-800 text-white text-[10px] px-1.5 py-0.5 rounded-full">
              {currentOrders.length}
            </span>
          </button>
        </div>

        {/* 2. Delivery Mode Bar (4 Modes) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-t border-slate-100 pt-2.5">
          {[
            { id: "all", label: "All Modes" },
            { id: "home_full", label: "🏠 Home Full" },
            { id: "home_adv", label: "🏠 Home Advance" },
            { id: "self_full", label: "🏪 Self Full" },
            { id: "self_adv", label: "🏪 Self Advance" },
          ].map((mode) => (
            <button
              key={mode.id}
              onClick={() => setActiveMode(mode.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                activeMode === mode.id
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-600"
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Status Tabs (7 Tabs with Dynamic Counts) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {[
          { id: "all", label: "All Orders", count: statusCounts.all },
          { id: "pending", label: "Pending", count: statusCounts.pending },
          { id: "current", label: "Current", count: statusCounts.current },
          { id: "out_for_delivery", label: "Out for Delivery", count: statusCounts.out_for_delivery },
          { id: "delivered", label: "Delivered", count: statusCounts.delivered },
          { id: "refund", label: "Refund", count: statusCounts.refund },
          { id: "spam", label: "Spam", count: statusCounts.spam },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveStatus(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
              activeStatus === tab.id
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-white hover:bg-slate-100 text-slate-600 border border-slate-200"
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                activeStatus === tab.id
                  ? "bg-slate-800 text-blue-300"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* 4. Orders List Area */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-xs font-semibold text-slate-500">Loading orders...</p>
        </div>
      ) : finalFilteredOrders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center space-y-1">
          <p className="text-2xl">📦</p>
          <p className="text-xs font-bold text-slate-700">এই ফিল্টারে কোনো অর্ডার পাওয়া যায়নি</p>
          <p className="text-[11px] text-slate-400">
            তারিখ বা ফিল্টার পরিবর্তন করে চেষ্টা করুন
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {finalFilteredOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onStatusUpdated={fetchOrders}
              onOpenRefundModal={(ord) => setRefundModalOrder(ord)}
            />
          ))}
        </div>
      )}

      {/* 5. Modals */}
      {picklistOpen && (
        <MasterPicklistModal
          isOpen={picklistOpen}
          orders={currentOrders}
          selectedDate={selectedDate}
          onClose={() => setPicklistOpen(false)}
        />
      )}

      {refundModalOrder && (
        <RefundModal
          isOpen={Boolean(refundModalOrder)}
          order={refundModalOrder}
          onClose={() => setRefundModalOrder(null)}
          onSuccess={() => {
            setRefundModalOrder(null);
            fetchOrders();
          }}
        />
      )}
    </div>
  );
            }
