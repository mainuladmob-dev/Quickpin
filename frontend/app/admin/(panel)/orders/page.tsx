"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import OrderFilters, {
  type DateRange,
  type OrderStatusFilter,
  type OrderTypeFilter,
} from "./components/OrderFilters";
import OrderCard, { type OrderData } from "./components/OrderCard";
import PrintLabel from "./components/PrintLabel";
import RefundModal from "./components/RefundModal";
import StatusChangeModal, {
  type OrderStatus,
} from "./components/StatusChangeModal";

export default function OrdersPage() {
  const supabase = useMemo(() => createClient(), []);

  // Filters
  const [dateRange, setDateRange] = useState<DateRange>("today");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [orderStatus, setOrderStatus] = useState<OrderStatusFilter>("all");
  const [orderType, setOrderType] = useState<OrderTypeFilter>("all");

  // Data
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modals
  const [printOrder, setPrintOrder] = useState<OrderData | null>(null);
  const [refundOrder, setRefundOrder] = useState<OrderData | null>(null);
  const [statusChangeIds, setStatusChangeIds] = useState<string[] | null>(null);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);

  const getDateRange = useCallback(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (dateRange === "today") {
      const end = new Date(today);
      end.setHours(23, 59, 59, 999);
      return { start: today.toISOString(), end: end.toISOString() };
    }

    if (dateRange === "yesterday") {
      const start = new Date(today);
      start.setDate(start.getDate() - 1);
      const end = new Date(start);
      end.setHours(23, 59, 59, 999);
      return { start: start.toISOString(), end: end.toISOString() };
    }

    if (dateRange === "custom" && customStart && customEnd) {
      const start = new Date(customStart);
      start.setHours(0, 0, 0, 0);
      const end = new Date(customEnd);
      end.setHours(23, 59, 59, 999);
      return { start: start.toISOString(), end: end.toISOString() };
    }

    return null;
  }, [dateRange, customStart, customEnd]);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const range = getDateRange();

    if (!range) {
      setLoading(false);
      return;
    }

    let query = supabase
      .from("orders")
      .select(
        `
        id,
        order_number,
        user_id,
        phone,
        upi_id,
        payment_status,
        order_status,
        total_amount,
        paid_amount,
        remaining_amount,
        refund_amount,
        delivery_type,
        payment_screenshot_url,
        created_at,
        delivery_address_snapshot,
        order_items (
          id,
          qty,
          price,
          products ( name_en )
        )
      `
      )
      .gte("created_at", range.start)
      .lte("created_at", range.end)
      .order("created_at", { ascending: false });

    // Status filter
    if (orderStatus !== "all") {
      query = query.eq("order_status", orderStatus);
    }

    // Order type filter
    if (orderType !== "all") {
      query = query.eq("delivery_type", orderType);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Orders fetch error:", error);
      setLoading(false);
      return;
    }

    // Transform data
    const transformed: OrderData[] = (data || []).map((o: any) => {
      const addr = o.delivery_address_snapshot || null;
      return {
        id: o.id,
        order_number: o.order_number || `#${o.id.slice(0, 8)}`,
        phone: o.phone || addr?.phone || null,
        upi_id: o.upi_id || null,
        payment_status: o.payment_status || "pending",
        order_status: o.order_status || "pending",
        total_amount: Number(o.total_amount) || 0,
        paid_amount: Number(o.paid_amount) || 0,
        remaining_amount: Number(o.remaining_amount) || 0,
        refund_amount: Number(o.refund_amount) || 0,
        delivery_type: o.delivery_type || null,
        payment_screenshot_url: o.payment_screenshot_url || null,
        created_at: o.created_at,
        order_items: (o.order_items || []).map((item: any) => ({
          id: item.id,
          qty: item.qty,
          price: Number(item.price),
          products: item.products
            ? { name_en: item.products.name_en }
            : null,
        })),
        address: addr
          ? {
              full_name: addr.full_name || "",
              phone: addr.phone || "",
              address_line1: addr.address_line1 || "",
              city: addr.city || "",
              state: addr.state || "",
              pincode: addr.pincode || "",
            }
          : null,
      };
    });

    setOrders(transformed);
    setSelectedIds([]);
    setLoading(false);
  }, [supabase, getDateRange, orderStatus, orderType]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === orders.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(orders.map((o) => o.id));
    }
  };

  const handleStatusChange = async (newStatus: OrderStatus) => {
    if (!statusChangeIds || statusChangeIds.length === 0) return;

    const { error } = await supabase
      .from("orders")
      .update({
        order_status: newStatus,
        status_changed_at: new Date().toISOString(),
      })
      .in("id", statusChangeIds);

    if (error) throw error;

    setStatusChangeIds(null);
    await fetchOrders();
  };

  const handleDelete = async (order: OrderData) => {
    if (
      !confirm(
        `⚠️ Order ${order.order_number} permanently delete হবে।\n\nCustomer data safe থাকবে।\n\nএটা undo করা যাবে না। চালিয়ে যাবেন?`
      )
    ) {
      return;
    }

    const { error } = await supabase
      .from("orders")
      .delete()
      .eq("id", order.id);

    if (error) {
      alert("Delete failed: " + error.message);
      return;
    }

    await fetchOrders();
  };

  const handleBulkDelete = async () => {
    const spamOrders = orders.filter(
      (o) => selectedIds.includes(o.id) && o.order_status === "spam"
    );

    if (spamOrders.length === 0) {
      alert("শুধু Spam status-এর order delete করা যাবে");
      return;
    }

    if (
      !confirm(
        `⚠️ ${spamOrders.length}টা spam order permanently delete হবে।\n\nচালিয়ে যাবেন?`
      )
    ) {
      return;
    }

    const ids = spamOrders.map((o) => o.id);
    const { error } = await supabase.from("orders").delete().in("id", ids);

    if (error) {
      alert("Delete failed: " + error.message);
      return;
    }

    await fetchOrders();
  };

  // Stats
  const stats = useMemo(() => {
    return {
      total: orders.length,
      pending: orders.filter((o) => o.order_status === "pending").length,
      current: orders.filter((o) => o.order_status === "current").length,
      ofd: orders.filter((o) => o.order_status === "out_for_delivery").length,
      delivered: orders.filter((o) => o.order_status === "delivered").length,
      refund: orders.filter((o) => o.order_status === "refund").length,
      spam: orders.filter((o) => o.order_status === "spam").length,
    };
  }, [orders]);

  return (
    <div className="space-y-4 pb-32">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage all your orders
        </p>
      </div>

      {/* Filters */}
      <OrderFilters
        dateRange={dateRange}
        setDateRange={setDateRange}
        customStart={customStart}
        setCustomStart={setCustomStart}
        customEnd={customEnd}
        setCustomEnd={setCustomEnd}
        orderStatus={orderStatus}
        setOrderStatus={setOrderStatus}
        orderType={orderType}
        setOrderType={setOrderType}
      />

      {/* Stats Summary */}
      {!loading && orders.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-gray-500 bg-white rounded-xl px-4 py-2 border border-gray-100 overflow-x-auto">
          <span className="whitespace-nowrap">
            Total: <strong className="text-gray-800">{stats.total}</strong>
          </span>
          <span className="text-gray-300">•</span>
          <span className="whitespace-nowrap">
            ⏳ Pending: <strong className="text-amber-600">{stats.pending}</strong>
          </span>
          <span className="text-gray-300">•</span>
          <span className="whitespace-nowrap">
            🔵 Current: <strong className="text-blue-600">{stats.current}</strong>
          </span>
          <span className="text-gray-300">•</span>
          <span className="whitespace-nowrap">
            🚚 OFD: <strong className="text-purple-600">{stats.ofd}</strong>
          </span>
          <span className="text-gray-300">•</span>
          <span className="whitespace-nowrap">
            ✅ Delivered: <strong className="text-green-600">{stats.delivered}</strong>
          </span>
          <span className="text-gray-300">•</span>
          <span className="whitespace-nowrap">
            ↩️ Refund: <strong className="text-yellow-600">{stats.refund}</strong>
          </span>
        </div>
      )}

      {/* Select All Bar */}
      {!loading && orders.length > 0 && (
        <div className="flex items-center justify-between bg-white rounded-xl px-4 py-2.5 border border-gray-100">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={selectedIds.length === orders.length && orders.length > 0}
              onChange={toggleSelectAll}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-xs font-medium text-gray-600">
              Select All ({orders.length})
            </span>
          </label>
          {selectedIds.length > 0 && (
            <span className="text-xs font-semibold text-blue-600">
              {selectedIds.length} selected
            </span>
          )}
        </div>
      )}

      {/* Orders List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <div className="text-6xl mb-4">📭</div>
          <h2 className="text-lg font-semibold text-gray-700 mb-1">
            No orders found
          </h2>
          <p className="text-sm text-gray-500">
            এই filter-এ কোনো order নেই
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              selected={selectedIds.includes(order.id)}
              onToggleSelect={toggleSelect}
              onChangeStatus={(o) => setStatusChangeIds([o.id])}
              onRefund={(o) => setRefundOrder(o)}
              onPrint={(o) => setPrintOrder(o)}
              onDelete={handleDelete}
              onViewScreenshot={(url) => setScreenshotUrl(url)}
            />
          ))}
        </div>
      )}

      {/* Bulk Actions Bar (fixed bottom) */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 md:left-64 z-40 bg-white border-t border-gray-200 shadow-2xl">
          <div className="px-4 py-3 flex items-center gap-2 overflow-x-auto">
            <span className="text-xs font-semibold text-gray-600 whitespace-nowrap">
              {selectedIds.length} selected:
            </span>
            <button
              onClick={() => setStatusChangeIds(selectedIds)}
              className="text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg whitespace-nowrap transition"
            >
              🔄 Change Status
            </button>
            <button
              onClick={handleBulkDelete}
              className="text-xs font-semibold bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg whitespace-nowrap transition"
            >
              🗑️ Delete (Spam only)
            </button>
            <button
              onClick={() => setSelectedIds([])}
              className="text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg whitespace-nowrap transition ml-auto"
            >
              ❌ Clear
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      {printOrder && (
        <PrintLabel
          order={printOrder}
          onClose={() => setPrintOrder(null)}
        />
      )}

      {refundOrder && (
        <RefundModal
          order={refundOrder}
          onClose={() => setRefundOrder(null)}
          onSuccess={fetchOrders}
        />
      )}

      {statusChangeIds && (
        <StatusChangeModal
          orderIds={statusChangeIds}
          currentStatus={
            statusChangeIds.length === 1
              ? (orders.find((o) => o.id === statusChangeIds[0])
                  ?.order_status as OrderStatus)
              : undefined
          }
          onClose={() => setStatusChangeIds(null)}
          onConfirm={handleStatusChange}
        />
      )}

      {/* Screenshot Viewer */}
      {screenshotUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setScreenshotUrl(null)}
        >
          <div
            className="max-w-2xl max-h-[90vh] bg-white rounded-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-900">
                📸 Payment Screenshot
              </h3>
              <button
                onClick={() => setScreenshotUrl(null)}
                className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500 text-xl"
              >
                ×
              </button>
            </div>
            <div className="p-4">
              <img
                src={screenshotUrl}
                alt="Payment screenshot"
                className="max-w-full max-h-[70vh] object-contain mx-auto rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
          }
