"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export interface OrdersTableProps {
  orders: any[];
  selected?: string[];
  onToggleSelect?: (id: string) => void;
  onToggleSelectAll?: () => void;
  onStatusChange?: (orderId: string, newStatus: string) => void;
  onRefresh?: () => void;
  [key: string]: any; // অন্যান্য যেকোনো প্রপ্স এলেও বিল্ড আটকাতে দেবে না
}

export default function OrdersTable({
  orders = [],
  selected = [],
  onToggleSelect,
  onToggleSelectAll,
  onStatusChange,
  onRefresh,
}: OrdersTableProps) {
  const supabase = createClient();
  const [selectedFilter, setSelectedFilter] = useState<string>("Refund");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [paidRefundIds, setPaidRefundIds] = useState<Record<string, boolean>>({});

  const filters = [
    "All Orders",
    "Current Order",
    "Out for Delivery",
    "Delivered",
    "Refund",
    "Pending Order",
    "Spam",
  ];

  // ফিল্টার অনুযায়ী অর্ডার বাছাই
  const filteredOrders = orders.filter((order) => {
    const status = (order.order_status || order.status || "").toLowerCase();
    const hasRefund = Number(order.refund_amount || order.deducted_refund || 0) > 0;

    if (selectedFilter === "All Orders") return true;
    if (selectedFilter === "Current Order") return status === "current";
    if (selectedFilter === "Out for Delivery") return status === "out_for_delivery";
    if (selectedFilter === "Delivered") return status === "delivered";
    if (selectedFilter === "Refund") return status.includes("refund") || hasRefund;
    if (selectedFilter === "Pending Order") return status === "pending";
    if (selectedFilter === "Spam") return status === "spam";
    return true;
  });

  // রিফান্ড পেমেন্ট কনফার্ম করার হ্যান্ডলার
  const handleConfirmPayment = async (order: any) => {
    const refundAmt = order.refund_amount || order.deducted_refund || 0;
    if (
      !confirm(
        `অর্ডার #${order.order_number || order.id}-এর রিফান্ড টাকা (₹${refundAmt}) কাস্টমারকে পাঠানো সম্পন্ন হয়েছে?`
      )
    ) {
      return;
    }

    setUpdatingId(order.id);
    try {
      const { error } = await supabase
        .from("orders")
        .update({
          order_status: "refunded",
          status: "refunded",
          is_refund_paid: true,
          refund_paid_at: new Date().toISOString(),
        })
        .eq("id", order.id);

      if (error) throw error;

      setPaidRefundIds((prev) => ({ ...prev, [order.id]: true }));

      if (onStatusChange) {
        onStatusChange(order.id, "refunded");
      }
      if (onRefresh) {
        onRefresh();
      }
    } catch (err: any) {
      alert("Error: " + (err.message || "Failed to update"));
    } finally {
      setUpdatingId(null);
    }
  };

  // স্ট্যাটাস ড্রপডাউন হ্যান্ডলার
  const handleDropdownChange = async (orderId: string, newStatus: string) => {
    setUpdatingId(orderId);
    try {
      if (onStatusChange) {
        await onStatusChange(orderId, newStatus);
      } else {
        await supabase
          .from("orders")
          .update({ order_status: newStatus, status: newStatus })
          .eq("id", orderId);
      }
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert("Error: " + (err.message || "Failed to change status"));
    } finally {
      setUpdatingId(null);
    }
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
            checked={
              filteredOrders.length > 0 &&
              filteredOrders.every((o) => selected.includes(o.id))
            }
            onChange={() => onToggleSelectAll && onToggleSelectAll()}
            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <span>Select All ({filteredOrders.length} Orders)</span>
        </label>
        <span className="text-[11px] text-slate-400">Automated Pipeline</span>
      </div>

      {/* অর্ডার কার্ড তালিকা */}
      <div className="space-y-4">
        {filteredOrders.map((order) => {
          const refundAmt = Number(order.refund_amount || order.deducted_refund || 0);
          const isRefundActive =
            refundAmt > 0 ||
            (order.order_status || order.status || "").toLowerCase().includes("refund");

          // রিফান্ড পেমেন্ট সম্পন্ন হয়েছে কি না
          const isRefundPaid = Boolean(
            order.is_refund_paid || paidRefundIds[order.id]
          );

          const gross = Number(order.gross_bill || order.total_amount || order.total || 0);
          const net = Number(order.net_realized || order.net_amount || (gross - refundAmt));
          const itemsList = order.items || order.order_items || [];
          const phone =
            order.customer_phone ||
            order.phone ||
            order.profiles?.phone ||
            order.addresses?.phone ||
            "No phone attached";

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
                    checked={selected.includes(order.id)}
                    onChange={() => onToggleSelect && onToggleSelect(order.id)}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">
                        #{order.order_number || String(order.id).slice(0, 10)}
                      </span>
                      {isRefundActive && (
                        <span className="bg-rose-50 text-rose-600 border border-rose-200 text-[10px] font-extrabold px-1.5 py-0.5 rounded uppercase">
                          Refund
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {order.created_at || "Recent"}
                    </p>
                  </div>
                </div>
              </div>

              {/* কাস্টমার রেকর্ড */}
              <div className="bg-slate-50/70 p-2.5 rounded-xl text-xs space-y-0.5 border border-slate-100">
                <div className="flex items-center gap-1.5 font-semibold text-slate-700">
                  <span>👤</span>
                  <span>Customer Record</span>
                </div>
                <p className="text-slate-400 pl-5 text-[11px]">{phone}</p>
              </div>

              {/* প্যাকেজড আইটেমস */}
              <div className="space-y-2">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Packaged Items ({itemsList.length})
                </p>
                <div className="space-y-1.5">
                  {itemsList.map((item: any, idx: number) => {
                    const itemName = item.name || item.product_name || item.products?.name_en || "Item";
                    const itemPrice = Number(item.price || item.unit_price || 0);
                    const itemQty = Number(item.quantity || 1);
                    const itemWeight = item.weight ? `(${item.weight})` : "";

                    return (
                      <div
                        key={item.id || idx}
                        className="flex items-center justify-between text-xs py-1 border-b border-slate-50 last:border-0"
                      >
                        <div className="flex items-center gap-2">
                          <span>📦</span>
                          <div>
                            <p className="font-semibold text-slate-800">{itemName}</p>
                            <p className="text-[11px] text-slate-400">
                              ₹{itemPrice} × {itemQty} {itemWeight}
                            </p>
                          </div>
                        </div>
                        <span className="font-bold text-slate-900">
                          ₹{(itemPrice * itemQty).toFixed(2)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* বিলিং হিসাব */}
              <div className="pt-2 border-t border-slate-100 space-y-1 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Gross Bill:</span>
                  <span className="font-bold text-slate-900">₹{gross.toFixed(2)}</span>
                </div>

                {refundAmt > 0 && (
                  <div className="flex justify-between font-semibold text-rose-600">
                    <span>Deducted Refund (UPI):</span>
                    <span>- ₹{refundAmt.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between font-bold text-emerald-700 pt-1 text-sm">
                  <span>Actual Net Realized:</span>
                  <span>₹{net.toFixed(2)}</span>
                </div>
              </div>

              {/* স্ট্যাটাস ও ডেলিভারি ব্যাজ */}
              <div className="flex flex-wrap gap-1.5 text-[11px]">
                <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded-md font-medium border border-amber-200/50">
                  {order.delivery_type === "pickup" ? "🚶 Pickup" : "🚚 Delivery"}
                </span>

                <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded-md font-medium border border-purple-200/50">
                  💳 Full Payment
                </span>

                {/* সংশোধিত স্ট্যাটাস লজিক: টাকা না দেওয়া পর্যন্ত 'refund pending' দেখাবে */}
                <span
                  className={`px-2 py-0.5 rounded-md font-semibold border ${
                    isRefundActive
                      ? isRefundPaid
                        ? "bg-slate-100 text-slate-700 border-slate-200"
                        : "bg-rose-50 text-rose-700 border-rose-200"
                      : "bg-slate-100 text-slate-700 border-slate-200"
                  }`}
                >
                  Status:{" "}
                  {isRefundActive
                    ? isRefundPaid
                      ? "refunded"
                      : "refund pending"
                    : order.order_status || order.status || "current"}
                </span>
              </div>

              {/* অ্যাকশন বাটনসমূহ */}
              <div className="space-y-2 pt-1">
                <div className="flex gap-2">
                  {/* ড্রপডাউন: রিফান্ড টাকা পরিশোধ হয়ে গেলে এটি লক হয়ে যাবে */}
                  <div className="flex-1">
                    <select
                      value={
                        isRefundActive
                          ? isRefundPaid
                            ? "refunded"
                            : "refund"
                          : order.order_status || order.status || "current"
                      }
                      disabled={isRefundPaid || updatingId === order.id}
                      onChange={(e) => handleDropdownChange(order.id, e.target.value)}
                      className="w-full px-2.5 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-400"
                    >
                      <option value="current">Current Order</option>
                      <option value="out_for_delivery">Out for Delivery</option>
                      <option value="delivered">Delivered</option>
                      <option value="refund">Refund</option>
                      <option value="refunded" disabled={!isRefundPaid}>
                        Refunded
                      </option>
                      <option value="spam">Spam</option>
                    </select>
                  </div>

                  {/* Payment Done বাটন: টাকা পরিশোধ হওয়ার পরেই কেবল Settled দেখাবে */}
                  {isRefundActive && (
                    <div className="flex-1">
                      {isRefundPaid ? (
                        <div className="w-full py-2 px-3 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-xl text-center border border-emerald-200">
                          ✅ Refund Settled
                        </div>
                      ) : (
                        <button
                          onClick={() => handleConfirmPayment(order)}
                          disabled={updatingId === order.id}
                          className="w-full py-2 px-3 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-sm shadow-rose-200 disabled:opacity-50 transition"
                        >
                          <span>💳</span>
                          <span>
                            {updatingId === order.id ? "Processing..." : "Payment Done"}
                          </span>
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
