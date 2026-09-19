"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import OrderDetailModal from "./OrderDetailModal";
import RefundModal from "./RefundModal";
import OrdersTable from "./OrdersTable";
import { generateLabelPDF } from "@/lib/label-generator";

type Order = any;

const STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "current", label: "Current" },
  { value: "out_for_delivery", label: "Out for Delivery" },
  { value: "delivered", label: "Delivered" },
  { value: "refund", label: "Refund" },
  { value: "spam", label: "Spam" },
];

const ORDER_TYPES = [
  { value: "all", label: "সব Order", filter: null },
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

export default function AdminOrdersPage() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get("status") || "all";

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

  const fetchOrders = async () => {
    setLoading(true);
    let query = supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (activeTab !== "all") query = query.eq("order_status", activeTab);

    const orderType = ORDER_TYPES.find((t) => t.value === activeOrderType);
    if (orderType?.filter) {
      query = query
        .eq("delivery_type", orderType.filter.delivery_type)
        .eq("payment_type", orderType.filter.payment_type);
    }

    const { data } = await query;
    const orderList = (data as any) || [];

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
  }, [activeTab, activeOrderType]);

  const changeStatus = async (
    orderId: string,
    newStatus: string,
    extra?: any
  ) => {
    const order = orders.find((o) => o.id === orderId);

    const updates: any = {
      order_status: newStatus,
      status_changed_at: new Date().toISOString(),
      ...extra,
    };

    if (newStatus === "current" && order) {
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
      setRefundOrder(order);
      return;
    }
    const ok = await changeStatus(order.id, newStatus);
    if (ok) fetchOrders();
  };

  const handleBulkStatus = async () => {
    if (!bulkStatus) return alert("Select a status first");
    if (selected.length === 0) return alert("Select at least one order");
    if (bulkStatus === "refund")
      return alert("Refund must be done one order at a time.");
    if (!confirm(`Change ${selected.length} orders to "${bulkStatus}"?`)) return;

    for (const id of selected) await changeStatus(id, bulkStatus);
    setBulkStatus("");
    fetchOrders();
  };

  const handleDelete = async (order: Order) => {
    if (order.order_status !== "spam")
      return alert("Only spam orders can be deleted.");
    if (!confirm(`Permanently delete order ${order.order_number}?`)) return;
    const { error } = await supabase.from("orders").delete().eq("id", order.id);
    if (error) return alert(error.message);
    fetchOrders();
  };

  const handleBulkDelete = async () => {
    const spamSelected = orders.filter(
      (o) => selected.includes(o.id) && o.order_status === "spam"
    );
    if (spamSelected.length === 0) return alert("Only spam can be deleted.");
    if (spamSelected.length !== selected.length)
      return alert("Some selected orders are not spam.");
    if (!confirm(`Delete ${spamSelected.length} spam orders?`)) return;

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

  // ✅ UPDATED: home_delivery + self_pickup both supported
  const canPrintLabel = (order: Order) =>
    (order.order_status === "current" ||
      order.order_status === "out_for_delivery" ||
      order.order_status === "refund") &&
    (order.delivery_type === "home_delivery" ||
      order.delivery_type === "self_pickup");

  const handleSingleDownload = async (order: Order) => {
    if (!canPrintLabel(order)) return;
    setGeneratingLabel(true);
    try {
      await generateLabelPDF([order], `label-${order.order_number}.pdf`);
    } catch (err: any) {
      alert("Label failed: " + err.message);
    }
    setGeneratingLabel(false);
  };

  const handleBulkDownload = async () => {
    const validOrders = orders.filter(
      (o) => selected.includes(o.id) && canPrintLabel(o)
    );
    if (validOrders.length === 0) return alert("No printable orders selected");
    setGeneratingLabel(true);
    try {
      await generateLabelPDF(
        validOrders,
        `labels-bulk-${validOrders.length}.pdf`
      );
    } catch (err: any) {
      alert("Bulk label failed: " + err.message);
    }
    setGeneratingLabel(false);
  };

  // ✅ SIMPLIFIED: Uses generateLabelPDF (supports self_pickup + home_delivery)
  const handleBulkPrint = async () => {
    const validOrders = orders.filter(
      (o) => selected.includes(o.id) && canPrintLabel(o)
    );
    if (validOrders.length === 0) return alert("No printable orders selected");

    setGeneratingLabel(true);
    try {
      await generateLabelPDF(
        validOrders,
        `labels-bulk-${validOrders.length}.pdf`
      );
    } catch (err: any) {
      alert("Bulk print failed: " + err.message);
    }
    setGeneratingLabel(false);
  };

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
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-4">Orders</h1>

      <div className="mb-4">
        <p className="text-xs text-gray-500 font-medium mb-2">ORDER TYPE</p>
        <div className="flex flex-wrap gap-2">
          {ORDER_TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => setActiveOrderType(t.value)}
              className={`px-3 py-1.5 text-xs rounded-lg font-medium ${
                activeOrderType === t.value
                  ? "bg-purple-600 text-white"
                  : "bg-white text-gray-700 border border-gray-200"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <p className="text-xs text-gray-500 font-medium mb-2">ORDER STATUS</p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTab("all")}
            className={`px-3 py-1.5 text-sm rounded-lg font-medium ${
              activeTab === "all"
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-700 border border-gray-200"
            }`}
          >
            All
          </button>
          {STATUSES.map((s) => (
            <button
              key={s.value}
              onClick={() => setActiveTab(s.value)}
              className={`px-3 py-1.5 text-sm rounded-lg font-medium ${
                activeTab === s.value
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-700 border border-gray-200"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {selected.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4 flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-blue-800">
            Selected: {selected.length}
          </span>
          <select
            value={bulkStatus}
            onChange={(e) => setBulkStatus(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-900"
          >
            <option value="">Move to...</option>
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <button
            onClick={handleBulkStatus}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-1.5 rounded-lg font-medium"
          >
            Apply
          </button>
          <button
            onClick={handleBulkPrint}
            disabled={generatingLabel}
            className="bg-purple-600 hover:bg-purple-700 text-white text-sm px-3 py-1.5 rounded-lg font-medium disabled:opacity-50"
          >
            🖨️ Print ({selected.length})
          </button>
          <button
            onClick={handleBulkDownload}
            disabled={generatingLabel}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-3 py-1.5 rounded-lg font-medium disabled:opacity-50"
          >
            📥 Download ({selected.length})
          </button>
          {allSelectedSpam && (
            <button
              onClick={handleBulkDelete}
              className="bg-red-600 hover:bg-red-700 text-white text-sm px-3 py-1.5 rounded-lg font-medium"
            >
              Delete Selected
            </button>
          )}
          <button
            onClick={() => setSelected([])}
            className="text-sm text-gray-600 hover:underline"
          >
            Clear
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center text-gray-500">
          No orders found for this filter.
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
