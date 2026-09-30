"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import SummaryCards from "./components/SummaryCards";
import HSNTable from "./components/HSNTable";
import DeliverySection from "./components/DeliverySection";

type DateRange = "today" | "yesterday" | "this_month" | "last_month" | "custom" | "all";

interface HSNItem {
  hsn_code: string;
  product_name: string;
  gst_percentage: number;
  net_sales: number;
  gst_amount: number;
  qty: number;
}

export default function GSTReportsPage() {
  const supabase = useMemo(() => createClient(), []);

  const [dateRange, setDateRange] = useState<DateRange>("this_month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [loading, setLoading] = useState(true);

  const [summary, setSummary] = useState({
    grossSales: 0,
    refundAmount: 0,
    netSales: 0,
    productGST: 0,
    deliveryGST: 0,
    totalGST: 0,
  });

  const [hsnItems, setHsnItems] = useState<HSNItem[]>([]);
  const [deliveryData, setDeliveryData] = useState({
    homeDeliveries: 0,
    selfPickups: 0,
    deliveryCharge: 0,
    deliveryGST: 0,
  });

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

    if (dateRange === "this_month") {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
      return { start: start.toISOString(), end: end.toISOString() };
    }

    if (dateRange === "last_month") {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const end = new Date(today.getFullYear(), today.getMonth(), 0);
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

  const fetchData = useCallback(async () => {
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
          products ( name_en, gst_percentage, hsn_code )
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
      console.error("GST fetch error:", error);
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

    // ===== Net Delivered = Delivered − Refunded =====
    const netDelivered = delivered.filter(
      (d: any) => !refunded.some((r: any) => r.id === d.id)
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

    // ===== HSN-wise Product Calculation =====
    const hsnMap: Record<string, HSNItem> = {};

    netDelivered.forEach((order: any) => {
      (order.order_items || []).forEach((item: any) => {
        const product = item.products;
        if (!product) return;

        const hsn = product.hsn_code || "UNKNOWN";
        const gstPercent = Number(product.gst_percentage) || 0;
        const itemTotal = item.qty * Number(item.price);

        // GST Inclusive → Extract Base + GST
        const basePrice = itemTotal / (1 + gstPercent / 100);
        const gstAmount = itemTotal - basePrice;

        const key = `${hsn}-${product.name_en}-${gstPercent}`;

        if (!hsnMap[key]) {
          hsnMap[key] = {
            hsn_code: hsn,
            product_name: product.name_en || "Product",
            gst_percentage: gstPercent,
            net_sales: 0,
            gst_amount: 0,
            qty: 0,
          };
        }

        hsnMap[key].net_sales += itemTotal;
        hsnMap[key].gst_amount += gstAmount;
        hsnMap[key].qty += Number(item.qty) || 0;
      });
    });

    const hsnList = Object.values(hsnMap).sort((a, b) =>
      a.hsn_code.localeCompare(b.hsn_code)
    );

    const productGSTTotal = hsnList.reduce(
      (sum, item) => sum + item.gst_amount,
      0
    );

    // ===== Delivery Calculation =====
    const homeDelivered = netDelivered.filter(
      (o: any) => o.delivery_type === "home_delivery"
    );
    const selfPickups = netDelivered.filter(
      (o: any) => o.delivery_type === "self_pickup"
    );

    const deliveryCharge = homeDelivered.reduce(
      (sum: number, o: any) => sum + (Number(o.delivery_charge) || 0),
      0
    );

    const deliveryGST = deliveryCharge * 0.18;

    // ===== Set State =====
    setSummary({
      grossSales,
      refundAmount,
      netSales: grossSales - refundAmount,
      productGST: productGSTTotal,
      deliveryGST,
      totalGST: productGSTTotal + deliveryGST,
    });

    setHsnItems(hsnList);

    setDeliveryData({
      homeDeliveries: homeDelivered.length,
      selfPickups: selfPickups.length,
      deliveryCharge,
      deliveryGST,
    });

    setLoading(false);
  }, [supabase, getDateRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleExportCSV = () => {
    if (hsnItems.length === 0) {
      alert("No data to export");
      return;
    }

    // CSV Header
    const headers = [
      "HSN Code",
      "Product",
      "Qty",
      "GST %",
      "Net Sales",
      "GST Amount",
    ];

    // CSV Rows
    const rows = hsnItems.map((item) => [
      item.hsn_code,
      `"${item.product_name}"`,
      item.qty,
      item.gst_percentage,
      item.net_sales.toFixed(2),
      item.gst_amount.toFixed(2),
    ]);

    // Total Row
    const totalNetSales = hsnItems.reduce((sum, i) => sum + i.net_sales, 0);
    const totalGST = hsnItems.reduce((sum, i) => sum + i.gst_amount, 0);
    rows.push([
      "TOTAL",
      "",
      "",
      "",
      totalNetSales.toFixed(2),
      totalGST.toFixed(2),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((r) => r.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `gst-report-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">GST Reports</h1>
        <p className="text-sm text-gray-500 mt-1">
          Monthly summary for GSTR-1 filing
        </p>
      </div>

      {/* Period Filter */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            📅 Period
          </p>
          <div className="flex items-center gap-1 bg-gray-50 rounded-xl p-1 overflow-x-auto">
            <button
              onClick={() => setDateRange("today")}
              className={`px-3 py-2 text-xs font-medium rounded-lg whitespace-nowrap transition ${
                dateRange === "today"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-gray-600 hover:bg-white"
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setDateRange("yesterday")}
              className={`px-3 py-2 text-xs font-medium rounded-lg whitespace-nowrap transition ${
                dateRange === "yesterday"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-gray-600 hover:bg-white"
              }`}
            >
              Yesterday
            </button>
            <button
              onClick={() => setDateRange("this_month")}
              className={`px-3 py-2 text-xs font-medium rounded-lg whitespace-nowrap transition ${
                dateRange === "this_month"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-gray-600 hover:bg-white"
              }`}
            >
              This Month
            </button>
            <button
              onClick={() => setDateRange("last_month")}
              className={`px-3 py-2 text-xs font-medium rounded-lg whitespace-nowrap transition ${
                dateRange === "last_month"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-gray-600 hover:bg-white"
              }`}
            >
              Last Month
            </button>
            <button
              onClick={() => setDateRange("custom")}
              className={`px-3 py-2 text-xs font-medium rounded-lg whitespace-nowrap transition ${
                dateRange === "custom"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-gray-600 hover:bg-white"
              }`}
            >
              📅 Custom
            </button>
            <button
              onClick={() => setDateRange("all")}
              className={`px-3 py-2 text-xs font-medium rounded-lg whitespace-nowrap transition ${
                dateRange === "all"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-gray-600 hover:bg-white"
              }`}
            >
              All Time
            </button>
          </div>
        </div>

        {dateRange === "custom" && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <span className="text-gray-400 text-xs font-medium">to</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <SummaryCards
        grossSales={summary.grossSales}
        refundAmount={summary.refundAmount}
        netSales={summary.netSales}
        productGST={summary.productGST}
        deliveryGST={summary.deliveryGST}
        totalGST={summary.totalGST}
      />

      {/* HSN Table */}
      <HSNTable items={hsnItems} loading={loading} />

      {/* Delivery Section */}
      <DeliverySection
        homeDeliveries={deliveryData.homeDeliveries}
        selfPickups={deliveryData.selfPickups}
        deliveryCharge={deliveryData.deliveryCharge}
        deliveryGST={deliveryData.deliveryGST}
      />

      {/* Export Button */}
      {hsnItems.length > 0 && (
        <div className="flex justify-center">
          <button
            onClick={handleExportCSV}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold px-6 py-3 rounded-xl transition shadow-lg flex items-center gap-2"
          >
            📥 Export CSV (for GSTR-1)
          </button>
        </div>
      )}
    </div>
  );
                                   }
