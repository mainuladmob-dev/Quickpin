"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type OrderItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  weight?: string | number | null;
};

export type Order = {
  id: string;
  order_number: string;
  created_at: string;
  customer_name?: string | null;
  customer_phone?: string | null;
  items: OrderItem[];
  gross_bill: number;
  refund_amount: number;
  net_realized: number;
  delivery_type: "pickup" | "delivery";
  payment_status: "paid" | "pending" | "failed";
  order_status: "current" | "out_for_delivery" | "delivered" | "refund" | "refunded" | "pending" | "spam";
  is_refund_paid?: boolean; // রিফান্ডের টাকা পাঠানো সম্পন্ন হয়েছে কি না
};

interface OrdersTableProps {
  orders: Order[];
  onRefresh?: () => void;
}

export default function OrdersTable({ orders: initialOrders, onRefresh }: OrdersTableProps) {
  const supabase = createClient();
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [selectedFilter, setSelectedFilter] = useState<string>("Refund");
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const filters = [
    "All Orders",
    "Current Order",
    "Out for Delivery",
    "Delivered",
    "Refund",
    "Pending Order",
    "Spam",
  ];

  // ফিল্টার অনুযায়ী অর্ডার তালিকা
  const filteredOrders = orders.filter((order) => {
    if (selectedFilter === "All Orders") return true;
    if (selectedFilter === "Current Order") return order.order_status === "current";
    if (selectedFilter === "Out for Delivery") return order.order_status === "out_for_delivery";
    if (selectedFilter === "Delivered") return order.order_status === "delivered";
    if (selectedFilter === "Refund") return order.order_status === "refund" || order.order_status === "refunded" || order.refund_amount > 0;
    if (selectedFilter === "Pending Order") return order.order_status === "pending";
    if (selectedFilter === "Spam") return order.order_status === "spam";
    return true;
  });

  // রিফান্ড পেমেন্ট সম্পন্ন করার হ্যান্ডলার
  const handleConfirmRefundPayment = async (order: Order) => {
    if (!confirm(`অর্ডার #${order.order_number}-এর রিফান্ড পেমেন্ট (₹${order.refund_amount}) কাস্টমারকে পাঠানো সম্পন্ন হয়েছে?`)) {
      return;
    }

    setUpdatingId(order.id);

    // টাকা পরিশোধ হওয়ার পরই কেবল স্ট্যাটাস চূড়ান্তভাবে 'refunded' হবে
    const { error } = await supabase
      .from("orders")
      .update({
        order_status: "refunded",
        is_refund_paid: true,
        refund_paid_at: new Date().toISOString(),
      })
      .eq("id", order.id);

    if (error) {
      alert("Error: " + error.message);
    } else {
      setOrders((prev) =>
        prev.map((o) =>
          o.id === order.id
            ? { ...o, order_status: "refunded", is_refund_paid: true }
            : o
        )
      );
      if (onRefresh) onRefresh();
    }
    setUpdatingId(null);
  };

  // স্ট্যাটাস ড্রপডাউন হ্যান্ডলার
  const handleStatusChange = async (orderId: string, newStatus: Order["order_status"]) => {
    setUpdatingId(orderId);
    const { error } = await supabase
      .from("orders")
      .update({ order_status: newStatus })
      .eq("id", orderId);

    if (error) {
      alert("Error: " + error.message);
    } else {
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, order_status: newStatus } : o))
      );
      if (onRefresh) onRefresh();
    }
    setUpdatingId(null);
  };

  const toggleSelectAll = () => {
    if (selectedOrders.length === filteredOrders.length) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(filteredOrders.map((o) => o.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedOrders((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <div className="w-full max-w-xl mx-auto p-3 space-y-4 text-slate-800">
      {/* ফিল্টার বাটন তালিকা */}
      <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100">
        <p className="text-[11px] font-bold text-slate-400 tracking-wider mb-2 uppercase">
          Order Pipeline Status
        </p>
        <div className="flex flex-wrap gap-1.5">
          {filters.map((filter) => (
            <button
              key={filter}
              onClick={() => setSelectedFilter(filter)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                selectedFilter === filter
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-200"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60"
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* সিলেক্ট অল হেডার */}
      <div className="flex items-center justify-between px-1 text-xs text-slate-500 font-medium">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={filteredOrders.length > 0 && selectedOrders.length === filteredOrders.length}
            onChange={toggleSelectAll}
            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <span>Select All ({filteredOrders.length} Orders)</span>
        </label>
        <span className="text-[11px] text-slate-400">Automated Pipeline</span>
      </div>

      {/* অর্ডার কার্ড তালিকা */}
      <div className="space-y-4">
        {filteredOrders.map((order) => {
          const isRefundActive = order.refund_amount > 0 || order.order_status === "refund" || order.order_status === "refunded";
          const isRefundSettled = isRefundActive && order.is_refund_paid;

          return (
            <div
              key={order.id}
              className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 space-y-4"
            >
              {/* কার্ড হেডার */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedOrders.includes(order.id)}
                    onChange={() => toggleSelectOne(order.id)}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">
                        #{order.order_number}
                      </span>
                      {isRefundActive && (
                        <span className="bg-rose-50 text-rose-600 border border-rose-200 text-[10px] font-extrabold px-1.5 py-0.5 rounded uppercase">
                          Refund
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {order.created_at}
                    </p>
                  </div>
                </div>
              </div>

              {/* কাস্টমার ইনফো */}
              <div className="bg-slate-50/70 p-2.5 rounded-xl text-xs space-y-0.5 border border-slate-100">
                <div className="flex items-center gap-1.5 font-semibold text-slate-700">
                  <span>👤</span>
                  <span>Customer Record</span>
                </div>
                <p className="text-slate-400 pl-5 text-[11px]">
                  {order.customer_phone || "No phone attached"}
                </p>
              </div>

              {/* প্যাকেজড আইটেমস */}
              <div className="space-y-2">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Packaged Items ({order.items.length})
                </p>
                <div className="space-y-1.5">
                  {order.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between text-xs py-1 border-b border-slate-50 last:border-0"
                    >
                      <div className="flex items-center gap-2">
                        <span>📦</span>
                        <div>
                          <p className="font-semibold text-slate-800">{item.name}</p>
                          <p className="text-[11px] text-slate-400">
                            ₹{item.price} × {item.quantity} {item.weight ? `(${item.weight})` : ""}
                          </p>
                        </div>
                      </div>
                      <span className="font-bold text-slate-900">
                        ₹{(item.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* বিলিং হিসাব */}
              <div className="pt-2 border-t border-slate-100 space-y-1 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Gross Bill:</span>
                  <span className="font-bold text-slate-900">₹{order.gross_bill.toFixed(2)}</span>
                </div>

                {order.refund_amount > 0 && (
                  <div className="flex justify-between font-semibold text-rose-600">
                    <span>Deducted Refund (UPI):</span>
                    <span>- ₹{order.refund_amount.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between font-bold text-emerald-700 pt-1 text-sm">
                  <span>Actual Net Realized:</span>
                  <span>₹{order.net_realized.toFixed(2)}</span>
                </div>
              </div>

              {/* ব্যাজেস */}
              <div className="flex flex-wrap gap-1.5 text-[11px]">
                <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded-md font-medium border border-amber-200/50">
                  {order.delivery_type === "pickup" ? "🚶 Pickup" : "🚚 Delivery"}
                </span>

                <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded-md font-medium border border-purple-200/50">
                  💳 Full Payment
                </span>

                {/* সংশোধিত স্ট্যাটাস লজিক */}
                <span
                  className={`px-2 py-0.5 rounded-md font-semibold border ${
                    isRefundActive
                      ? isRefundSettled
                        ? "bg-slate-100 text-slate-600 border-slate-200"
                        : "bg-rose-50 text-rose-700 border-rose-200 animate-pulse"
                      : "bg-slate-100 text-slate-700 border-slate-200"
                  }`}
                >
                  Status: {isRefundActive ? (isRefundSettled ? "refunded" : "refund pending") : order.order_status}
                </span>
              </div>

              {/* অ্যাকশন বাটনসমূহ */}
              <div className="space-y-2 pt-1">
                <div className="flex gap-2">
                  {/* স্ট্যাটাস ড্রপডাউন (রিফান্ড সেটেল হলে লক হয়ে যাবে) */}
                  <div className="flex-1">
                    <select
                      value={order.order_status}
                      disabled={isRefundSettled || updatingId === order.id}
                      onChange={(e) =>
                        handleStatusChange(order.id, e.target.value as Order["order_status"])
                      }
                      className="w-full px-2.5 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-400"
                    >
                      <option value="current">Current Order</option>
                      <option value="out_for_delivery">Out for Delivery</option>
                      <option value="delivered">Delivered</option>
                      <option value="refund">Refund</option>
                      <option value="refunded" disabled={!isRefundSettled}>
                        Refunded
                      </option>
                      <option value="spam">Spam</option>
                    </select>
                  </div>

                  {/* Payment Done বাটন (টাকা পাঠানো বাকি থাকলেই কেবল দৃশ্যমান হবে) */}
                  {isRefundActive && (
                    <div className="flex-1">
                      {isRefundSettled ? (
                        <div className="w-full py-2 px-3 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-xl text-center border border-emerald-200">
                          ✅ Refund Settled
                        </div>
                      ) : (
                        <button
                          onClick={() => handleConfirmRefundPayment(order)}
                          disabled={updatingId === order.id}
                          className="w-full py-2 px-3 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-sm shadow-rose-200 disabled:opacity-50 transition"
                        >
                          <span>💳</span>
                          <span>{updatingId === order.id ? "Processing..." : "Payment Done"}</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button className="flex-1 py-1.5 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center justify-center gap-1">
                    <span>👁️</span> Details
                  </button>
                  <button className="flex-1 py-1.5 px-3 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1">
                    <span>🏷️</span> Label
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
                          }
