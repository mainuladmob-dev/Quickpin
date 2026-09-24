"use client";

import { useEffect, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";

interface DeliveryOrder {
  id: string;
  order_number: string;
  order_status: string;
  total_amount: number;
  delivery_type: string;
  payment_type: string;
  payment_status: string;
  created_at: string;
  profiles?: {
    name?: string;
    phone?: string;
    email?: string;
  };
  order_items?: any[];
  items?: any[];
}

export default function DeliveriesPage() {
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"active" | "completed">("active");
  const [isPending, startTransition] = useTransition();
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const supabase = createClient();

  const fetchDeliveries = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          id,
          order_number,
          order_status,
          total_amount,
          delivery_type,
          payment_type,
          payment_status,
          created_at,
          profiles ( name, phone, email ),
          order_items ( id, quantity, price )
        `)
        .in("order_status", ["out_for_delivery", "delivered"])
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOrders((data as DeliveryOrder[]) || []);
    } catch (err) {
      console.error("Failed to load deliveries:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeliveries();
  }, []);

  const handleMarkDelivered = async (orderId: string) => {
    if (!confirm("অর্ডারটি কি সফলভাবে ডেলিভারি ও ক্যাশ রিসিভ সম্পন্ন হয়েছে?")) return;

    setUpdatingId(orderId);
    try {
      const { error } = await supabase
        .from("orders")
        .update({
          order_status: "delivered",
          payment_status: "paid",
        })
        .eq("id", orderId);

      if (error) throw error;

      startTransition(() => {
        setOrders((prev) =>
          prev.map((o) =>
            o.id === orderId
              ? { ...o, order_status: "delivered", payment_status: "paid" }
              : o
          )
        );
      });
    } catch (err) {
      alert("ডেলিভারি স্ট্যাটাস আপডেট করতে সমস্যা হয়েছে।");
      console.error(err);
    } finally {
      setUpdatingId(null);
    }
  };

  const activeDeliveries = orders.filter((o) => o.order_status === "out_for_delivery");
  const completedDeliveries = orders.filter((o) => o.order_status === "delivered");

  const displayedOrders = activeTab === "active" ? activeDeliveries : completedDeliveries;

  // ক্যাশ অন ডেলিভারি (COD) হিসেবে কত টাকা সংগ্রহ বাকি
  const pendingCashCollection = activeDeliveries
    .filter((o) => o.payment_status !== "paid")
    .reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <span>🚚</span> Deliveries & Handover
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            রাস্তায় থাকা পার্সেল ট্র্যাকিং ও ক্যাশ কালেকশন ম্যানেজমেন্ট
          </p>
        </div>

        <button
          onClick={fetchDeliveries}
          disabled={loading}
          className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition shadow-2xs"
        >
          🔄 Refresh
        </button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <p className="text-xs font-medium text-slate-500">অন দ্য ওয়ে (রাস্তায় আছে)</p>
          <p className="text-2xl font-bold text-purple-700 mt-1">
            {activeDeliveries.length}
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <p className="text-xs font-medium text-slate-500">ক্যাশ কালেকশন বাকি (COD)</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">
            ₹{pendingCashCollection.toFixed(2)}
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <p className="text-xs font-medium text-slate-500">আজকের ডেলিভারি সম্পন্ন</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">
            {completedDeliveries.length}
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab("active")}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition ${
            activeTab === "active"
              ? "bg-purple-600 text-white shadow-xs"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          Active Deliveries ({activeDeliveries.length})
        </button>
        <button
          onClick={() => setActiveTab("completed")}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition ${
            activeTab === "completed"
              ? "bg-emerald-600 text-white shadow-xs"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          Completed ({completedDeliveries.length})
        </button>
      </div>

      {/* Content List */}
      {loading ? (
        <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-xs text-slate-400">
          ডেলিভারি তথ্য লোড হচ্ছে...
        </div>
      ) : displayedOrders.length === 0 ? (
        <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-xs text-slate-400">
          বর্তমানে কোনো {activeTab === "active" ? "অ্যাক্টিভ" : "ডেলিভার্ড"} রেকর্ড নেই।
        </div>
      ) : (
        <div className="space-y-3">
          {displayedOrders.map((order) => {
            const isUpdating = updatingId === order.id;

            return (
              <div
                key={order.id}
                className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-4"
              >
                {/* Left Info */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">
                      #{order.order_number}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase border ${
                        order.order_status === "delivered"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-purple-50 text-purple-700 border-purple-200"
                      }`}
                    >
                      {order.order_status.replace(/_/g, " ")}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 flex items-center gap-2">
                    <span>👤 {order.profiles?.name || "Customer"}</span>
                    <span>•</span>
                    <span>📞 {order.profiles?.phone || "No Phone"}</span>
                  </p>

                  <p className="text-[11px] text-slate-400">
                    টাইপ: {order.delivery_type === "home_delivery" ? "Home Delivery" : "Pickup"}
                  </p>
                </div>

                {/* Amount & Actions */}
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-xs text-slate-400">কালেকশন বিল</p>
                    <p className="text-base font-bold text-slate-900">
                      ₹{Number(order.total_amount || 0).toFixed(2)}
                    </p>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        order.payment_status === "paid"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {order.payment_status === "paid" ? "Paid" : "Cash Due"}
                    </span>
                  </div>

                  {order.order_status === "out_for_delivery" && (
                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => handleMarkDelivered(order.id)}
                      className="px-3.5 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition active:scale-95 disabled:opacity-50"
                    >
                      {isUpdating ? "আপডেট হচ্ছে..." : "✓ Mark Delivered"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
      }

