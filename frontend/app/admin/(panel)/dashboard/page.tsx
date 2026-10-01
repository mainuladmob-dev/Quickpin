"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import DateFilter from "./components/DateFilter";
import StatsCard from "./components/StatsCard";
import OrderIdsModal from "./components/OrderIdsModal";

type DateRange = "today" | "yesterday" | "custom" | "all";

interface OrderIdItem {
  id: string;
  amount: number;
  refund?: number;
  netAmount?: number;
}

export default function DashboardPage() {
  const supabase = useMemo(() => createClient(), []);
  const [dateRange, setDateRange] = useState<DateRange>("today");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState({
    grossSales: 0,
    refundAmount: 0,
    netSales: 0,
    deliveryCharge: 0,
    deliveryGST: 0,
    deliveryTotal: 0,
  });

  const [counts, setCounts] = useState({
    grossOrders: 0,
    refundOrders: 0,
    netOrders: 0,
    homeDeliveries: 0,
  });

  const [grossIds, setGrossIds] = useState<OrderIdItem[]>([]);
  const [refundIds, setRefundIds] = useState<OrderIdItem[]>([]);
  const [netIds, setNetIds] = useState<OrderIdItem[]>([]);
  const [deliveryIds, setDeliveryIds] = useState<OrderIdItem[]>([]);

  const [modalData, setModalData] = useState<{
    title: string;
    items: OrderIdItem[];
    isDelivery?: boolean;
  } | null>(null);

  useEffect(() => {
    fetchStats();
  }, [dateRange, customStart, customEnd]);

  const getDateRange = () => {
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
  };

  const fetchStats = async () => {
    setLoading(true);
    const range = getDateRange();

    let query = supabase
      .from("orders")
      .select(
        `
        id,
        order_number,
        order_status,
        payment_status,
        total_amount,
        refund_amount,
        delivery_charge,
        delivery_type
      `
      );

    if (range) {
      query = query
        .gte("created_at", range.start)
        .lte("created_at", range.end);
    }

    const { data: orders, error } = await query;

    if (error || !orders) {
      console.error(error);
      setLoading(false);
      return;
    }

    // ===== Delivered orders (payment success + order delivered) =====
    const delivered = orders.filter(
      (o: any) =>
        o.payment_status === "success" && o.order_status === "delivered"
    );

    // ===== Refunded = refund_amount > 0 =====
    const refunded = orders.filter(
      (o: any) => (Number(o.refund_amount) || 0) > 0
    );

    // ===== Home Delivered =====
    const homeDelivered = delivered.filter(
      (o: any) => o.delivery_type === "home_delivery"
    );

    // ===== Gross Sales =====
    const grossSales = delivered.reduce(
      (sum: number, o: any) => sum + (Number(o.total_amount) || 0),
      0
    );

    // ===== Refund Amount =====
    const refundAmount = refunded.reduce(
      (sum: number, o: any) => sum + (Number(o.refund_amount) || 0),
      0
    );

    // ===== Delivery =====
    const deliveryCharge = homeDelivered.reduce(
      (sum: number, o: any) => sum + (Number(o.delivery_charge) || 0),
      0
    );
    const deliveryGST = deliveryCharge * 0.18;
    const deliveryTotal = deliveryCharge + deliveryGST;

    // ===== Gross IDs =====
    const grossIdsArr: OrderIdItem[] = delivered.map((o: any) => ({
      id: o.order_number || `#${o.id.slice(0, 8)}`,
      amount: Number(o.total_amount) || 0,
    }));

    // ===== Refund IDs =====
    const refundIdsArr: OrderIdItem[] = refunded.map((o: any) => ({
      id: o.order_number || `#${o.id.slice(0, 8)}`,
      amount: Number(o.refund_amount) || 0,
    }));

    // ✅ Net IDs — সব delivered order (refund থাকুক বা না থাকুক)
    const netIdsArr: OrderIdItem[] = delivered.map((o: any) => {
      const total = Number(o.total_amount) || 0;
      const refund = Number(o.refund_amount) || 0;
      return {
        id: o.order_number || `#${o.id.slice(0, 8)}`,
        amount: total,
        refund: refund,
        netAmount: total - refund,
      };
    });

    // ===== Delivery IDs =====
    const deliveryIdsArr: OrderIdItem[] = homeDelivered.map((o: any) => ({
      id: o.order_number || `#${o.id.slice(0, 8)}`,
      amount: Number(o.delivery_charge) || 0,
    }));

    setStats({
      grossSales,
      refundAmount,
      netSales: grossSales - refundAmount,
      deliveryCharge,
      deliveryGST,
      deliveryTotal,
    });

    setCounts({
      grossOrders: delivered.length,
      refundOrders: refunded.length,
      netOrders: netIdsArr.length,
      homeDeliveries: homeDelivered.length,
    });

    setGrossIds(grossIdsArr);
    setRefundIds(refundIdsArr);
    setNetIds(netIdsArr);
    setDeliveryIds(deliveryIdsArr);

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Overview of your store</p>
        </div>

        <DateFilter
          dateRange={dateRange}
          setDateRange={setDateRange}
          customStart={customStart}
          setCustomStart={setCustomStart}
          customEnd={customEnd}
          setCustomEnd={setCustomEnd}
        />
      </div>

      {/* Financial Row */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          💰 Financial{" "}
          {dateRange === "all" ? "(All Time)" : "(Completed Orders)"}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatsCard
            title="Gross Sales"
            value={`₹${stats.grossSales.toLocaleString("en-IN")}`}
            subtitle="(incl. GST)"
            bottomText={`📦 ${counts.grossOrders} orders`}
            icon="💰"
            color="green"
            onClick={() =>
              setModalData({
                title: "Gross Sales",
                items: grossIds,
              })
            }
            clickable
          />
          <StatsCard
            title="Refund"
            value={`₹${stats.refundAmount.toLocaleString("en-IN")}`}
            subtitle="(incl. GST)"
            bottomText={`📦 ${counts.refundOrders} refunds`}
            icon="↩️"
            color="red"
            onClick={() =>
              setModalData({
                title: "Refund",
                items: refundIds,
              })
            }
            clickable
          />
          <StatsCard
            title="Net Sales"
            value={`₹${stats.netSales.toLocaleString("en-IN")}`}
            subtitle="(incl. GST)"
            bottomText={`📦 ${counts.netOrders} orders`}
            icon="📈"
            color="blue"
            onClick={() =>
              setModalData({
                title: "Net Sales",
                items: netIds,
              })
            }
            clickable
          />
        </div>
      </div>

      {/* Home Delivery Row */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          🚚 Home Delivery{" "}
          {dateRange === "all" ? "(All Time)" : "(Completed Orders)"}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatsCard
            title="Home Delivery"
            value={`₹${stats.deliveryTotal.toLocaleString("en-IN")}`}
            subtitle="(incl. GST)"
            bottomText={`📦 ${counts.homeDeliveries} deliveries • Charge ₹${stats.deliveryCharge.toLocaleString(
              "en-IN"
            )} + GST ₹${stats.deliveryGST.toLocaleString("en-IN")}`}
            icon="🚚"
            color="purple"
            onClick={() =>
              setModalData({
                title: "Home Delivery",
                items: deliveryIds,
                isDelivery: true,
              })
            }
            clickable
          />
        </div>
      </div>

      {/* Modal */}
      {modalData && (
        <OrderIdsModal
          title={modalData.title}
          orderIds={modalData.items}
          isDelivery={modalData.isDelivery}
          onClose={() => setModalData(null)}
        />
      )}
    </div>
  );
    }
