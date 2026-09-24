"use client";

import { useEffect, useState, useMemo, useCallback, Suspense } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import RefundModal from "./RefundModal";
import { generateLabelPDF } from "@/lib/label-generator";

type Order = any;

const STATUSES = [
  { value: "current", label: "Current Order" },
  { value: "out_for_delivery", label: "Out for Delivery" },
  { value: "delivered", label: "Delivered" },
  { value: "refund", label: "Refund" },
  { value: "pending", label: "Pending Order" },
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

function getTodayDateString(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().split("T")[0];
}

function getYesterdayDateString(): string {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().split("T")[0];
}

function resolveItemName(item: any): string {
  const p = item?.products || item?.product || {};
  return (
    p.name_bn ||
    p.name_en ||
    item.name_en ||
    p.name ||
    item.name ||
    item.product_name ||
    p.title ||
    item.title ||
    "পণ্য আইটেম"
  );
}

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

function OrdersContent() {
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
  const [refundOrder, setRefundOrder] = useState<Order | null>(null);
  const [savingRefund, setSavingRefund] = useState(false);
  const [generatingLabel, setGeneratingLabel] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [printedOrderIds, setPrintedOrderIds] = useState<string[]>([]);

  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedOrders((prev) => ({ ...prev, [id]: !prev[id] }));
  };

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

  const fetchOrders = useCallback(async () => {
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
      const start = `${selectedDate}T00:00:00.000Z`;
      const end = `${selectedDate}T23:59:59.999Z`;
      query = query.gte("created_at", start).lte("created_at", end);
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
        .select("id, name, email, phone, upi_id")
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
  }, [activeTab, activeOrderType, selectedDate, supabase]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const financialStats = useMemo(() => {
    let grossDelivered = 0;
    let totalRefunded = 0;
    let deliveredCount = 0;

    orders.forEach((o) => {
      const orderTotal = Number(o.total_amount || 0);
      const refundVal = Number(o.refund_amount || 0);

      if (o.order_status === "delivered" || o.order_status === "refund") {
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

  const changeStatus = async (
    orderId: string,
    newStatus: string,
    extra?: any
  ) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return false;

    if (newStatus === "spam") {
      if (order.order_status === "current" || order.order_status === "out_for_delivery") {
        alert("Action Blocked: কারেন্ট বা ডেলিভারিতে থাকা অর্ডার স্প্যাম করা যাবে না।");
        return false;
      }
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
      if (!updates.refund_status) {
        updates.refund_status = extra?.transaction_ref ? "success" : "pending";
      }
    } else if (newStatus === "spam") {
      updates.payment_status = "failed";
    }

    const { error } = await supabase
      .from("orders")
      .update(updates)
      .eq("id", orderId);

    if (error) {
      alert("Error: " + error.message);
      return false;
    }
    return true;
  };

  const handleSingleStatus = async (order: Order, newStatus: string) => {
    if (newStatus === "refund") {
      if (order.order_status !== "delivered") {
        alert("শুধু ডেলিভারি সম্পন্ন অর্ডারে রিফান্ড দেওয়া যাবে।");
        return;
      }
      setRefundOrder(order);
      return;
    }

    const ok = await changeStatus(order.id, newStatus);
    if (ok) fetchOrders();
  };

  const submitRefund = async (data: any) => {
    if (!refundOrder) return;
    setSavingRefund(true);

    try {
      await supabase.from("refunds").insert({
        order_id: refundOrder.id,
        product_name: data.product_name || "Granular Item Refund",
        amount: data.amount,
        refund_method: data.method.toLowerCase(),
        reason: data.reason || "rotten",
        customer_upi: data.customer_upi || refundOrder.customer_upi || null,
        transaction_ref: data.transaction_ref || null,
        refunded_at: new Date().toISOString(),
      });
    } catch (e) {
      console.warn("Refund log notice:", e);
    }

    const ok = await changeStatus(refundOrder.id, "refund", {
      refund_reason: data.reason,
      refund_amount: data.amount,
      refund_method: data.method,
      refund_note: data.note || null,
      transaction_ref: data.transaction_ref || null,
      customer_upi: data.customer_upi || refundOrder.customer_upi || null,
      refund_status: data.transaction_ref ? "success" : "pending",
      refunded_at: new Date().toISOString(),
    });

    setSavingRefund(false);
    if (ok) {
      setRefundOrder(null);
      fetchOrders();
    }
  };

  const handleSingleDownload = async (order: Order) => {
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
        return (
    <div className="space-y-4 p-2 md:p-4 max-w-6xl mx-auto">
      {/* ১. ডেট ও মাস্টার পিকলিস্ট বার */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-800">📅 তারিখ:</span>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => handleDateChange(e.target.value)}
            className="text-xs font-semibold border border-slate-300 rounded-lg px-2.5 py-1.5 bg-slate-50 text-slate-800 outline-none"
          />
          <button
            onClick={() => handleDateChange(getTodayDateString())}
            className={`text-xs px-2.5 py-1.5 rounded-lg font-semibold transition ${
              selectedDate === getTodayDateString()
                ? "bg-blue-600 text-white"
                : "bg-slate-100 text-slate-700"
            }`}
          >
            Today
          </button>
          <button
            onClick={() => handleDateChange(getYesterdayDateString())}
            className={`text-xs px-2.5 py-1.5 rounded-lg font-semibold transition ${
              selectedDate === getYesterdayDateString()
                ? "bg-blue-600 text-white"
                : "bg-slate-100 text-slate-700"
            }`}
          >
            Yesterday
          </button>
        </div>

        <button
          onClick={() => setShowSummaryModal(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5 shadow-xs transition"
        >
          📋 Master Picklist ({itemSummary.length} Items)
        </button>
      </div>

      {/* ২. রিয়েল-টাইম ৪টি সামারি কার্ড */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[10px] font-bold text-slate-500 uppercase">মোট অর্ডার</p>
          <p className="text-lg font-black text-slate-900 mt-0.5">{financialStats.totalOrders}</p>
        </div>
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[10px] font-bold text-slate-500 uppercase">ডেলিভারি সম্পন্ন</p>
          <p className="text-lg font-black text-blue-600 mt-0.5">₹{financialStats.grossDelivered.toFixed(2)}</p>
        </div>
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[10px] font-bold text-slate-500 uppercase">মোট রিফান্ড</p>
          <p className="text-lg font-black text-rose-600 mt-0.5">- ₹{financialStats.totalRefunded.toFixed(2)}</p>
        </div>
        <div className="bg-white p-3 rounded-xl border border-emerald-200 bg-emerald-50/40 shadow-xs">
          <p className="text-[10px] font-bold text-emerald-800 uppercase">আসল ক্যাশ সেলস</p>
          <p className="text-lg font-black text-emerald-700 mt-0.5">₹{financialStats.netSales.toFixed(2)}</p>
        </div>
      </div>

      {/* ৩. ফিল্টার ট্যাব */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 space-y-2 shadow-xs">
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setActiveTab("all")}
            className={`px-3 py-1.5 text-xs rounded-xl font-semibold transition ${
              activeTab === "all" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"
            }`}
          >
            All Orders
          </button>
          {STATUSES.map((s) => (
            <button
              key={s.value}
              onClick={() => setActiveTab(s.value)}
              className={`px-3 py-1.5 text-xs rounded-xl font-semibold transition ${
                activeTab === s.value ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* ৪. অর্ডার কার্ড লিস্ট (Accordion / Dropdown View) */}
      {loading ? (
        <div className="bg-white p-8 text-center text-xs text-slate-400 rounded-2xl border border-slate-200">
          অর্ডার লোড হচ্ছে...
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white p-8 text-center text-xs text-slate-400 rounded-2xl border border-slate-200">
          এই তারিখে কোনো অর্ডার পাওয়া যায়নি।
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const isExpanded = Boolean(expandedOrders[order.id]);
            const address = order.addresses || {};
            const customerName = order.profiles?.name || address.name || "গ্রাহক";
            const customerPhone = order.profiles?.phone || address.phone || "";
            const fullAddress = [
              address.address_line1,
              address.address_line2,
              address.city,
              address.pincode,
              order.delivery_address,
            ]
              .filter(Boolean)
              .join(", ");

            const items = Array.isArray(order.order_items)
              ? order.order_items
              : Array.isArray(order.items)
              ? order.items
              : [];

            const screenshotUrl =
              order.screenshot_url ||
              order.payment_screenshot ||
              order.payment_proof_url ||
              order.proof_url;

            const isPending = order.order_status === "pending";
            const isCurrent = order.order_status === "current";
            const isOutForDelivery = order.order_status === "out_for_delivery";
            const isDelivered = order.order_status === "delivered";

            return (
              <div
                key={order.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden transition"
              >
                {/* কার্ডের হেডার (ক্লিক করলে নিচে ড্রপডাউন খুলবে) */}
                <div
                  onClick={() => toggleExpand(order.id)}
                  className="p-3.5 flex flex-wrap items-center justify-between gap-2 cursor-pointer hover:bg-slate-50/80 transition"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-slate-400 font-bold text-sm">
                      {isExpanded ? "▲" : "▼"}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">
                          #{order.order_number || order.id.slice(0, 6)}
                        </span>
                        <span className="text-xs font-semibold text-slate-600">
                          • {customerName}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {new Date(order.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-slate-900">
                      ₹{Number(order.total_amount || 0).toFixed(2)}
                    </span>

                    {/* স্ট্যাটাস ব্যাজ */}
                    <span
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-full capitalize ${
                        isPending
                          ? "bg-amber-100 text-amber-800"
                          : isCurrent
                          ? "bg-blue-100 text-blue-800"
                          : isOutForDelivery
                          ? "bg-purple-100 text-purple-800"
                          : isDelivered
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {order.order_status}
                    </span>

                    {/* পেমেন্ট টাইপ */}
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md uppercase">
                      {order.payment_type || "COD"}
                    </span>
                  </div>
                </div>

                {/* ড্রপডাউন বডি (ক্লিক করলে উন্মোচিত হবে) */}
                {isExpanded && (
                  <div className="p-4 bg-slate-50/50 border-t border-slate-100 space-y-4">
                    {/* গ্রিড: ঠিকানা ও বাজারের ফর্দ */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* পার্ট ১: কাস্টমার ও ঠিকানা */}
                      <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-xs space-y-2">
                        <p className="font-bold text-slate-800 uppercase text-[10px] tracking-wider">
                          📍 কাস্টমার ও ডেলিভারি ঠিকানা
                        </p>
                        <p className="text-slate-900 font-semibold">{customerName}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-600">{customerPhone || "ফোন নম্বর নেই"}</span>
                          {customerPhone && (
                            <a
                              href={`tel:${customerPhone}`}
                              className="text-[10px] bg-blue-50 text-blue-600 font-bold px-2 py-0.5 rounded border border-blue-200 hover:bg-blue-100"
                            >
                              📞 কল করুন
                            </a>
                          )}
                        </div>
                        <p className="text-slate-600 leading-relaxed">
                          {fullAddress || "ঠিকানা দেওয়া হয়নি"}
                        </p>
                      </div>

                      {/* পার্ট ২: বাজারের ফর্দ */}
                      <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-xs space-y-2">
                        <p className="font-bold text-slate-800 uppercase text-[10px] tracking-wider">
                          🛍️ বাজারের আইটেম লিস্ট ({items.length})
                        </p>
                        <div className="divide-y divide-slate-100 max-h-40 overflow-y-auto">
                          {items.map((item: any, idx: number) => {
                            const itemName = resolveItemName(item);
                            const qty = item.quantity || item.qty || 1;
                            const price = Number(item.price || item.unit_price || 0);
                            return (
                              <div key={idx} className="py-1.5 flex justify-between items-center text-xs">
                                <div>
                                  <span className="font-semibold text-slate-800">{itemName}</span>
                                  <span className="text-slate-400 text-[11px] ml-1.5">
                                    × {qty}
                                  </span>
                                </div>
                                <span className="font-semibold text-slate-700">
                                  ₹{(qty * price).toFixed(2)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* পার্ট ৩: পেমেন্ট ভেরিফিকেশন ও স্ক্রিনশট প্রিভিউ */}
                    <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-xs space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="font-bold text-slate-800 uppercase text-[10px] tracking-wider">
                          💳 পেমেন্ট খতিয়ান ও কাস্টমার স্ক্রিনশট
                        </p>
                        <span className="text-[11px] font-bold text-slate-600">
                          পেমেন্ট স্ট্যাটাস:{" "}
                          <span
                            className={
                              order.payment_status === "success"
                                ? "text-emerald-600"
                                : "text-amber-600"
                            }
                          >
                            {order.payment_status || "Pending"}
                          </span>
                        </span>
                      </div>

                      {screenshotUrl ? (
                        <div className="flex flex-wrap items-center gap-4 bg-slate-50 p-3 rounded-xl border border-slate-200">
                          <img
                            src={screenshotUrl}
                            alt="Payment Proof"
                            onClick={() => setZoomedImage(screenshotUrl)}
                            className="w-20 h-20 object-cover rounded-lg border border-slate-300 cursor-pointer hover:opacity-80 transition"
                          />
                          <div className="space-y-1">
                            <p className="font-semibold text-slate-800">
                              📷 কাস্টমার পেমেন্ট স্ক্রিনশট পাঠিয়েছেন
                            </p>
                            <p className="text-[11px] text-slate-500">
                              ছবিতে ক্লিক করে বড় করে দেখে মিলিয়ে নিন।
                            </p>
                            {order.transaction_ref && (
                              <p className="text-xs text-blue-600 font-mono font-bold">
                                UTR / Ref: {order.transaction_ref}
                              </p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-400 italic">
                          কোনো পেমেন্ট স্ক্রিনশট আপলোড করা হয়নি (COD বা সরাসরি ক্যাশ অর্ডার)।
                        </p>
                      )}

                      {/* পার্ট ৪: অ্যাকশন বাটনসমূহ */}
                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                        {isPending && (
                          <button
                            onClick={() => handleSingleStatus(order, "current")}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-xs transition flex items-center gap-1.5"
                          >
                            ✓ Verify & Move to Current (পেমেন্ট সঠিক)
                          </button>
                        )}

                        {isCurrent && (
                          <button
                            onClick={() => handleSingleStatus(order, "out_for_delivery")}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-3.5 py-2 rounded-xl transition flex items-center gap-1.5"
                          >
                            🚚 ডেলিভারিতে পাঠান (Out for Delivery)
                          </button>
                        )}

                        {isOutForDelivery && (
                          <button
                            onClick={() => handleSingleStatus(order, "delivered")}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-3.5 py-2 rounded-xl transition flex items-center gap-1.5"
                          >
                            ✅ ডেলিভারি সম্পন্ন (Mark Delivered)
                          </button>
                        )}

                        {isDelivered && (
                          <button
                            onClick={() => handleSingleStatus(order, "refund")}
                            className="bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 font-semibold text-xs px-3 py-2 rounded-xl transition"
                          >
                            ↩️ রিফান্ড প্রসেস
                          </button>
                        )}

                        {isPending && (
                          <button
                            onClick={() => handleSingleStatus(order, "spam")}
                            className="bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 font-semibold text-xs px-3 py-2 rounded-xl transition"
                          >
                            ✕ ফেক / স্প্যাম
                          </button>
                        )}

                        <button
                          onClick={() => handleSingleDownload(order)}
                          disabled={generatingLabel}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs px-3 py-2 rounded-xl transition ml-auto"
                        >
                          🏷️ স্লিপ প্রিন্ট
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* মাস্টার পিকলিস্ট মোডাল */}
      {showSummaryModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base">📋 Master Item Picklist</h3>
                <p className="text-xs text-slate-500">কারেন্ট অর্ডারের মোট মালের ফর্দ ({selectedDate})</p>
              </div>
              <button
                onClick={() => setShowSummaryModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto flex-1 space-y-2 pr-1">
              {itemSummary.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8">
                  বর্তমানে প্যাকিংয়ের জন্য কোনো কারেন্ট অর্ডার নেই।
                </p>
              ) : (
                itemSummary.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center p-2.5 bg-slate-50 rounded-xl text-xs border border-slate-100">
                    <span className="font-bold text-slate-800">{item.name}</span>
                    <span className="bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-full">
                      মোট: {item.totalQty} Units {item.totalWeight > 0 ? `(${item.totalWeight.toFixed(2)} Kg)` : ""}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 mt-3 flex justify-end">
              <button
                onClick={() => setShowSummaryModal(false)}
                className="px-4 py-1.5 text-xs text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 font-semibold"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* স্ক্রিনশট ফুলস্ক্রিন জুম মোডাল */}
      {zoomedImage && (
        <div
          onClick={() => setZoomedImage(null)}
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="relative max-w-lg w-full bg-white rounded-2xl p-2">
            <img src={zoomedImage} alt="Enlarged Proof" className="w-full h-auto rounded-xl" />
            <p className="text-cent
                          <p className="text-center text-xs text-slate-500 mt-2">স্ক্রিনের যেকোনো জায়গায় চাপ দিলে বন্ধ হবে</p>
            </div>
          </div>
        )}

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

export default function AdminOrdersPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-xs text-slate-400">
          অর্ডার খাতা লোড হচ্ছে...
        </div>
      }
    >
      <OrdersContent />
    </Suspense>
  );
}

