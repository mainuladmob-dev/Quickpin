"use client";

import { useEffect, useState, useMemo } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import OrderDetailModal from "./OrderDetailModal";
import RefundModal from "./RefundModal";
import OrdersTable from "./OrdersTable";
import { generateLabelPDF } from "@/lib/label-generator";

type Order = any;

const STATUSES = [
  { value: "current", label: "Current Orders" },
  { value: "pending", label: "Pending" },
  { value: "out_for_delivery", label: "Out for Delivery" },
  { value: "delivered", label: "Delivered" },
  { value: "refund", label: "Refund" },
  { value: "spam", label: "Spam" },
];

const ORDER_TYPES = [
  { value: "all", label: "All Types", filter: null },
  {
    value: "full_home",
    label: "Full + Home",
    filter: { delivery_type: "home_delivery", payment_type: "full" },
  },
  {
    value: "partial_home",
    label: "Advance + Home",
    filter: { delivery_type: "home_delivery", payment_type: "partial" },
  },
  {
    value: "full_pickup",
    label: "Full + Pickup",
    filter: { delivery_type: "self_pickup", payment_type: "full" },
  },
  {
    value: "partial_pickup",
    label: "Advance + Pickup",
    filter: { delivery_type: "self_pickup", payment_type: "partial" },
  },
];

// Helper: Get Today's Date in YYYY-MM-DD format (Timezone Safe)
function getTodayDateString(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().split("T")[0];
}

// Helper: Get Yesterday's Date in YYYY-MM-DD format
function getYesterdayDateString(): string {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().split("T")[0];
}

// Helper: 100% English Item Name Resolver
function resolveItemName(item: any): string {
  const p = item?.products || item?.product || {};
  return (
    p.name_en ||
    item.name_en ||
    p.name ||
    item.name ||
    item.product_name ||
    p.title ||
    item.title ||
    p.name_bn ||
    item.name_bn ||
    "Product Item"
  );
}

// Helper: Format order items for PDF Engine
function formatOrdersForPrint(orderList: Order[]): Order[] {
  return orderList.map((o) => {
    const rawItems = Array.isArray(o.order_items)
      ? o.order_items
      : Array.isArray(o.items)
      ? o.items
      : [];

    const mappedItems = rawItems.map((it: any) => {
      const englishName = resolveItemName(it);
      return {
        ...it,
        name: englishName,
        product_name: englishName,
        title: englishName,
      };
    });

    return {
      ...o,
      order_items: mappedItems,
      items: mappedItems,
    };
  });
}

export default function AdminOrdersPage() {
  const supabase = createClient();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const queryDate = searchParams.get("date");
  const initialStatus = searchParams.get("status") || "all";

  const [selectedDate, setSelectedDate] = useState<string>(
    queryDate || getTodayDateString()
  );
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(initialStatus);
  const [activeOrderType, setActiveOrderType] = useState("all");
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState("");
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);
  const [refundOrder, setRefundOrder] = useState<Order | null>(null);
  const [savingRefund, setSavingRefund] = useState(false);
  const [generatingLabel, setGeneratingLabel] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [printedOrderIds, setPrintedOrderIds] = useState<string[]>([]);

  // Update URL Query params when date changes
  const handleDateChange = (newDate: string) => {
    setSelectedDate(newDate);
    const params = new URLSearchParams(searchParams.toString());
    if (newDate) {
      params.set("date", newDate);
    } else {
      params.delete("date");
    }
    router.replace(`${pathname}?${params.toString()}`);
  };

  // 1. Fetch Orders strictly mapped to calendar date
  const fetchOrders = async () => {
    setLoading(true);
    let query = supabase
      .from("orders")
      .select("*, order_items(*, products(*)), addresses(*)")
      .order("created_at", { ascending: false });

    if (activeTab !== "all") query = query.eq("order_status", activeTab);

    const orderType = ORDER_TYPES.find((t) => t.value === activeOrderType);
    if (orderType?.filter) {
      query = query
        .eq("delivery_type", orderType.filter.delivery_type)
        .eq("payment_type", orderType.filter.payment_type);
    }

    if (selectedDate) {
      const start = new Date(`${selectedDate}T00:00:00.000Z`);
      const end = new Date(`${selectedDate}T23:59:59.999Z`);
      query = query
        .gte("created_at", start.toISOString())
        .lte("created_at", end.toISOString());
    }

    const { data, error } = await query;
    let orderList = (data as any) || [];

    if (error) {
      let fallbackQuery = supabase
        .from("orders")
        .select("*, order_items(*)")
        .order("created_at", { ascending: false });

      if (activeTab !== "all") fallbackQuery = fallbackQuery.eq("order_status", activeTab);
      if (orderType?.filter) {
        fallbackQuery = fallbackQuery
          .eq("delivery_type", orderType.filter.delivery_type)
          .eq("payment_type", orderType.filter.payment_type);
      }
      if (selectedDate) {
        fallbackQuery = fallbackQuery
          .gte("created_at", `${selectedDate}T00:00:00.000Z`)
          .lte("created_at", `${selectedDate}T23:59:59.999Z`);
      }
      const { data: fallbackData } = await fallbackQuery;
      orderList = fallbackData || [];
    }

    const userIds = [
      ...new Set(orderList.map((o: any) => o.user_id).filter(Boolean)),
    ];
    let profileMap: Record<string, any> = {};

    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name, email, phone")
        .in("id", userIds);

      (profiles || []).forEach((p: any) => {
        profileMap[p.id] = p;
      });
    }

    const enriched = orderList.map((o: any) => ({
      ...o,
      profiles: o.user_id ? profileMap[o.user_id] || null : null,
    }));

    setOrders(enriched);
    setSelected([]);
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();
  }, [activeTab, activeOrderType, selectedDate]);

  // 2. Financial Metrics (00 on empty days)
  const financialStats = useMemo(() => {
    let grossDelivered = 0;
    let totalRefunded = 0;
    let deliveredCount = 0;

    orders.forEach((o) => {
      const orderTotal = Number(o.total_amount || 0);
      const refundVal = Number(o.refund_amount || 0);

      if (o.order_status === "delivered") {
        grossDelivered += orderTotal;
        deliveredCount += 1;
      }
      if (refundVal > 0 || o.order_status === "refund") {
        totalRefunded += refundVal > 0 ? refundVal : orderTotal;
      }
    });

    const netSales = Math.max(0, grossDelivered - totalRefunded);

    return {
      totalOrders: orders.length,
      deliveredCount,
      grossDelivered,
      totalRefunded,
      netSales,
    };
  }, [orders]);

  // 3. Master Item Picklist (Consolidated strictly from Current Orders)
  const itemSummary = useMemo(() => {
    const currentOrders = orders.filter((o) => o.order_status === "current");
    const summaryMap: Record<
      string,
      {
        name: string;
        totalQty: number;
        totalWeight: number;
        orderCount: number;
        unitPrice: number;
      }
    > = {};

    currentOrders.forEach((o) => {
      const items = Array.isArray(o.order_items)
        ? o.order_items
        : Array.isArray(o.items)
        ? o.items
        : [];

      items.forEach((item: any) => {
        const name = resolveItemName(item);
        const qty = Number(item.quantity || item.qty || item.count || 1);
        const price = Number(item.price || item.unit_price || 0);

        const p = item?.products || item?.product || {};
        const unitWeight = Number(p.weight || item.weight || 0);

        if (!summaryMap[name]) {
          summaryMap[name] = {
            name,
            totalQty: 0,
            totalWeight: 0,
            orderCount: 0,
            unitPrice: price,
          };
        }
        summaryMap[name].totalQty += qty;
        summaryMap[name].totalWeight += qty * unitWeight;
        summaryMap[name].orderCount += 1;
      });
    });

    return Object.values(summaryMap);
  }, [orders]);

  // 4. Strict State Transition Logic
  const changeStatus = async (
    orderId: string,
    newStatus: string,
    extra?: any
  ) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return false;

    // RULE 1: Pending order can ONLY transition to "current" or "spam"
    if (order.order_status === "pending" && !["current", "spam"].includes(newStatus)) {
      alert("Validation Error: Pending orders can only be moved to 'Current Orders' or 'Spam'.");
      return false;
    }

    // RULE 2: Refund is strictly blocked unless Delivered
    if (newStatus === "refund" && order.order_status !== "delivered") {
      alert("Validation Error: Refunds can only be initiated on 'Delivered' orders.");
      return false;
    }

    const updates: any = {
      order_status: newStatus,
      status_changed_at: new Date().toISOString(),
      ...extra,
    };

    if (newStatus === "current") {
      const paidAmount =
        order.payment_type === "partial"
          ? order.partial_payment_amount
          : order.total_amount;
      updates.payment_status = "success";
      updates.payment_verified_by = "admin";
      updates.payment_verified_at = new Date().toISOString();
      updates.screenshot_status = "approved";
      updates.paid_amount = paidAmount;
      updates.remaining_amount = order.total_amount - paidAmount;
    } else if (newStatus === "refund") {
      updates.payment_status = "refunded";
    } else if (newStatus === "spam") {
      updates.payment_status = "failed";
    }

    const { error } = await supabase
      .from("orders")
      .update(updates)
      .eq("id", orderId);

    if (error) {
      alert(error.message);
      return false;
    }
    return true;
  };

  const handleSingleStatus = async (order: Order, newStatus: string) => {
    if (newStatus === "refund") {
      if (order.order_status !== "delivered") {
        alert("Refund option is only available for 'Delivered' orders.");
        return;
      }
      setRefundOrder(order);
      return;
    }

    const ok = await changeStatus(order.id, newStatus);
    if (ok) fetchOrders();
  };

  const handleBulkStatus = async () => {
    if (!bulkStatus) return alert("Select a target status first.");
    if (selected.length === 0) return alert("Select at least one order.");
    if (bulkStatus === "refund") {
      return alert("Refunds cannot be applied in bulk. Process them individually on Delivered orders.");
    }

    const invalidPending = orders.filter(
      (o) =>
        selected.includes(o.id) &&
        o.order_status === "pending" &&
        !["current", "spam"].includes(bulkStatus)
    );

    if (invalidPending.length > 0) {
      return alert(
        `Blocked: ${invalidPending.length} order(s) are 'Pending'. Pending orders can only be moved to 'Current Orders' or 'Spam'.`
      );
    }

    if (!confirm(`Change ${selected.length} orders to "${bulkStatus}"?`)) return;

    for (const id of selected) await changeStatus(id, bulkStatus);
    setBulkStatus("");
    fetchOrders();
  };

  const handleDelete = async (order: Order) => {
    if (order.order_status !== "spam") {
      return alert("Only spam orders can be deleted permanently.");
    }
    if (!confirm(`Permanently delete spam order ${order.order_number}?`)) return;
    const { error } = await supabase.from("orders").delete().eq("id", order.id);
    if (error) return alert(error.message);
    fetchOrders();
  };

  const handleBulkDelete = async () => {
    const spamSelected = orders.filter(
      (o) => selected.includes(o.id) && o.order_status === "spam"
    );
    if (spamSelected.length === 0) return alert("Only spam orders can be deleted.");
    if (spamSelected.length !== selected.length) {
      return alert("Some selected orders are not marked as spam.");
    }
    if (!confirm(`Permanently delete ${spamSelected.length} spam orders?`)) return;

    for (const o of spamSelected) {
      await supabase.from("orders").delete().eq("id", o.id);
    }
    setSelected([]);
    fetchOrders();
  };

  const submitRefund = async (data: {
    reason: string;
    amount: number;
    method: string;
    note: string;
  }) => {
    if (!refundOrder) return;
    setSavingRefund(true);

    try {
      await supabase.from("refunds").insert({
        order_id: refundOrder.id,
        amount: data.amount,
        refund_method: data.method,
        reason: data.reason || "other",
        customer_upi: refundOrder.customer_upi || refundOrder.upi_id || null,
        refunded_at: new Date().toISOString(),
      });
    } catch (e) {
      console.warn("Audit table log skipped:", e);
    }

    const ok = await changeStatus(refundOrder.id, "refund", {
      refund_reason: data.reason,
      refund_amount: data.amount,
      refund_method: data.method,
      refund_note: data.note || null,
      refunded_at: new Date().toISOString(),
    });

    setSavingRefund(false);
    if (ok) {
      setRefundOrder(null);
      fetchOrders();
    }
  };
      const canPrintLabel = (order: Order) => Boolean(order);

  const handleSingleDownload = async (order: Order) => {
    if (!canPrintLabel(order)) return;
    setGeneratingLabel(true);
    try {
      const formatted = formatOrdersForPrint([order]);
      await generateLabelPDF(formatted, `label-${order.order_number}.pdf`);
      setPrintedOrderIds((prev) => [...new Set([...prev, order.id])]);
      try {
        await supabase.from("orders").update({ is_printed: true } as any).eq("id", order.id);
      } catch {}
    } catch (err: any) {
      alert("Label failed: " + err.message);
    }
    setGeneratingLabel(false);
  };

  const executeBulkPrint = async (isDownload: boolean) => {
    const validOrders = orders.filter(
      (o) => selected.includes(o.id) && canPrintLabel(o)
    );
    if (validOrders.length === 0) return alert("No printable orders selected.");

    const unprintedOrders = validOrders.filter(
      (o) => !printedOrderIds.includes(o.id) && !o.is_printed
    );

    let ordersToProcess = unprintedOrders;

    if (unprintedOrders.length === 0) {
      const forceReprint = confirm(
        "All selected orders were already printed once. Do you want to re-print them all?"
      );
      if (!forceReprint) return;
      ordersToProcess = validOrders;
    } else if (unprintedOrders.length < validOrders.length) {
      alert(
        `Notice: ${validOrders.length - unprintedOrders.length} order(s) were already printed previously. Printing ${unprintedOrders.length} new order(s).`
      );
    }

    setGeneratingLabel(true);
    try {
      const formatted = formatOrdersForPrint(ordersToProcess);
      const filename = `labels-bulk-${ordersToProcess.length}.pdf`;
      await generateLabelPDF(formatted, filename);

      const newlyPrintedIds = ordersToProcess.map((o) => o.id);
      setPrintedOrderIds((prev) => [...new Set([...prev, ...newlyPrintedIds])]);

      try {
        await supabase
          .from("orders")
          .update({ is_printed: true } as any)
          .in("id", newlyPrintedIds);
      } catch {}
    } catch (err: any) {
      alert((isDownload ? "Bulk download" : "Bulk print") + " failed: " + err.message);
    }
    setGeneratingLabel(false);
  };

  const handleBulkDownload = () => executeBulkPrint(true);
  const handleBulkPrint = () => executeBulkPrint(false);

  const toggleSelect = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selected.length === orders.length) setSelected([]);
    else setSelected(orders.map((o) => o.id));
  };

  const allSelectedSpam =
    selected.length > 0 &&
    orders
      .filter((o) => selected.includes(o.id))
      .every((o) => o.order_status === "spam");

  return (
    <div className="space-y-4">
      {/* 1. Universal Top Date Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
            📅 Operating Date:
          </span>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => handleDateChange(e.target.value)}
            className="text-xs font-semibold border border-slate-300 rounded-lg px-3 py-1.5 bg-slate-50 text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={() => handleDateChange(getTodayDateString())}
            className={`text-xs px-2.5 py-1.5 rounded-md font-medium transition ${
              selectedDate === getTodayDateString()
                ? "bg-blue-600 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            Today
          </button>
          <button
            onClick={() => handleDateChange(getYesterdayDateString())}
            className={`text-xs px-2.5 py-1.5 rounded-md font-medium transition ${
              selectedDate === getYesterdayDateString()
                ? "bg-blue-600 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            Yesterday
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSummaryModal(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-4 py-2 rounded-lg font-semibold flex items-center gap-2 shadow-xs transition"
          >
            📋 Master Picklist ({itemSummary.length} Items)
          </button>
        </div>
      </div>

      {/* 2. Financial KPI Cards (Strict Universal Template - Shows 00 if no data) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">
            Total Orders
          </p>
          <p className="text-xl font-bold text-slate-800 mt-1">
            {financialStats.totalOrders < 10 ? `0${financialStats.totalOrders}` : financialStats.totalOrders}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">Filtered Date</p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">
            Gross Delivered
          </p>
          <p className="text-xl font-bold text-blue-600 mt-1">
            ₹{financialStats.grossDelivered.toFixed(2)}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            {financialStats.deliveredCount} Order(s) Delivered
          </p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">
            Total Refunded
          </p>
          <p className="text-xl font-bold text-rose-600 mt-1">
            - ₹{financialStats.totalRefunded.toFixed(2)}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">Deductions</p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/30 shadow-xs">
          <p className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wide">
            Actual Net Sales
          </p>
          <p className="text-xl font-black text-emerald-700 mt-1">
            ₹{financialStats.netSales.toFixed(2)}
          </p>
          <p className="text-[10px] text-emerald-600 mt-0.5">Earned Revenue</p>
        </div>
      </div>

      {/* 3. Filters: Order Type & Status Pipeline */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3 shadow-xs">
        <div>
          <p className="text-[11px] text-slate-500 font-semibold mb-1.5 uppercase tracking-wider">
            Order Delivery & Payment Type
          </p>
          <div className="flex flex-wrap gap-1.5">
            {ORDER_TYPES.map((t) => (
              <button
                key={t.value}
                onClick={() => setActiveOrderType(t.value)}
                className={`px-3 py-1.5 text-xs rounded-lg font-medium transition ${
                  activeOrderType === t.value
                    ? "bg-purple-600 text-white shadow-xs"
                    : "bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-[11px] text-slate-500 font-semibold mb-1.5 uppercase tracking-wider">
            Order Pipeline Status
          </p>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-3 py-1.5 text-xs rounded-lg font-medium transition ${
                activeTab === "all"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100"
              }`}
            >
              All Orders
            </button>
            {STATUSES.map((s) => (
              <button
                key={s.value}
                onClick={() => setActiveTab(s.value)}
                className={`px-3 py-1.5 text-xs rounded-lg font-medium transition ${
                  activeTab === s.value
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Bulk Action Controls */}
      {selected.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex flex-wrap items-center gap-3">
          <span className="text-xs font-bold text-blue-900">
            Selected: {selected.length}
          </span>
          <select
            value={bulkStatus}
            onChange={(e) => setBulkStatus(e.target.value)}
            className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg text-slate-900 bg-white"
          >
            <option value="">Move Status To...</option>
            <option value="current">Current Orders</option>
            <option value="out_for_delivery">Out for Delivery</option>
            <option value="delivered">Delivered</option>
            <option value="spam">Spam</option>
          </select>
          <button
            onClick={handleBulkStatus}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3.5 py-1.5 rounded-lg font-semibold"
          >
            Apply
          </button>
          <button
            onClick={handleBulkPrint}
            disabled={generatingLabel}
            className="bg-purple-600 hover:bg-purple-700 text-white text-xs px-3.5 py-1.5 rounded-lg font-semibold disabled:opacity-50"
          >
            🖨️ Print ({selected.length})
          </button>
          <button
            onClick={handleBulkDownload}
            disabled={generatingLabel}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-3.5 py-1.5 rounded-lg font-semibold disabled:opacity-50"
          >
            📥 Download ({selected.length})
          </button>
          {allSelectedSpam && (
            <button
              onClick={handleBulkDelete}
              className="bg-red-600 hover:bg-red-700 text-white text-xs px-3.5 py-1.5 rounded-lg font-semibold"
            >
              Delete Selected
            </button>
          )}
          <button
            onClick={() => setSelected([])}
            className="text-xs text-slate-600 hover:underline"
          >
            Clear Selection
          </button>
        </div>
      )}

      {/* 5. Orders Table View */}
      {loading ? (
        <div className="bg-white rounded-xl p-8 text-center text-slate-500 border border-slate-200">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-xs">Loading orders for {selectedDate}...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-xl p-10 text-center text-slate-500 border border-slate-200">
          <p className="text-base font-semibold text-slate-700">No orders found</p>
          <p className="text-xs text-slate-400 mt-1">
            There are 00 records for the selected date ({selectedDate}).
          </p>
        </div>
      ) : (
        <OrdersTable
          orders={orders}
          selected={selected}
          onToggleSelect={toggleSelect}
          onToggleSelectAll={toggleSelectAll}
          onStatusChange={handleSingleStatus}
          onDelete={handleDelete}
          onView={(o) => setViewingOrder(o)}
          onDownload={handleSingleDownload}
          canPrintLabel={canPrintLabel}
          generatingLabel={generatingLabel}
        />
      )}

      {/* 6. Master Item Picklist Modal */}
      {showSummaryModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base">📋 Master Item Picklist</h3>
                <p className="text-xs text-slate-500">
                  Target Date: <span className="font-semibold text-slate-800">{selectedDate}</span> (Current Orders Only)
                </p>
              </div>
              <button
                onClick={() => setShowSummaryModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto flex-1 pr-1 space-y-2">
              {itemSummary.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8">
                  No active "Current Orders" available for procurement on this date.
                </p>
              ) : (
                itemSummary.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center p-2.5 bg-slate-50 rounded-lg text-xs border border-slate-100">
                    <div>
                      <p className="font-bold text-slate-800 text-sm">{item.name}</p>
                      <p className="text-slate-500 text-[11px]">Requested in {item.orderCount} order(s)</p>
                    </div>
                    <div className="text-right">
                      <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-1 rounded-full">
                        Total: {item.totalQty} Units{item.totalWeight > 0 ? ` (${item.totalWeight.toFixed(2)} Kg)` : ""}
                      </span>      
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 mt-3 flex justify-end">
              <button
                onClick={() => setShowSummaryModal(false)}
                className="px-4 py-1.5 text-xs text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {viewingOrder && (
        <OrderDetailModal
          order={viewingOrder}
          onClose={() => setViewingOrder(null)}
        />
      )}

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
          
