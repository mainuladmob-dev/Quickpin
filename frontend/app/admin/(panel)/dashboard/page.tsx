"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import DateFilter from "./components/DateFilter";
import StatsCard from "./components/StatsCard";
import OrderIdsModal from "./components/OrderIdsModal";
import WeightBreakdownModal from "./components/WeightBreakdownModal";

type DateRange = "today" | "yesterday" | "custom";

export default function DashboardPage() {
  const supabase = useMemo(() => createClient(), []);
  const [dateRange, setDateRange] = useState<DateRange>("today");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState({
    currentOrders: 0,
    pendingOrders: 0,
    deliveredOrders: 0,
    refundOrders: 0,
    grossSales: 0,
    refundAmount: 0,
    netSales: 0,
    totalWeight: 0,
  });

  const [orderIds, setOrderIds] = useState<{
    current: string[];
    pending: string[];
    delivered: string[];
    refund: string[];
  }>({ current: [], pending: [], delivered: [], refund: [] });

  const [weightBreakdown, setWeightBreakdown] = useState<
    { name: string; weight: number }[]
  >([]);

  const [modalOpen, setModalOpen] = useState<
    null | "current" | "pending" | "delivered" | "refund" | "weight"
  >(null);

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
    if (!range) {
      setLoading(false);
      return;
    }

    const { data: orders, error } = await supabase
      .from("orders")
      .select(
        `
        id,
        order_number,
        order_status,
        payment_status,
        total_amount,
        refund_amount,
        order_items (
          id,
          qty,
          products ( name_en, weight )
        )
      `
      )
      .gte("created_at", range.start)
      .lte("created_at", range.end);

    if (error || !orders) {
      console.error(error);
      setLoading(false);
      return;
    }

    // ===== Successful = payment_status === "success" =====
    const successful = orders.filter(
      (o: any) => o.payment_status === "success"
    );

    // ===== Pending = payment_status === "pending" =====
    const pending = orders.filter(
      (o: any) => o.payment_status === "pending"
    );

    // ===== Current Orders = order_status === "current" =====
    const currentOrders = successful.filter(
      (o: any) => o.order_status === "current"
    );

    // ===== Delivered = order_status === "delivered" =====
    const delivered = successful.filter(
      (o: any) => o.order_status === "delivered"
    );

    // ===== Refunded = refund_amount > 0 =====
    const refunded = orders.filter(
      (o: any) => (Number(o.refund_amount) || 0) > 0
    );

    // ===== Gross Sales = শুধু Delivered orders =====
    const grossSales = delivered.reduce(
      (sum: number, o: any) => sum + (Number(o.total_amount) || 0),
      0
    );

    const refundAmount = refunded.reduce(
      (sum: number, o: any) => sum + (Number(o.refund_amount) || 0),
      0
    );

    // ===== Weight = শুধু Current orders এর products =====
    const productMap: Record<string, number> = {};

    currentOrders.forEach((order: any) => {
      (order.order_items || []).forEach((item: any) => {
        const productWeight = Number(item.products?.weight) || 0;
        const itemTotalWeight = (Number(item.qty) || 0) * productWeight;
        const name = item.products?.name_en || "Unknown";

        if (!productMap[name]) productMap[name] = 0;
        productMap[name] += itemTotalWeight;
      });
    });

    const weightBreakdownList = Object.entries(productMap)
      .map(([name, weight]) => ({
        name,
        weight: Number(weight.toFixed(2)),
      }))
      .filter((item) => item.weight > 0)
      .sort((a, b) => b.weight - a.weight);

    const totalWeight = weightBreakdownList.reduce(
      (sum, item) => sum + item.weight,
      0
    );

    setStats({
      currentOrders: currentOrders.length,
      pendingOrders: pending.length,
      deliveredOrders: delivered.length,
      refundOrders: refunded.length,
      grossSales,
      refundAmount,
      netSales: grossSales - refundAmount,
      totalWeight: Number(totalWeight.toFixed(2)),
    });

    setOrderIds({
      current: currentOrders.map((o: any) => o.order_number || o.id),
      pending: pending.map((o: any) => o.order_number || o.id),
      delivered: delivered.map((o: any) => o.order_number || o.id),
      refund: refunded.map((o: any) => o.order_number || o.id),
    });

    setWeightBreakdown(weightBreakdownList);
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
          💰 Financial (Completed Orders)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatsCard
            title="Gross Sales"
            value={`₹${stats.grossSales.toLocaleString("en-IN")}`}
            icon="💰"
            color="green"
          />
          <StatsCard
            title="Refund"
            value={`₹${stats.refundAmount.toLocaleString("en-IN")}`}
            icon="↩️"
            color="red"
            onClick={() => setModalOpen("refund")}
            clickable
          />
          <StatsCard
            title="Net Sales"
            value={`₹${stats.netSales.toLocaleString("en-IN")}`}
            icon="📈"
            color="blue"
          />
        </div>
      </div>

      {/* Order Status Row */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          📦 Order Status
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatsCard
            title="Current Orders"
            value={stats.currentOrders}
            icon="📦"
            color="blue"
            onClick={() => setModalOpen("current")}
            clickable
          />
          <StatsCard
            title="Pending"
            value={stats.pendingOrders}
            icon="⏳"
            color="amber"
            onClick={() => setModalOpen("pending")}
            clickable
          />
          <StatsCard
            title="Delivered"
            value={stats.deliveredOrders}
            icon="✅"
            color="green"
            onClick={() => setModalOpen("delivered")}
            clickable
          />
          <StatsCard
            title="Refund Orders"
            value={stats.refundOrders}
            icon="↩️"
            color="red"
            onClick={() => setModalOpen("refund")}
            clickable
          />
        </div>
      </div>

      {/* Weight Row */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          ⚖️ Weight to Buy (Current Orders)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatsCard
            title="Total Weight"
            value={`${stats.totalWeight} kg`}
            icon="⚖️"
            color="purple"
            onClick={() => setModalOpen("weight")}
            clickable
          />
        </div>
      </div>

      {/* Modals */}
      {modalOpen === "current" && (
        <OrderIdsModal
          title="Current Orders"
          orderIds={orderIds.current}
          onClose={() => setModalOpen(null)}
        />
      )}
      {modalOpen === "pending" && (
        <OrderIdsModal
          title="Pending Orders"
          orderIds={orderIds.pending}
          onClose={() => setModalOpen(null)}
        />
      )}
      {modalOpen === "delivered" && (
        <OrderIdsModal
          title="Delivered Orders"
          orderIds={orderIds.delivered}
          onClose={() => setModalOpen(null)}
        />
      )}
      {modalOpen === "refund" && (
        <OrderIdsModal
          title="Refund Orders"
          orderIds={orderIds.refund}
          onClose={() => setModalOpen(null)}
        />
      )}
      {modalOpen === "weight" && (
        <WeightBreakdownModal
          breakdown={weightBreakdown}
          totalWeight={stats.totalWeight}
          onClose={() => setModalOpen(null)}
        />
      )}
    </div>
  );
}
