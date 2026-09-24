"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";

export type OrderItem = {
  id: string;
  product_name?: string;
  name?: string;
  quantity: number;
  unit_price?: number;
  price?: number;
  unit?: string;
  weight?: number;
};

export type Order = {
  id: string;
  order_number: string;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  payment_method: string | null;
  payment_status: string;
  payment_type: "full" | "partial";
  partial_payment_amount: number;
  upi_transaction_id?: string | null;
  payment_screenshot_url?: string | null;
  screenshot_status?: string;
  screenshot_attempts?: number;
  rejection_reason?: string | null;
  order_status: string;
  delivery_type?: string;
  delivery_address?: string | null;
  refund_amount?: number;
  created_at: string;
  user_id: string | null;
  profile?: {
    name?: string;
    phone?: string;
    email?: string;
    address?: string;
  } | null;
  items?: OrderItem[];
};

export default function AdminOrdersPage() {
  const supabase = createClient();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(
    () => new Date().toISOString().split("T")[0]
  );

  // ফিল্টার স্টেটসমূহ
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deliveryFilter, setDeliveryFilter] = useState<string>("all");

  // UI ও মোডাল স্টেট
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [showPicklistModal, setShowPicklistModal] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [rejectingOrder, setRejectingOrder] = useState<Order | null>(null);
  const [refundOrder, setRefundOrder] = useState<Order | null>(null);
  const [savingRefund, setSavingRefund] = useState(false);

  // ডাটাবেজ থেকে অর্ডার লোড
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("orders")
        .select("*, order_items(*)")
        .order("created_at", { ascending: false });

      if (selectedDate) {
        query = query
          .gte("created_at", `${selectedDate}T00:00:00.000Z`)
          .lte("created_at", `${selectedDate}T23:59:59.999Z`);
      }

      const { data: orderData, error: orderError } = await query;
      if (orderError) throw orderError;

      const rawList = (orderData as any[]) || [];
      const userIds = [...new Set(rawList.map((o) => o.user_id).filter(Boolean))];

      let profileMap: Record<string, any> = {};
      if (userIds.length > 0) {
        const { data: pData } = await supabase
          .from("profiles")
          .select("id, name, phone, email, address")
          .in("id", userIds);

        (pData || []).forEach((p: any) => {
          profileMap[p.id] = p;
        });
      }

      const formatted: Order[] = rawList.map((o) => ({
        ...o,
        profile: profileMap[o.user_id] || null,
        items: o.order_items || o.items || [],
      }));

      setOrders(formatted);
    } catch (err: any) {
      console.error("Orders fetch error:", err.message);
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
      alert("Status update failed: " + error.message);
      return;
    }
    fetchOrders();
  };

  // পেমেন্ট অনুমোদন
  const handleApprovePayment = async (order: Order) => {
    if (!confirm(`অর্ডার #${order.order_number}-এর পেমেন্ট কনফার্ম করতে চান?`)) return;
    setActionLoading(true);

    const total = Number(order.total_amount || 0);
    const partial = Number(order.partial_payment_amount || 0);
    const paidAmount = order.payment_type === "partial" ? partial : total;

    const { error } = await supabase
      .from("orders")
      .update({
        payment_status: "success",
        payment_verified_by: "admin",
        payment_verified_at: new Date().toISOString(),
        screenshot_status: "approved",
        order_status: "current",
        status_changed_at: new Date().toISOString(),
        rejection_reason: null,
        paid_amount: paidAmount,
        remaining_amount: Math.max(0, total - paidAmount),
      })
      .eq("id", order.id);

    setActionLoading(false);
    if (error) {
      alert("পেমেন্ট কনফার্ম করা যায়নি: " + error.message);
      return;
    }
    fetchOrders();
  };

  // স্ক্রিনশট দেখা
  const handleViewScreenshot = async (url?: string | null) => {
    if (!url) return;
    if (url.startsWith("http")) {
      setZoomedImage(url);
      return;
    }
    setImageLoading(true);
    try {
      const path = url.replace(/^payment-screenshots\//, "").replace(/^\/+/, "");
      const { data, error } = await supabase.storage
        .from("payment-screenshots")
        .createSignedUrl(path, 3600);
      if (error || !data) throw error;
      setZoomedImage(data.signedUrl);
    } catch (err: any) {
      alert("স্ক্রিনশট লোড করা যায়নি: " + (err?.message || "File not found"));
    } finally {
      setImageLoading(false);
    }
  };

  // রিফান্ড সেভ
  const submitRefund = async (refundData: any) => {
    setSavingRefund(true);
    try {
      const { error } = await supabase
        .from("orders")
        .update({
          order_status: "refund",
          refund_amount: refundData.amount,
          refund_reason: refundData.reason,
          status_changed_at: new Date().toISOString(),
        })
        .eq("id", refundOrder?.id);

      if (error) throw error;
      setRefundOrder(null);
      fetchOrders();
    } catch (err: any) {
      alert("রিফান্ড সেভ হয়নি: " + err.message);
    } finally {
      setSavingRefund(false);
    }
  };

  // ক্যাশ মেমো / স্লিপ প্রিন্ট
  const handlePrintSlip = (order: Order) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Order #${order.order_number}</title>
          <style>
            body { font-family: sans-serif; padding: 16px; font-size: 13px; color: #111; }
            .header { text-align: center; border-bottom: 1px dashed #999; padding-bottom: 8px; margin-bottom: 8px; }
            .row { display: flex; justify-content: space-between; margin-bottom: 4px; }
            .items { border-top: 1px dashed #999; border-bottom: 1px dashed #999; padding: 8px 0; margin: 8px 0; }
            .bold { font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2 style="margin: 0;">Quickpin Order Slip</h2>
            <p style="margin: 4px 0;">Order #${order.order_number}</p>
          </div>
          <div class="row"><span>গ্রাহক:</span><span class="bold">${order.profile?.name || "Customer"}</span></div>
          <div class="row"><span>ফোন:</span><span>${order.profile?.phone || "-"}</span></div>
          <div class="row"><span>ঠিকানা:</span><span>${order.delivery_address || order.profile?.address || "Store Pickup"}</span></div>
          <div class="row"><span>ডেলিভারি মোড:</span><span class="bold">${order.delivery_type === "pickup" ? "Self Pickup" : "Home Delivery"}</span></div>
          <div class="items">
            ${(order.items || []).map((i) => `
              <div class="row">
                <span>${i.product_name || i.name} (${i.quantity}${i.unit || "unit"})</span>
                <span>₹${Number((i.unit_price || i.price || 0) * i.quantity).toFixed(2)}</span>
              </div>
            `).join("")}
          </div>
          <div class="row bold"><span>মোট টাকা:</span><span>₹${Number(order.total_amount).toFixed(2)}</span></div>
          <div class="row"><span>পরিশোধিত:</span><span>₹${Number(order.paid_amount || 0).toFixed(2)}</span></div>
          <div class="row bold" style="color: #c00;"><span>বাকি টাকা:</span><span>₹${Number(order.remaining_amount || 0).toFixed(2)}</span></div>
          <script>window.onload = () => { window.print(); window.close(); };</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // আসল ক্যাশ ও সেলস হিসাব (KPIs)
  const kpis = useMemo(() => {
    const totalCount = orders.length;
    const deliveredOrders = orders.filter((o) => o.order_status === "delivered");
    const deliveredSales = deliveredOrders.reduce((acc, o) => acc + Number(o.paid_amount || o.total_amount || 0), 0);
    const totalRefund = orders
      .filter((o) => o.order_status === "refund" || Number(o.refund_amount || 0) > 0)
      .reduce((acc, o) => acc + Number(o.refund_amount || 0), 0);
    const netSales = Math.max(0, deliveredSales - totalRefund);

    return { totalCount, deliveredSales, totalRefund, netSales };
  }, [orders]);

  // ফিল্টার করা তালিকা (সকল স্ট্যাটাস ও আসল ৪টি মোড)
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      // ১. স্ট্যাটাস ফিল্টার
      let matchStatus = true;
      if (statusFilter === "current") matchStatus = o.order_status === "current";
      else if (statusFilter === "out_for_delivery") matchStatus = o.order_status === "out_for_delivery";
      else if (statusFilter === "delivered") matchStatus = o.order_status === "delivered";
      else if (statusFilter === "pending") matchStatus = o.payment_status === "pending" || o.order_status === "pending";
      else if (statusFilter === "refund") matchStatus = o.order_status === "refund" || Number(o.refund_amount || 0) > 0;
      else if (statusFilter === "spam") matchStatus = o.order_status === "spam";

      // ২. ডেলিভারি ও পেমেন্ট মোড ফিল্টার
      const isHome = !o.delivery_type || o.delivery_type === "home" || o.delivery_type === "home_delivery";
      const isPickup = o.delivery_type === "pickup" || o.delivery_type === "self_pickup";
      const isFull = o.payment_type === "full" || (!o.payment_type && Number(o.remaining_amount || 0) <= 0);
      const isAdvance = o.payment_type === "partial" || Number(o.remaining_amount || 0) > 0;

      let matchDelivery = true;
      if (deliveryFilter === "home_full") {
        matchDelivery = isHome && isFull;
      } else if (deliveryFilter === "home_advance") {
        matchDelivery = isHome && isAdvance;
      } else if (deliveryFilter === "self_full") {
        matchDelivery = isPickup && isFull;
      } else if (deliveryFilter === "self_advance") {
        matchDelivery = isPickup && isAdvance;
      }

      return matchStatus && matchDelivery;
    });
  }, [orders, statusFilter, deliveryFilter]);

  return (
    <div className="space-y-4 max-w-5xl mx-auto pb-12">
      {/* তারিখ বার ও পিকলিস্ট */}
      <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-xs space-y-2.5">
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <span className="text-xs font-bold text-slate-700 whitespace-nowrap">📅 Date:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-2 py-1 text-xs font-semibold border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 flex-1 min-w-0 max-w-[140px]"
            />
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setSelectedDate(new Date().toISOString().split("T")[0])}
              className="px-2.5 py-1 text-xs font-semibold bg-blue-50 text-blue-700 rounded-lg border border-blue-200 hover:bg-blue-100"
            >
              Today
            </button>
            <button
              onClick={() => {
                const d = new Date();
                d.setDate(d.getDate() - 1);
                setSelectedDate(d.toISOString().split("T")[0]);
              }}
              className="px-2.5 py-1 text-xs font-semibold bg-slate-100 text-slate-700 rounded-lg border border-slate-200 hover:bg-slate-200"
            >
              Yesterday
            </button>
          </div>
        </div>

        <button
          onClick={() => setShowPicklistModal(true)}
          className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition"
        >
          📋 Master Picklist
        </button>
      </div>

      {/* ৪টি কার্ড (KPIs) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-bold text-slate-500">Total Orders</p>
          <p className="text-lg font-black text-slate-900 mt-0.5">{kpis.totalCount}</p>
        </div>
        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-bold text-blue-600">Delivered</p>
          <p className="text-lg font-black text-blue-600 mt-0.5">₹{kpis.deliveredSales.toFixed(2)}</p>
        </div>
        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-bold text-rose-600">Total Refunds</p>
          <p className="text-lg font-black text-rose-600 mt-0.5">- ₹{kpis.totalRefund.toFixed(2)}</p>
        </div>
        <div className="bg-white p-3 rounded-2xl border border-emerald-200 bg-emerald-50/40 shadow-xs">
          <p className="text-[11px] font-bold text-emerald-800">Net Cash Sales</p>
          <p className="text-lg font-black text-emerald-700 mt-0.5">₹{kpis.netSales.toFixed(2)}</p>
        </div>
      </div>

      {/* ফিল্টার সেকশন (কাটা বন্ধ করতে min-w-max ও টাচ স্ক্রল) */}
      <div className="space-y-2">
        {/* ১. স্ট্যাটাস ফিল্টার বাটন */}
        <div className="w-full overflow-x-auto no-scrollbar py-0.5">
          <div className="flex items-center gap-1.5 min-w-max px-1">
            {[
              { id: "all", label: "All Orders" },
              { id: "current", label: "Current Order" },
              { id: "out_for_delivery", label: "Out for Delivery" },
              { id: "delivered", label: "Delivered" },
              { id: "pending", label: "Pending Order" },
              { id: "refund", label: "Refund" },
              { id: "spam", label: "Spam" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition shrink-0 ${
                  statusFilter === tab.id
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ২. ডেলিভারি ও পেমেন্ট মোড বাটন (আসল ৪টি মোড) */}
        <div className="w-full overflow-x-auto no-scrollbar py-0.5">
          <div className="flex items-center gap-1.5 min-w-max px-1">
            {[
              { id: "all", label: "All Modes" },
              { id: "home_full", label: "🏠 Home Full" },
              { id: "home_advance", label: "🏠 Home Advance" },
              { id: "self_full", label: "🏪 Self Full" },
              { id: "self_advance", label: "🏪 Self Advance" },
            ].map((d) => (
              <button
                key={d.id}
                onClick={() => setDeliveryFilter(d.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition shrink-0 ${
                  deliveryFilter === d.id
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* অর্ডার তালিকা */}
      {loading ? (
        <div className="bg-white rounded-2xl p-10 text-center text-slate-400 border border-slate-200 text-xs">
          Loading orders...
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center text-slate-400 border border-slate-200 text-xs">
          No orders found in this filter.
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              isExpanded={expandedOrderId === order.id}
              onToggleExpand={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)}
              actionLoading={actionLoading}
              imageLoading={imageLoading}
              onStatusChange={handleStatusChange}
              onApprovePayment={handleApprovePayment}
              onRejectClick={(ord) => setRejectingOrder(ord)}
              onViewScreenshot={handleViewScreenshot}
              onRefundClick={(ord) => setRefundOrder(ord)}
              onPrintSlip={handlePrintSlip}
            />
          ))}
        </div>
      )}

      {/* মোডালসমূহ */}
      <OrderModals
        orders={orders}
        selectedDate={selectedDate}
        showPicklist={showPicklistModal}
        onClosePicklist={() => setShowPicklistModal(false)}
        rejectingOrder={rejectingOrder}
        onCloseReject={() => setRejectingOrder(null)}
        actionLoading={actionLoading}
        setActionLoading={setActionLoading}
        zoomedImage={zoomedImage}
        onCloseZoom={() => setZoomedImage(null)}
        onSuccess={fetchOrders}
      />

      {/* রিফান্ড মোডাল */}
      {refundOrder && (
        <RefundModal
          order={refundOrder}
          onClose={() => setRefundOrder(null)}
          onSubmit={submitRefund}
          saving={savingRefund}
        />
      )}
    </div>
  );
  }
    
