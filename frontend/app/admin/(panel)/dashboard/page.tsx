"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";

interface Order {
  id: string | number;
  created_at: string;
  total_amount: number;
  order_status: string; // 'current', 'out_for_delivery', 'delivered', 'refunded', etc.
  payment_type: string; // 'cash', 'cod', 'online', 'advance', 'full', etc.
  payment_status: string; // 'full', 'advance', 'pending', 'paid'
  delivery_type: string; // 'home', 'pickup' (ba 'self')
  is_refund_paid?: boolean;
  refund_amount?: number;
  customer_name?: string;
  customer_phone?: string;
}

interface DashboardMetrics {
  totalOrders: number;
  totalDeliveredOrders: number;
  totalRefunds: number;
  cashInDrawer: number;
  bankSettlement: number;
  netRealizedSales: number;
}

export default function DashboardPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // Date Filters
  const todayStr = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Status & Delivery Mode Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deliveryFilter, setDeliveryFilter] = useState<string>("all");

  const supabase = createClient();

  // Date Shortcut Handlers
  const handleToday = () => setSelectedDate(todayStr);
  const handleYesterday = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().split("T")[0]);
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      // Date onujayi fetch (00:00:00 theke 23:59:59 porjonto)
      const startDate = `${selectedDate}T00:00:00.000Z`;
      const endDate = `${selectedDate}T23:59:59.999Z`;

      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .gte("created_at", startDate)
        .lte("created_at", endDate)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (err) {
      console.error("Order load korte shomossha hoyeche:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [selectedDate]);

  // Metrics Calculation
  const metrics: DashboardMetrics = useMemo(() => {
    let deliveredCount = 0;
    let cash = 0;
    let bank = 0;
    let refunds = 0;

    orders.forEach((o) => {
      const amount = Number(o.total_amount || 0);
      const refundAmt = Number(o.refund_amount || 0);

      if (o.order_status === "delivered") {
        deliveredCount += 1;
        if (o.payment_type === "cash" || o.payment_type === "cod") {
          cash += amount;
        } else {
          bank += amount;
        }
      }

      if (o.is_refund_paid || o.order_status === "refunded") {
        refunds += refundAmt > 0 ? refundAmt : amount;
      }
    });

    return {
      totalOrders: orders.length,
      totalDeliveredOrders: deliveredCount,
      totalRefunds: refunds,
      cashInDrawer: cash,
      bankSettlement: bank,
      netRealizedSales: cash + bank - refunds,
    };
  }, [orders]);

  // 4 Delivery Modes + All Mode Filter Logic
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // 1. Order Status Filter
      if (statusFilter !== "all" && order.order_status !== statusFilter) {
        return false;
      }

      // Helper booleans for 4 specific combinations
      const isHome = order.delivery_type === "home";
      const isSelf = order.delivery_type === "pickup" || order.delivery_type === "self";
      
      const isFull = 
        order.payment_status === "full" || 
        order.payment_status === "paid" || 
        order.payment_type === "full";

      const isAdvance = 
        order.payment_status === "advance" || 
        order.payment_type === "advance";

      // 2. 4 Delivery Modes Condition
      if (deliveryFilter === "home_full") return isHome && isFull;
      if (deliveryFilter === "home_advance") return isHome && isAdvance;
      if (deliveryFilter === "self_full") return isSelf && isFull;
      if (deliveryFilter === "self_advance") return isSelf && isAdvance;

      return true; // "all" mode
    });
  }, [orders, statusFilter, deliveryFilter]);

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-4">
      {/* Top Bar: Date Picker & Picklist Button */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 border border-blue-500 rounded-lg px-2.5 py-1.5 bg-white text-xs font-medium">
            <span>📅 তারিখ:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="outline-none bg-transparent cursor-pointer font-semibold text-slate-800"
            />
          </div>

          <button
            onClick={handleToday}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              selectedDate === todayStr
                ? "bg-blue-600 text-white"
                : "bg-blue-50 text-blue-700 hover:bg-blue-100"
            }`}
          >
            Today
          </button>

          <button
            onClick={handleYesterday}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
          >
            Yesterday
          </button>
        </div>

        <button className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition shadow-xs">
          📋 Master Picklist
        </button>
      </div>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <p className="text-[11px] font-semibold text-slate-500">মোট অর্ডার</p>
          <p className="text-xl font-bold text-slate-900 mt-1">{metrics.totalOrders}</p>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <p className="text-[11px] font-semibold text-slate-500">ডেলিভারি সম্পন্ন</p>
          <p className="text-xl font-bold text-blue-600 mt-1">₹{metrics.cashInDrawer + metrics.bankSettlement}</p>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <p className="text-[11px] font-semibold text-rose-500">মোট রিফান্ড</p>
          <p className="text-xl font-bold text-rose-600 mt-1">- ₹{metrics.totalRefunds.toFixed(2)}</p>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <p className="text-[11px] font-semibold text-emerald-600">আসল ক্যাশ সেলস</p>
          <p className="text-xl font-bold text-emerald-700 mt-1">₹{metrics.cashInDrawer.toFixed(2)}</p>
        </div>
      </div>

      {/* Order Status Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs font-medium">
        {[
          { id: "all", label: "All Orders" },
          { id: "current", label: "Current Order" },
          { id: "out_for_delivery", label: "Out for Delivery" },
          { id: "delivered", label: "Delivered" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setStatusFilter(tab.id)}
            className={`px-3 py-1.5 rounded-full whitespace-nowrap transition ${
              statusFilter === tab.id
                ? "bg-slate-900 text-white font-semibold"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Oi 4-te Delivery Mode + Sab Mode Filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs font-medium">
        {[
          { id: "all", label: "সব মোড" },
          { id: "home_full", label: "🏠 Home Full" },
          { id: "home_advance", label: "🏠 Home Advance" },
          { id: "self_full", label: "🏪 Self Full" },
          { id: "self_advance", label: "🏪 Self Advance" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setDeliveryFilter(tab.id)}
            className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition ${
              deliveryFilter === tab.id
                ? "bg-blue-600 text-white font-semibold shadow-2xs"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Orders List / Empty State */}
      <div className="bg-white rounded-2xl border border-slate-200 min-h-[160px] p-4 flex flex-col justify-center items-center shadow-2xs">
        {loading ? (
          <p className="text-xs text-slate-400">অর্ডার লোড হচ্ছে...</p>
        ) : filteredOrders.length === 0 ? (
          <p className="text-xs text-slate-400 font-medium">এই ফিল্টারে কোনো অর্ডার পাওয়া যায়নি।</p>
        ) : (
          <div className="w-full space-y-2">
            {filteredOrders.map((ord) => (
              <div
                key={ord.id}
                className="p-3 border border-slate-100 bg-slate-50/50 rounded-xl flex justify-between items-center text-xs"
              >
                <div>
                  <span className="font-bold text-slate-800">#{ord.id}</span>
                  <span className="ml-2 text-slate-500 capitalize">
                    {ord.delivery_type} ({ord.payment_status || ord.payment_type})
                  </span>
                </div>
                <span className="font-bold text-slate-900">₹{ord.total_amount}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

