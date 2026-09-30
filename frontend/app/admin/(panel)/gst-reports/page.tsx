"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import HSNTable from "./components/HSNTable";

type DateRange =
  | "today"
  | "yesterday"
  | "this_month"
  | "last_month"
  | "custom"
  | "all";

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

  const [netSales, setNetSales] = useState(0);
  const [productGST, setProductGST] = useState(0);
  const [deliveryGST, setDeliveryGST] = useState(0);
  const [deliveryCharge, setDeliveryCharge] = useState(0);
  const [homeDeliveryCount, setHomeDeliveryCount] = useState(0);
  const [totalGST, setTotalGST] = useState(0);
  const [hsnItems, setHsnItems] = useState<HSNItem[]>([]);

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

    let query = supabase.from("orders").select(
      `
        id,
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

    // ===== Net Sales =====
    const netSalesTotal = netDelivered.reduce(
      (sum: number, o: any) => sum + (Number(o.total_amount) || 0),
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

    // ===== Product GST =====
    const productGSTTotal = hsnList.reduce(
      (sum, item) => sum + item.gst_amount,
      0
    );

    // ===== Delivery Calculation =====
    const homeDelivered = netDelivered.filter(
      (o: any) => o.delivery_type === "home_delivery"
    );

    const deliveryChargeTotal = homeDelivered.reduce(
      (sum: number, o: any) => sum + (Number(o.delivery_charge) || 0),
      0
    );

    const deliveryGSTTotal = deliveryChargeTotal * 0.18;

    // ===== Set State =====
    setNetSales(netSalesTotal);
    setProductGST(productGSTTotal);
    setDeliveryCharge(deliveryChargeTotal);
    setDeliveryGST(deliveryGSTTotal);
    setHomeDeliveryCount(homeDelivered.length);
    setTotalGST(productGSTTotal + deliveryGSTTotal);
    setHsnItems(hsnList);

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

    const headers = [
      "HSN Code",
      "Product",
      "Qty",
      "GST %",
      "Net Sales",
      "GST Amount",
    ];

    const rows = hsnItems.map((item) => [
      item.hsn_code,
      `"${item.product_name}"`,
      item.qty,
      item.gst_percentage,
      item.net_sales.toFixed(2),
      item.gst_amount.toFixed(2),
    ]);

    const totalNetSales = hsnItems.reduce((sum, i) => sum + i.net_sales, 0);
    const totalGSTAmount = hsnItems.reduce(
      (sum, i) => sum + i.gst_amount,
      0
    );
    rows.push([
      "TOTAL",
      "",
      "",
      "",
      totalNetSales.toFixed(2),
      totalGSTAmount.toFixed(2),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((r) => r.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `gst-report-${new Date()
      .toISOString()
      .split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">GST Reports</h1>
        <p className="text-sm text-gray-500 mt-1">
          Product-wise GST summary for filing
        </p>
      </div>

      {/* Period Filter */}
      <div className="bg-white rounded-2xl border border-gray-100 p-3">
        <div className="flex items-center gap-1 overflow-x-auto">
          {(
            [
              { value: "today", label: "Today" },
              { value: "yesterday", label: "Yesterday" },
              { value: "this_month", label: "This Month" },
              { value: "last_month", label: "Last Month" },
              { value: "custom", label: "📅 Custom" },
              { value: "all", label: "All Time" },
            ] as const
          ).map((opt) => (
            <button
              key={opt.value}
              onClick={() => setDateRange(opt.value)}
              className={`px-3 py-2 text-xs font-medium rounded-lg whitespace-nowrap transition ${
                dateRange === opt.value
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-gray-50 text-gray-600 hover:bg-gray-100"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {dateRange === "custom" && (
          <div className="flex items-center gap-2 mt-3">
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

      {/* Row 1: Net Sales + Product GST */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-xs text-gray-500 mb-1">Net Sales</p>
          <p className="text-2xl font-bold text-blue-600">
            ₹{netSales.toLocaleString("en-IN")}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-xs text-gray-500 mb-1">Product GST</p>
          <p className="text-2xl font-bold text-amber-600">
            ₹{productGST.toLocaleString("en-IN")}
          </p>
        </div>
      </div>

      {/* Row 2: Delivery Details */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-gray-900">
            🚚 Home Delivery
          </h3>
          <span className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded-full font-semibold">
            {homeDeliveryCount} deliveries
          </span>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <p className="text-xs text-gray-500 mb-1">Charge</p>
            <p className="text-base font-bold text-gray-800">
              ₹{deliveryCharge.toLocaleString("en-IN")}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">GST (18%)</p>
            <p className="text-base font-bold text-purple-600">
              ₹{deliveryGST.toLocaleString("en-IN")}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Total</p>
            <p className="text-base font-bold text-blue-600">
              ₹{(deliveryCharge + deliveryGST).toLocaleString("en-IN")}
            </p>
          </div>
        </div>
      </div>

      {/* Row 3: Total GST */}
      <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl p-5 text-white shadow-sm">
        <p className="text-xs text-white/80 mb-1">Total GST Payable</p>
        <p className="text-3xl font-bold">
          ₹{totalGST.toLocaleString("en-IN")}
        </p>
      </div>

      {/* HSN Table */}
      <HSNTable items={hsnItems} loading={loading} />

      {/* Export */}
      {hsnItems.length > 0 && (
        <div className="flex justify-center">
          <button
            onClick={handleExportCSV}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-xl transition shadow-sm flex items-center gap-2"
          >
            📥 Export CSV
          </button>
        </div>
      )}
    </div>
  );
            }
