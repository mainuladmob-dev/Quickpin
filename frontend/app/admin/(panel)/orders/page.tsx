"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import OrderDetailModal from "./OrderDetailModal";
import RefundModal from "./RefundModal";

type Order = {
  id: string;
  order_number: string;
  user_id: string | null;
  delivery_type: "self_pickup" | "home_delivery";
  payment_type: "full" | "partial";
  subtotal: number;
  delivery_charge: number;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  payment_method: string | null;
  payment_status: "pending" | "success" | "failed" | "refunded";
  order_status: string;
  refund_reason: string | null;
  refund_amount: number | null;
  refund_method: string | null;
  refund_note: string | null;
  created_at: string;
  profiles?: { name: string | null; email: string | null } | null;
};

const STATUSES = [
  { value: "pending", label: "Pending", color: "bg-yellow-100 text-yellow-700" },
  { value: "current", label: "Current", color: "bg-green-100 text-green-700" },
  { value: "out_for_delivery", label: "Out for Delivery", color: "bg-blue-100 text-blue-700" },
  { value: "delivered", label: "Delivered", color: "bg-emerald-100 text-emerald-700" },
  { value: "refund", label: "Refund", color: "bg-purple-100 text-purple-700" },
  { value: "spam", label: "Spam", color: "bg-red-100 text-red-700" },
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
    label: "Partial + Home",
    filter: { delivery_type: "home_delivery", payment_type: "partial" },
  },
  {
    value: "full_pickup",
    label: "Full + Pickup",
    filter: { delivery_type: "self_pickup", payment_type: "full" },
  },
  {
    value: "partial_pickup",
    label: "Partial + Pickup",
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

  const fetchOrders = async () => {
    setLoading(true);
    let query = supabase
      .from("orders")
      .select("*, profiles(name, email)")
      .order("created_at", { ascending: false });

    if (activeTab !== "all") query = query.eq("order_status", activeTab);

    const orderType = ORDER_TYPES.find((t) => t.value === activeOrderType);
    if (orderType?.filter) {
      query = query
        .eq("delivery_type", orderType.filter.delivery_type)
        .eq("payment_type", orderType.filter.payment_type);
    }

    const { data } = await query;
    setOrders((data as any) || []);
    setSelected([]);
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();
  }, [activeTab, activeOrderType]);

  const changeStatus = async (orderId: string, newStatus: string, extra?: any) => {
    const { error } = await supabase
      .from("orders")
      .update({
        order_status: newStatus,
        status_changed_at: new Date().toISOString(),
        ...extra,
      })
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

  const toggleSelect = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selected.length === orders.length) setSelected([]);
    else setSelected(orders.map((o) => o.id));
  };

  const getStatusStyle = (status: string) =>
    STATUSES.find((s) => s.value === status)?.color || "bg-gray-100 text-gray-700";

  const getStatusLabel = (status: string) =>
    STATUSES.find((s) => s.value === status)?.label || status;

  const allSelectedSpam =
    selected.length > 0 &&
    orders.filter((o) => selected.includes(o.id)).every((o) => o.order_status === "spam");

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
                  : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
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
                : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
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
                  : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
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
        <div className="bg-white rounded-xl overflow-hidden border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead className="bg-gray-50 text-gray-600 text-left">
              <tr>
                <th className="px-3 py-3 w-8">
                  <input
                    type="checkbox"
                    checked={selected.length === orders.length && orders.length > 0}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th className="px-3 py-3 font-medium">Order #</th>
                <th className="px-3 py-3 font-medium">Customer</th>
                <th className="px-3 py-3 font-medium">Total</th>
                <th className="px-3 py-3 font-medium">Paid</th>
                <th className="px-3 py-3 font-medium">Type</th>
                <th className="px-3 py-3 font-medium">Payment</th>
                <th className="px-3 py-3 font-medium">Status</th>
                <th className="px-3 py-3 font-medium">Change</th>
                <th className="px-3 py-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-3 py-3">
                    <input
                      type="checkbox"
                      checked={selected.includes(o.id)}
                      onChange={() => toggleSelect(o.id)}
                    />
                  </td>
                  <td className="px-3 py-3 font-medium text-gray-800">
                    <button
                      onClick={() => setViewingOrder(o)}
                      className="text-blue-600 hover:underline"
                    >
                      {o.order_number}
                    </button>
                  </td>
                  <td className="px-3 py-3 text-gray-700">
                    <div className="text-xs">{o.profiles?.name || "—"}</div>
                    <div className="text-xs text-gray-400">
                      {o.profiles?.email || ""}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-gray-800 font-medium">
                    ₹{o.total_amount}
                  </td>
                  <td className="px-3 py-3 text-gray-600">₹{o.paid_amount}</td>
                  <td className="px-3 py-3 text-gray-600 text-xs">
                    <div>
                      {o.delivery_type === "self_pickup" ? "🚶 Pickup" : "🏠 Home"}
                    </div>
                    <div className="text-gray-400">
                      {o.payment_type === "full" ? "Full" : "Partial"}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        o.payment_status === "success"
                          ? "bg-green-100 text-green-700"
                          : o.payment_status === "pending"
                          ? "bg-yellow-100 text-yellow-700"
                          : o.payment_status === "failed"
                          ? "bg-red-100 text-red-700"
                          : "bg-purple-100 text-purple-700"
                      }`}
                    >
                      {o.payment_status}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusStyle(
                        o.order_status
                      )}`}
                    >
                      {getStatusLabel(o.order_status)}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <select
                      value={o.order_status}
                      onChange={(e) => handleSingleStatus(o, e.target.value)}
                      className="text-xs border border-gray-300 rounded-lg px-2 py-1 text-gray-900"
                    >
                      {STATUSES.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-3 text-right">
                    {o.order_status === "spam" && (
                      <button
                        onClick={() => handleDelete(o)}
                        className="text-red-600 hover:underline text-xs"
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
