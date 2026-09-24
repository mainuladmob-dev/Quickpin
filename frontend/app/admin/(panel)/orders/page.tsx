// @ts-nocheck
"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import OrderCard from "./ordercard";
import OrderModals from "./ordermodals";

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Date Filters
  const todayStr = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Status & Delivery Mode Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deliveryFilter, setDeliveryFilter] = useState<string>("all");

  // Modal & Card State
  const [expandedOrderId, setExpandedOrderId] = useState<string | number | null>(null);
  const [showPicklist, setShowPicklist] = useState(false);
  const [rejectingOrder, setRejectingOrder] = useState<any | null>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  const supabase = createClient();

  // Date Shortcuts
  const handleToday = () => setSelectedDate(todayStr);
  const handleYesterday = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().split("T")[0]);
  };

  // Load Orders
  const loadOrders = async () => {
    setLoading(true);
    try {
      const startDate = `${selectedDate}T00:00:00.000Z`;
      const endDate = `${selectedDate}T23:59:59.999Z`;

      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          profile:profiles(name, phone)
        `)
        .gte("created_at", startDate)
        .lte("created_at", endDate)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (err: any) {
      console.error("Error loading orders:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [selectedDate]);

  // Metrics Calculation
  const metrics = useMemo(() => {
    let deliveredTotal = 0;
    let refunds = 0;
    let cashSales = 0;

    orders.forEach((o) => {
      const amount = Number(o.total_amount || 0);
      const refundAmt = Number(o.refund_amount || 0);

      if (o.order_status === "delivered") {
        deliveredTotal += amount;
        if (o.payment_type === "cash" || o.payment_type === "cod") {
          cashSales += amount;
        }
      }

      if (o.is_refund_paid || o.order_status === "refunded") {
        refunds += refundAmt > 0 ? refundAmt : amount;
      }
    });

    return {
      totalOrders: orders.length,
      deliveredTotal,
      refunds,
      cashSales,
    };
  }, [orders]);

  // 4 Delivery Modes + All Modes Filter Logic
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (statusFilter !== "all" && order.order_status !== statusFilter) {
        return false;
      }

      const isHome = order.delivery_type === "home";
      const isSelf =
        order.delivery_type === "pickup" ||
        order.delivery_type === "self_pickup" ||
        order.delivery_type === "self";

      const isFull =
        order.payment_status === "full" ||
        order.payment_status === "paid" ||
        order.payment_status === "success" ||
        order.payment_type === "full";

      const isAdvance =
        order.payment_status === "advance" ||
        order.payment_type === "advance";

      if (deliveryFilter === "home_full") return isHome && isFull;
      if (deliveryFilter === "home_advance") return isHome && isAdvance;
      if (deliveryFilter === "self_full") return isSelf && isFull;
      if (deliveryFilter === "self_advance") return isSelf && isAdvance;

      return true;
    });
  }, [orders, statusFilter, deliveryFilter]);

  // Status Change Handler
  const handleStatusChange = async (orderId: string | number, nextStatus: string) => {
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from("orders")
        .update({ order_status: nextStatus, status_changed_at: new Date().toISOString() })
        .eq("id", orderId);

      if (error) throw error;
      await loadOrders();
    } catch (err: any) {
      alert("Failed to update status: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Payment Approve Handler
  const handleApprovePayment = async (order: any) => {
    if (!confirm(`Approve payment for Order #${order.order_number || order.id}?`)) return;

    setActionLoading(true);
    try {
      const { error } = await supabase
        .from("orders")
        .update({
          payment_status: "paid",
          screenshot_status: "approved",
          order_status: "current",
        })
        .eq("id", order.id);

      if (error) throw error;
      alert("Payment approved successfully!");
      await loadOrders();
    } catch (err: any) {
      alert("Approval failed: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Print Slip Handler
  const handlePrintSlip = (order: any) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Order Receipt #${order.order_number || order.id}</title>
          <style>
            body { font-family: monospace; padding: 20px; font-size: 14px; }
            .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
            .row { display: flex; justify-content: space-between; margin-bottom: 5px; }
            .total { border-top: 1px dashed #000; margin-top: 10px; padding-top: 5px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>QUICKPIN</h2>
            <p>Receipt: #${order.order_number || order.id}</p>
            <p>Date: ${new Date(order.created_at).toLocaleDateString()}</p>
          </div>
          <div class="row"><span>Customer:</span><span>${order.profile?.name || "Customer"}</span></div>
          <div class="row"><span>Phone:</span><span>${order.profile?.phone || "N/A"}</span></div>
          <div class="row"><span>Delivery Mode:</span><span>${order.delivery_type || "N/A"}</span></div>
          <div class="row total"><span>Total Amount:</span><span>₹${order.total_amount}</span></div>
          <script>window.print(); window.close();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-4">
      {/* Date Picker & Master Picklist */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 border border-blue-500 rounded-lg px-2.5 py-1.5 bg-white text-xs font-medium">
            <span>📅 Date:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="outline-none bg-transparent cursor-pointer font-semibold text-slate-800"
            />
          </div>

          <button
            onClick={handleToday}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
              selectedDate === todayStr
                ? "bg-blue-600 text-white"
                : "bg-blue-50 text-blue-700 hover:bg-blue-100"
            }`}
          >
            Today
          </button>

          <button
            onClick={handleYesterday}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition cursor-pointer"
          >
            Yesterday
          </button>
        </div>

        <button
          onClick={() => setShowPicklist(true)}
          className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition shadow-xs cursor-pointer"
        >
          📋 Master Picklist
        </button>
      </div>

      {/* 4 Summary Metrics Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <p className="text-[11px] font-semibold text-slate-500">Total Orders</p>
          <p className="text-xl font-bold text-slate-900 mt-1">{metrics.totalOrders}</p>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <p className="text-[11px] font-semibold text-slate-500">Delivered</p>
          <p className="text-xl font-bold text-blue-600 mt-1">₹{metrics.deliveredTotal.toFixed(2)}</p>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <p className="text-[11px] font-semibold text-rose-500">Total Refunds</p>
          <p className="text-xl font-bold text-rose-600 mt-1">- ₹{metrics.refunds.toFixed(2)}</p>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <p className="text-[11px] font-semibold text-emerald-600">Net Cash Sales</p>
          <p className="text-xl font-bold text-emerald-700 mt-1">₹{metrics.cashSales.toFixed(2)}</p>
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
            className={`px-3 py-1.5 rounded-full whitespace-nowrap transition cursor-pointer ${
              statusFilter === tab.id
                ? "bg-slate-900 text-white font-semibold"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 4 Delivery Modes Filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs font-medium">
        {[
          { id: "all", label: "All Modes" },
          { id: "home_full", label: "🏠 Home Full" },
          { id: "home_advance", label: "🏠 Home Advance" },
          { id: "self_full", label: "🏪 Self Full" },
          { id: "self_advance", label: "🏪 Self Advance" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setDeliveryFilter(tab.id)}
            className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition cursor-pointer ${
              deliveryFilter === tab.id
                ? "bg-blue-600 text-white font-semibold shadow-2xs"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Order List / Empty State */}
      <div className="space-y-3">
        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-xs text-slate-400">
            Loading orders...
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-xs text-slate-400 font-medium">
            No orders found in this filter.
          </div>
        ) : (
          filteredOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              isExpanded={expandedOrderId === order.id}
              onToggleExpand={() =>
                setExpandedOrderId(expandedOrderId === order.id ? null : order.id)
              }
              actionLoading={actionLoading}
              onStatusChange={handleStatusChange}
              onApprovePayment={handleApprovePayment}
              onRejectClick={(ord: any) => setRejectingOrder(ord)}
              onViewScreenshot={(url: string | null) => setZoomedImage(url)}
              onPrintSlip={handlePrintSlip}
            />
          ))
        )}
      </div>

      {/* Modals */}
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
        onSuccess={loadOrders}
      />
    </div>
  );
}
