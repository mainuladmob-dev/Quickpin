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
    p.name_en ||
    item.name_en ||
    p.name ||
    item.name ||
    item.product_name ||
    p.title ||
    item.title ||
    p.name_bn ||
    "Product Item"
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
  };

  useEffect(() => {
    fetchOrders();
  }, [activeTab, activeOrderType, selectedDate]);

  // Automated Financial Engine
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
      // 4. Strict State Transition Logic & Spam Guard Rules
  const changeStatus = async (
    orderId: string,
    newStatus: string,
    extra?: any
  ) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return false;

    // Current Order ebong Out for Delivery kokhono Spam-e jabe na
    if (newStatus === "spam") {
      if (order.order_status === "current" || order.order_status === "out_for_delivery") {
        alert("Action Blocked: 'Current Order' (in packing) and 'Out for Delivery' orders cannot be moved to Spam.");
        return false;
      }
    }

    // Pending orders can ONLY move to 'current' or 'spam'
    if (order.order_status === "pending" && !["current", "spam"].includes(newStatus)) {
      alert("Action Blocked: Pending orders can only be moved to 'Current Order' or 'Spam'.");
      return false;
    }

    // Refund strictly locked unless Delivered
    if (newStatus === "refund" && order.order_status !== "delivered") {
      alert("Action Blocked: Refunds can only be initiated on 'Delivered' orders.");
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
      updates.refund_status = extra?.transaction_ref ? "success" : "pending";
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

    if (bulkStatus === "spam") {
      const invalidOperationalOrders = orders.filter(
        (o) => selected.includes(o.id) && ["current", "out_for_delivery"].includes(o.order_status)
      );
      if (invalidOperationalOrders.length > 0) {
        return alert(
          `Security Alert: ${invalidOperationalOrders.length} order(s) are currently in Packing/Delivery. They cannot be marked as Spam.`
        );
      }
    }

    if (!confirm(`Change ${selected.length} orders to "${bulkStatus}"?`)) return;

    for (const id of selected) await changeStatus(id, bulkStatus);
    setBulkStatus("");
    fetchOrders();
  };

  const handleDelete = async (order: Order) => {
    if (order.order_status !== "spam") {
      return alert("Only spam orders can be deleted.");
    }
    if (
      !confirm(
        `Delete spam order #${order.order_number}?\n\nNote: Customer profile, phone number, and address records will remain permanently saved in the system for fraud tracking.`
      )
    )
      return;

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
    if (
      !confirm(
        `Permanently delete ${spamSelected.length} spam orders?\n\nCustomer profile history, phone numbers, and addresses will remain safely kept in database.`
      )
    )
      return;

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
    product_name?: string;
    transaction_ref?: string;
    customer_upi?: string;
  }) => {
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
      console.warn("Audit table log note:", e);
    }

    if (refundOrder.user_id && data.customer_upi) {
      try {
        await supabase
          .from("profiles")
          .update({ upi_id: data.customer_upi })
          .eq("id", refundOrder.user_id);
      } catch {}
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
        
