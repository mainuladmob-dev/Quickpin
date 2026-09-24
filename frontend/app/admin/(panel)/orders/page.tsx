"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import OrderCard, { Order } from "./OrderCard";
import OrderModals from "./OrderModals";
import RefundModal from "./RefundModal";

export default function AdminOrdersPage() {
  const supabase = createClient();

  // লোকাল তারিখ ফরম্যাট (YYYY-MM-DD)
  const getLocalDateString = (d = new Date()) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const [selectedDate, setSelectedDate] = useState<string>(getLocalDateString());
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});

  // ফিল্টার স্ট্যাটাস ও মোড
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [modeFilter, setModeFilter] = useState<string>("all");

  // মোডাল হ্যান্ডলিং স্টেট
  const [showPicklist, setShowPicklist] = useState<boolean>(false);
  const [rejectingOrder, setRejectingOrder] = useState<Order | null>(null);
  const [refundingOrder, setRefundingOrder] = useState<Order | null>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  // ডেটাবেজ থেকে অর্ডার আনা
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const startOfDay = `${selectedDate}T00:00:00.000Z`;
      const endOfDay = `${selectedDate}T23:59:59.999Z`;

      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          profile:profiles(name, phone, email, address),
          items:order_items(
            id,
            product_name,
            name,
            quantity,
            unit_price,
            price,
            unit,
            weight
          )
        `)
        .gte("created_at", startOfDay)
        .lte("created_at", endOfDay)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("অর্ডার ফেচিং এরর:", error);
      } else {
        setOrders((data as Order[]) || []);
      }
    } catch (err) {
      console.error("নেটওয়ার্ক সমস্যা:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedDate, supabase]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // স্ট্যাটাস পরিবর্তন
  const handleStatusChange = async (orderId: string, nextStatus: string) => {
    setActionLoading(true);
    const { error } = await supabase
      .from("orders")
      .update({
        order_status: nextStatus,
        status_changed_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    setActionLoading(false);
    if (error) {
      alert("স্ট্যাটাস আপডেট করা সম্ভব হয়নি: " + error.message);
    } else {
      fetchOrders();
    }
  };

  // পেমেন্ট অনুমোদন
  const handleApprovePayment = async (order: Order) => {
    setActionLoading(true);
    const { error } = await supabase
      .from("orders")
      .update({
        payment_status: "paid",
        paid_amount: order.total_amount,
        remaining_amount: 0,
        screenshot_status: "approved",
        order_status: "current",
        status_changed_at: new Date().toISOString(),
      })
      .eq("id", order.id);

    setActionLoading(false);
    if (error) {
      alert("পেমেন্ট অ্যাপ্রুভ করা যায়নি: " + error.message);
    } else {
      fetchOrders();
    }
  };

  // ক্যাশ মেমো প্রিন্ট
  const handlePrintSlip = (order: Order) => {
    const printWin = window.open("", "_blank");
    if (!printWin) return;
    const isPickup = order.delivery_type === "pickup" || order.delivery_type === "self_pickup";

    printWin.document.write(`
      <html>
        <head>
          <title>Cash Memo #${order.order_number}</title>
          <style>
            body { font-family: monospace; padding: 20px; font-size: 13px; color: #000; }
            .header { text-align: center; margin-bottom: 15px; border-bottom: 1px dashed #000; padding-bottom: 10px; }
            .row { display: flex; justify-content: space-between; margin-bottom: 5px; }
            .table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            .table th, .table td { border-bottom: 1px dashed #ccc; padding: 6px 0; text-align: left; }
            .table th:last-child, .table td:last-child { text-align: right; }
            .summary { margin-top: 15px; border-top: 1px dashed #000; padding-top: 8px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2 style="margin:0;">Quickpin Grocery</h2>
            <p style="margin:4px 0 0 0;">Order #${order.order_number}</p>
            <p style="margin:2px 0 0 0;">${new Date(order.created_at).toLocaleString()}</p>
          </div>
          <div>
            <p><strong>Customer:</strong> ${order.profile?.name || "Customer"}</p>
            <p><strong>Phone:</strong> ${order.profile?.phone || "N/A"}</p>
            <p><strong>Mode:</strong> ${isPickup ? "Self Pickup" : "Home Delivery"}</p>
            ${order.delivery_address ? `<p><strong>Address:</strong> ${order.delivery_address}</p>` : ""}
          </div>
          <table class="table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Qty</th>
                <th>Price</th>
              </tr>
            </thead>
            <tbody>
              ${(order.items || [])
                .map(
                  (item) => `
                <tr>
                  <td>${item.product_name || item.name}</td>
                  <td>${item.quantity}${item.unit || ""}</td>
                  <td>₹${Number((item.unit_price || item.price || 0) * item.quantity).toFixed(2)}</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
          <div class="summary">
            <div class="row"><span>Total Amount:</span><span>₹${Number(order.total_amount).toFixed(2)}</span></div>
            <div class="row"><span>Paid Amount:</span><span>₹${Number(order.paid_amount || 0).toFixed(2)}</span></div>
            <div class="row" style="font-weight:bold; font-size:14px; margin-top:4px;">
              <span>Balance Due:</span><span>₹${Number(order.remaining_amount || 0).toFixed(2)}</span>
            </div>
          </div>
          <script>window.onload = () => { window.print(); window.close(); };</script>
        </body>
      </html>
    `);
    printWin.document.close();
  };

  // স্ট্যাটাস অনুযায়ী অর্ডারের সংখ্যা গণনা
  const counts = useMemo(() => {
    const map: Record<string, number> = {
      all: orders.length,
      current: 0,
      out_for_delivery: 0,
      delivered: 0,
      pending: 0,
      refund: 0,
      spam: 0,
    };
    orders.forEach((o) => {
      if (map[o.order_status] !== undefined) {
        map[o.order_status] += 1;
      }
    });
    return map;
  }, [orders]);

  // ফিল্টারিং লজিক (৪টি মোড ও ৭টি স্ট্যাটাস)
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // ১. স্ট্যাটাস ফিল্টার
      if (statusFilter !== "all" && order.order_status !== statusFilter) {
        return false;
      }

      // ২. মোড ফিল্টার
      const isPickup = order.delivery_type === "pickup" || order.delivery_type === "self_pickup";
      const isAdvance = order.payment_type === "partial" || Number(order.remaining_amount || 0) > 0;

      if (modeFilter === "home_full" && (isPickup || isAdvance)) return false;
      if (modeFilter === "home_advance" && (isPickup || !isAdvance)) return false;
      if (modeFilter === "self_full" && (!isPickup || isAdvance)) return false;
      if (modeFilter === "self_advance" && (!isPickup || !isAdvance)) return false;

      return true;
    });
  }, [orders, statusFilter, modeFilter]);

  return (
    <div className="space-y-3">
      {/* ১. কম্প্যাক্ট ডেট বার ও মাস্টার পিকলিস্ট */}
      <div className="bg-white p-2.5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 shrink-0">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="text-xs font-bold px-2 py-1.5 border border-slate-300 rounded-xl bg-slate-50 outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            onClick={() => setSelectedDate(getLocalDateString())}
            className={`text-xs font-bold px-2.5 py-1.5 rounded-xl border transition ${
              selectedDate === getLocalDateString()
                ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
            }`}
          >
            Today
          </button>
          <button
            onClick={() => {
              const y = new Date();
              y.setDate(y.getDate() - 1);
              setSelectedDate(getLocalDateString(y));
            }}
            className={`text-xs font-bold px-2.5 py-1.5 rounded-xl border transition ${
              (() => {
                const y = new Date();
                y.setDate(y.getDate() - 1);
                return selectedDate === getLocalDateString(y);
              })()
                ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
            }`}
          >
            Yesterday
          </button>
        </div>

        <button
          onClick={() => setShowPicklist(true)}
          className="text-xs font-black px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-2xs transition flex items-center gap-1 shrink-0"
        >
          📋 Master Picklist ({counts.current || 0})
        </button>
      </div>

      {/* ২. ৪টি ডেলিভারি মোড বাটন (কোনো বাটন যাতে না কাটে তার জন্য হরিজন্টাল স্ক্রল) */}
      <div className="overflow-x-auto scrollbar-none py-0.5">
        <div className="flex items-center gap-1.5 min-w-max">
          <button
            onClick={() => setModeFilter("all")}
            className={`text-[11px] font-bold px-2.5 py-1.5 rounded-xl border shrink-0 transition ${
              modeFilter === "all"
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}
          >
            All Modes
          </button>
          <button
            onClick={() => setModeFilter("home_full")}
            className={`text-[11px] font-bold px-2.5 py-1.5 rounded-xl border shrink-0 transition ${
              modeFilter === "home_full"
                ? "bg-emerald-700 text-white border-emerald-700 shadow-xs"
                : "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
            }`}
          >
            🏠 Home Full
          </button>
          <button
            onClick={() => setModeFilter("home_advance")}
            className={`text-[11px] font-bold px-2.5 py-1.5 rounded-xl border shrink-0 transition ${
              modeFilter === "home_advance"
                ? "bg-amber-700 text-white border-amber-700 shadow-xs"
                : "bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100"
            }`}
          >
            🏠 Home Advance
          </button>
          <button
            onClick={() => setModeFilter("self_full")}
            className={`text-[11px] font-bold px-2.5 py-1.5 rounded-xl border shrink-0 transition ${
              modeFilter === "self_full"
                ? "bg-blue-700 text-white border-blue-700 shadow-xs"
                : "bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100"
            }`}
          >
            🏪 Self Full
          </button>
          <button
            onClick={() => setModeFilter("self_advance")}
            className={`text-[11px] font-bold px-2.5 py-1.5 rounded-xl border shrink-0 transition ${
              modeFilter === "self_advance"
                ? "bg-orange-700 text-white border-orange-700 shadow-xs"
                : "bg-orange-50 text-orange-900 border-orange-200 hover:bg-orange-100"
            }`}
          >
            🏪 Self Advance
          </button>
        </div>
      </div>

      {/* ৩. ৭টি অর্ডার স্ট্যাটাস ফিল্টার বাটন */}
      <div className="overflow-x-auto scrollbar-none py-0.5">
        <div className="flex items-center gap-1.5 min-w-max">
          {[
            { id: "all", label: "All Orders", count: counts.all },
            { id: "current", label: "Current Order", count: counts.current },
            { id: "out_for_delivery", label: "Out for Delivery", count: counts.out_for_delivery },
            { id: "delivered", label: "Delivered", count: counts.delivered },
            { id: "pending", label: "Pending Order", count: counts.pending },
            { id: "refund", label: "Refund", count: counts.refund },
            { id: "spam", label: "Spam", count: counts.spam },
          ].map((tab) => {
            const isActive = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`text-[11px] font-bold px-3 py-1.5 rounded-xl border shrink-0 transition flex items-center gap-1.5 ${
                  isActive
                    ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                    isActive
                      ? "bg-white text-slate-900"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ৪. অর্ডার কার্ড তালিকা */}
      {loading ? (
        <div className="text-center py-12 text-xs font-bold text-slate-400 bg-white rounded-2xl border border-slate-200">
          অর্ডার লোড হচ্ছে...
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="text-center py-12 text-xs font-bold text-slate-400 bg-white rounded-2xl border border-slate-200">
          এই ফিল্টারে কোনো অর্ডার পাওয়া যায়নি
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              isExpanded={!!expandedOrders[order.id]}
              onToggleExpand={() =>
                setExpandedOrders((prev) => ({
                  ...prev,
                  [order.id]: !prev[order.id],
                }))
              }
              actionLoading={actionLoading}
              imageLoading={false}
              onStatusChange={handleStatusChange}
              onApprovePayment={handleApprovePayment}
              onRejectClick={(ord) => setRejectingOrder(ord)}
              onViewScreenshot={(url) => setZoomedImage(url || null)}
              onRefundClick={(ord) => setRefundingOrder(ord)}
              onPrintSlip={handlePrintSlip}
            />
          ))}
        </div>
      )}

      {/* ৫. মোডালসমূহ */}
      <OrderModals
        orders={orders}
        selectedDate={selectedDate}
        showPicklist={showPicklist}
        onClosePicklist={() => setShowPicklist(false)}
        rejectingOrder={rejectingOrder}
        onCloseReject={() => setRejectingOrder(null)}
        actionLoading={actionLoading}
        setActionLoading={setActionLoading}
        zoomedImage={zoomedImage}
        onCloseZoom={() => setZoomedImage(null)}
        onSuccess={fetchOrders}
      />

            {refundingOrder && (
        <RefundModal
          order={refundingOrder}
          onClose={() => {
            setRefundingOrder(null);
            fetchOrders();
          }}
        />
      )}
    </div>
  );
}


