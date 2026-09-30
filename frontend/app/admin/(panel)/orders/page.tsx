"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import OrderFilters, {
  type DateRange,
  type OrderStatusFilter,
  type OrderTypeFilter,
} from "./components/OrderFilters";
import OrderCard, { type OrderData } from "./components/OrderCard";
import PrintOptionsModal from "./components/PrintOptionsModal";
import PrintOptionsBulkModal from "./components/PrintOptionsBulkModal";
import CurrentWeightCard from "./components/CurrentWeightCard";
import RefundModal from "./components/RefundModal";
import StatusChangeModal, {
  type OrderStatus,
} from "./components/StatusChangeModal";

const PAGE_SIZE = 20;

interface StatusCounts {
  all: number;
  current: number;
  out_for_delivery: number;
  delivered: number;
  refund: number;
  pending: number;
  spam: number;
}

export default function OrdersPage() {
  const supabase = useMemo(() => createClient(), []);

  // Filters
  const [dateRange, setDateRange] = useState<DateRange>("today");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [orderStatus, setOrderStatus] = useState<OrderStatusFilter>("all");
  const [orderType, setOrderType] = useState<OrderTypeFilter>("all");

  // Search
  const [searchQuery, setSearchQuery] = useState("");

  // Data
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Counts
  const [counts, setCounts] = useState<StatusCounts>({
    all: 0,
    current: 0,
    out_for_delivery: 0,
    delivered: 0,
    refund: 0,
    pending: 0,
    spam: 0,
  });

  // Modals
  const [printOrder, setPrintOrder] = useState<OrderData | null>(null);
  const [bulkPrintOrders, setBulkPrintOrders] = useState<OrderData[] | null>(
    null
  );
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

  // ===== Fetch Status Counts =====
  const fetchCounts = useCallback(async () => {
    const range = getDateRange();

    let query = supabase
      .from("orders")
      .select("id, order_status, payment_status, refund_amount");

    if (range) {
      query = query
        .gte("created_at", range.start)
        .lte("created_at", range.end);
    }

    const { data, error } = await query;

    if (error || !data) {
      console.error("Counts fetch error:", error);
      return;
    }

    const all = data.filter(
      (o: any) => o.payment_status === "success"
    ).length;
    const current = data.filter(
      (o: any) =>
        o.payment_status === "success" && o.order_status === "current"
    ).length;
    const ofd = data.filter(
      (o: any) =>
        o.payment_status === "success" &&
        o.order_status === "out_for_delivery"
    ).length;
    const delivered = data.filter(
      (o: any) =>
        o.payment_status === "success" && o.order_status === "delivered"
    ).length;
    const refund = data.filter(
      (o: any) => (Number(o.refund_amount) || 0) > 0
    ).length;
    const pending = data.filter(
      (o: any) => o.payment_status === "pending"
    ).length;
    const spam = data.filter((o: any) => o.order_status === "spam").length;

    setCounts({
      all,
      current,
      out_for_delivery: ofd,
      delivered,
      refund,
      pending,
      spam,
    });
  }, [supabase, getDateRange]);

  const buildQuery = useCallback(() => {
    let query = supabase.from("orders").select(
      `
        id,
        order_number,
        user_id,
        customer_upi,
        payment_status,
        order_status,
        payment_type,
        delivery_type,
        delivery_charge,
        total_amount,
        paid_amount,
        remaining_amount,
        refund_amount,
        payment_screenshot_url,
        created_at,
        delivery_address_snapshot,
        order_items (
          id,
          qty,
          price,
          products ( name_en, weight, gst_percentage )
        )
      `
    );

    if (searchQuery.trim()) {
      query = query.eq("order_number", searchQuery.trim());
    } else {
      const range = getDateRange();
      if (range) {
        query = query
          .gte("created_at", range.start)
          .lte("created_at", range.end);
      }
    }

    if (orderStatus === "refund") {
      query = query.gt("refund_amount", 0);
    } else if (orderStatus !== "all") {
      query = query.eq("order_status", orderStatus);
    } else {
      query = query.eq("payment_status", "success");
    }

    if (orderType !== "all") {
      const [paymentPart, deliveryPart] = orderType.split("_");
      query = query.eq("payment_type", paymentPart);
      query = query.eq(
        "delivery_type",
        deliveryPart === "home" ? "home_delivery" : "self_pickup"
      );
    }

    return query;
  }, [supabase, searchQuery, getDateRange, orderStatus, orderType]);

  const transformOrder = (o: any): OrderData => {
    const addr = o.delivery_address_snapshot || null;
    const phoneFromAddr = addr?.phone || null;

    return {
      id: o.id,
      order_number: o.order_number || `#${o.id.slice(0, 8)}`,
      phone: phoneFromAddr,
      upi_id: o.customer_upi || null,
      payment_status: o.payment_status || "pending",
      order_status: o.order_status || "pending",
      total_amount: Number(o.total_amount) || 0,
      paid_amount: Number(o.paid_amount) || 0,
      remaining_amount: Number(o.remaining_amount) || 0,
      refund_amount: Number(o.refund_amount) || 0,
      delivery_charge: Number(o.delivery_charge) || 0,
      delivery_type: o.delivery_type || null,
      payment_type: o.payment_type || null,
      payment_screenshot_url: o.payment_screenshot_url || null,
      created_at: o.created_at,
      order_items: (o.order_items || []).map((item: any) => ({
        id: item.id,
        qty: item.qty,
        price: Number(item.price),
        products: item.products
          ? {
              name_en: item.products.name_en,
              weight: item.products.weight,
              gst_percentage: Number(item.products.gst_percentage) || 0,
            }
          : null,
      })),
      address: addr
        ? {
            full_name: addr.full_name || "",
            phone: addr.phone || "",
            address_line1: addr.address_line1 || "",
            address_line2: addr.address_line2 || "",
            city: addr.city || "",
            state: addr.state || "",
            pincode: addr.pincode || "",
          }
        : null,
    };
  };

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setPage(0);

    const { data, error } = await buildQuery()
      .order("created_at", { ascending: false })
      .range(0, PAGE_SIZE - 1);

    if (error) {
      console.error("Orders fetch error:", error);
      setLoading(false);
      return;
    }

    const transformed = (data || []).map(transformOrder);
    setOrders(transformed);
    setHasMore(transformed.length === PAGE_SIZE);
    setSelectedIds([]);
    setLoading(false);
  }, [buildQuery]);

  const fetchMoreOrders = async () => {
    if (loadingMore || !hasMore) return;

    setLoadingMore(true);
    const nextPage = page + 1;
    const from = nextPage * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data, error } = await buildQuery()
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      console.error("Load more error:", error);
      setLoadingMore(false);
      return;
    }

    const transformed = (data || []).map(transformOrder);
    setOrders((prev) => [...prev, ...transformed]);
    setHasMore(transformed.length === PAGE_SIZE);
    setPage(nextPage);
    setLoadingMore(false);
  };

  useEffect(() => {
    fetchOrders();
    fetchCounts();
  }, [fetchOrders, fetchCounts]);

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
    await fetchCounts();
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
    await fetchCounts();
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
    await fetchCounts();
  };

  // ✅ Bulk Print — Only Current Orders
  const handleBulkPrint = () => {
    const selectedOrders = orders.filter((o) =>
      selectedIds.includes(o.id)
    );

    if (selectedOrders.length === 0) {
      alert("কোনো order select করা হয়নি");
      return;
    }

    // Check: সব current?
    const nonCurrentOrders = selectedOrders.filter(
      (o) => o.order_status !== "current"
    );

    if (nonCurrentOrders.length > 0) {
      alert(
        `⚠️ Bulk Print শুধু Current Orders-এর জন্য।\n\n${nonCurrentOrders.length}টা order current নেই।\n\nশুধু current orders select করুন।`
      );
      return;
    }

    setBulkPrintOrders(selectedOrders);
  };

  const isSearchActive = searchQuery.trim().length > 0;

  return (
    <div className="space-y-4 pb-32">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
        <p className="text-sm text-gray-500 mt-1">Manage all your orders</p>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-xl p-2 shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 px-2">
          <span className="text-lg">🔍</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search exact Order ID..."
            className="flex-1 py-2 text-sm bg-transparent outline-none text-gray-800 placeholder-gray-400"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 text-xs"
            >
              ×
            </button>
          )}
        </div>
        {isSearchActive && (
          <p className="text-xs text-amber-600 px-4 pb-2">
            🔍 Searching exact Order ID — filters disabled
          </p>
        )}
      </div>

      {/* Filters */}
      {!isSearchActive && (
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
          counts={counts}
        />
      )}

      {/* Current Weight Card — শুধু Current Filter-এ */}
{!isSearchActive && orderStatus === "current" && (
  <CurrentWeightCard />
)}

{/* Select All Bar */}
{!loading && orders.length > 0 && !isSearchActive && (
  <div className="flex items-center justify-between bg-white rounded-xl px-4 py-2.5 border border-gray-100">
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={
          selectedIds.length === orders.length && orders.length > 0
        }
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
          <div className="text-6xl mb-4">
            {isSearchActive ? "🔍" : "📭"}
          </div>
          <h2 className="text-lg font-semibold text-gray-700 mb-1">
            {isSearchActive ? "No order found" : "No orders found"}
          </h2>
          <p className="text-sm text-gray-500">
            {isSearchActive
              ? `"${searchQuery}" এর সাথে কোনো order মেলেনি`
              : "এই filter-এ কোনো order নেই"}
          </p>
        </div>
      ) : (
        <>
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

          {/* Load More */}
          {hasMore && !isSearchActive && (
            <div className="flex justify-center pt-2">
              <button
                onClick={fetchMoreOrders}
                disabled={loadingMore}
                className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-semibold px-6 py-3 rounded-xl transition disabled:opacity-50 shadow-sm"
              >
                {loadingMore ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></span>
                    Loading...
                  </span>
                ) : (
                  "⬇️ Load More"
                )}
              </button>
            </div>
          )}

          {!hasMore && orders.length >= PAGE_SIZE && !isSearchActive && (
            <p className="text-center text-xs text-gray-400 pt-2">
              — All orders loaded —
            </p>
          )}
        </>
      )}

      {/* Bulk Actions Bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 md:left-64 z-40 bg-white border-t border-gray-200 shadow-2xl">
          <div className="px-4 py-3 flex items-center gap-2 overflow-x-auto">
            <span className="text-xs font-semibold text-gray-600 whitespace-nowrap">
              {selectedIds.length} selected:
            </span>

            <button
              onClick={handleBulkPrint}
              className="text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg whitespace-nowrap transition"
            >
              🖨️ Print
            </button>

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
        <PrintOptionsModal
          order={printOrder}
          onClose={() => setPrintOrder(null)}
        />
      )}

      {bulkPrintOrders && (
        <PrintOptionsBulkModal
          orders={bulkPrintOrders}
          onClose={() => setBulkPrintOrders(null)}
        />
      )}

      {refundOrder && (
        <RefundModal
          order={refundOrder}
          onClose={() => setRefundOrder(null)}
          onSuccess={() => {
            fetchOrders();
            fetchCounts();
          }}
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
