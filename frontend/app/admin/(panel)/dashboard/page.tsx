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
        delivery_type,
        order_items (
          id,
          qty,
          price,
          products ( name_en, gst_percentage )
        )
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

    // ===== Successful = payment_status === "success" =====
    const successful = orders.filter(
      (o: any) => o.payment_status === "success"
    );

    // ===== Delivered = order_status === "delivered" =====
    const delivered = successful.filter(
      (o: any) => o.order_status === "delivered"
    );

    // ===== Refunded = refund_amount > 0 =====
    const refunded = orders.filter(
      (o: any) => (Number(o.refund_amount) || 0) > 0
    );

    // ===== Home Deliveries = delivery_type === "home_delivery" + delivered =====
    const homeDelivered = delivered.filter(
      (o: any) => o.delivery_type === "home_delivery"
    );

    // ===== Gross Sales = sum(delivered total_amount) =====
    const grossSales = delivered.reduce(
      (sum: number, o: any) => sum + (Number(o.total_amount) || 0),
      0
    );

    // ===== Refund Amount = sum(refund_amount) =====
    const refundAmount = refunded.reduce(
      (sum: number, o: any) => sum + (Number(o.refund_amount) || 0),
      0
    );

    // ===== Delivery Charge = sum of delivery charges for home deliveries =====
    const deliveryCharge = homeDelivered.reduce(
      (sum: number, o: any) => sum + (Number(o.delivery_charge) || 0),
      0
    );

    // ===== Delivery GST (18%) =====
    const deliveryGST = deliveryCharge * 0.18;

    // ===== Delivery Total = Charge + GST =====
    const deliveryTotal = deliveryCharge + deliveryGST;

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
      netOrders: delivered.length - refunded.length,
      homeDeliveries: homeDelivered.length,
    });

    setLoading(false);
  };

  const handleShowModal = (
    title: string,
    items: OrderIdItem[],
    isDelivery = false
  ) => {
    setModalData({ title, items, isDelivery });
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
            onClick={() => {
              // fetch order IDs for gross
              handleShowModal("Gross Sales", []);
            }}
            clickable
          />
          <StatsCard
            title="Refund"
            value={`₹${stats.refundAmount.toLocaleString("en-IN")}`}
            subtitle="(incl. GST)"
            bottomText={`📦 ${counts.refundOrders} refunds`}
            icon="↩️"
            color="red"
            onClick={() => {
              handleShowModal("Refund", []);
            }}
            clickable
          />
          <StatsCard
            title="Net Sales"
            value={`₹${stats.netSales.toLocaleString("en-IN")}`}
            subtitle="(incl. GST)"
            bottomText={`📦 ${counts.netOrders} orders`}
            icon="📈"
            color="blue"
            onClick={() => {
              handleShowModal("Net Sales", []);
            }}
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
            onClick={() => {
              handleShowModal("Home Delivery", [], true);
            }}
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
