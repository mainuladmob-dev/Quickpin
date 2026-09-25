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
    totalOrders: 0,
    pendingOrders: 0,
    deliveredOrders: 0,
    refundOrders: 0,
    grossSales: 0,
    refundAmount: 0,
    netSales: 0,
    totalWeight: 0,
  });

  const [orderIds, setOrderIds] = useState<{
    total: string[];
    pending: string[];
    delivered: string[];
    refund: string[];
  }>({ total: [], pending: [], delivered: [], refund: [] });

  const [weightBreakdown, setWeightBreakdown] = useState<
    { name: string; weight: number }[]
  >([]);

  const [modalOpen, setModalOpen] = useState<
    null | "total" | "pending" | "delivered" | "refund" | "weight"
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

    // Fetch all orders in date range
    const { data: orders, error } = await supabase
      .from("orders")
      .select("id, order_number, order_status, payment_status, total_amount, refund_amount")
      .gte("created_at", range.start)
      .lte("created_at", range.end);

    if (error || !orders) {
      console.error(error);
      setLoading(false);
      return;
    }

    // Calculate stats
    const successful = orders.filter(
      (o) => o.payment_status === "paid" || o.payment_status === "success"
    );

    const pending = successful.filter(
      (o) => o.order_status === "pending" || o.order_status === "processing"
    );

    const delivered = successful.filter(
      (o) => o.order_status === "delivered" || o.order_status === "completed"
    );

    const refunded = successful.filter((o) => (o.refund_amount || 0) > 0);

    const grossSales = successful.reduce(
      (sum, o) => sum + (o.total_amount || 0),
      0
    );

    const refundAmount = successful.reduce(
      (sum, o) => sum + (o.refund_amount || 0),
      0
    );

    setStats({
      totalOrders: successful.length,
      pendingOrders: pending.length,
      deliveredOrders: delivered.length,
      refundOrders: refunded.length,
      grossSales,
      refundAmount,
      netSales: grossSales - refundAmount,
      totalWeight: 0, // Will calculate later
    });

    setOrderIds({
      total: successful.map((o) => o.order_number || o.id),
      pending: pending.map((o) => o.order_number || o.id),
      delivered: delivered.map((o) => o.order_number || o.id),
      refund: refunded.map((o) => o.order_number || o.id),
    });

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
          <p className="text-sm text-gray-500 mt-1">
            Overview of your store
          </p>
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
          💰 Financial
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
            title="Total Orders"
            value={stats.totalOrders}
            icon="📦"
            color="blue"
            onClick={() => setModalOpen("total")}
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
          ⚖️ Weight
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
      {modalOpen === "total" && (
        <OrderIdsModal
          title="Total Orders"
          orderIds={orderIds.total}
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
