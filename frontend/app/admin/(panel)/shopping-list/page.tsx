"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import jsPDF from "jspdf";

interface WeightItem {
  name: string;
  name_bn: string;
  weight: number;
}

interface HistoryDay {
  date: string;
  dateLabel: string;
  totalWeight: number;
  orderCount: number;
  items: WeightItem[];
}

export default function ShoppingListPage() {
  const supabase = useMemo(() => createClient(), []);

  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  const [todayItems, setTodayItems] = useState<WeightItem[]>([]);
  const [todayOrderCount, setTodayOrderCount] = useState(0);

  const [history, setHistory] = useState<HistoryDay[]>([]);
  const [expandedDate, setExpandedDate] = useState<string | null>(null);

  // ===== Fetch Today's Data (Current Orders) =====
  const fetchTodayData = useCallback(async () => {
    const { data: orders, error } = await supabase
      .from("orders")
      .select(
        `
        id,
        order_items (
          id,
          qty,
          products ( name_en, name_bn, weight )
        )
      `
      )
      .eq("payment_status", "success")
      .eq("order_status", "current");

    if (error || !orders) {
      console.error("Shopping fetch error:", error);
      return;
    }

    const productMap: Record<string, WeightItem> = {};

    orders.forEach((order: any) => {
      (order.order_items || []).forEach((item: any) => {
        const product = item.products;
        if (!product) return;

        const nameEn = product.name_en || "Product";
        const nameBn = product.name_bn || "";
        const itemWeight =
          (Number(item.qty) || 0) * (Number(product.weight) || 0);

        if (!productMap[nameEn]) {
          productMap[nameEn] = {
            name: nameEn,
            name_bn: nameBn,
            weight: 0,
          };
        }

        productMap[nameEn].weight += itemWeight;
      });
    });

    const list = Object.values(productMap)
      .map((item) => ({
        ...item,
        weight: Number(item.weight.toFixed(2)),
      }))
      .filter((item) => item.weight > 0)
      .sort((a, b) => b.weight - a.weight);

    setTodayItems(list);
    setTodayOrderCount(orders.length);
  }, [supabase]);

  // ===== Fetch History (Last 30 Days) =====
  const fetchHistory = useCallback(async () => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: orders, error } = await supabase
      .from("orders")
      .select(
        `
        id,
        created_at,
        order_items (
          id,
          qty,
          products ( name_en, name_bn, weight )
        )
      `
      )
      .gte("created_at", thirtyDaysAgo.toISOString())
      .order("created_at", { ascending: false });

    if (error || !orders) {
      console.error("History fetch error:", error);
      return;
    }

    // Group by date
    const dateMap: Record<string, HistoryDay> = {};

    orders.forEach((order: any) => {
      const date = order.created_at.split("T")[0];

      if (!dateMap[date]) {
        const d = new Date(order.created_at);
        dateMap[date] = {
          date,
          dateLabel: d.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          }),
          totalWeight: 0,
          orderCount: 0,
          items: [],
        };
      }

      const productMap: Record<string, WeightItem> = {};
      dateMap[date].items.forEach((i) => {
        productMap[i.name] = { ...i };
      });

      (order.order_items || []).forEach((item: any) => {
        const product = item.products;
        if (!product) return;

        const nameEn = product.name_en || "Product";
        const nameBn = product.name_bn || "";
        const itemWeight =
          (Number(item.qty) || 0) * (Number(product.weight) || 0);

        if (!productMap[nameEn]) {
          productMap[nameEn] = {
            name: nameEn,
            name_bn: nameBn,
            weight: 0,
          };
        }

        productMap[nameEn].weight += itemWeight;
        dateMap[date].totalWeight += itemWeight;
      });

      dateMap[date].orderCount += 1;
      dateMap[date].items = Object.values(productMap)
        .map((item) => ({
          ...item,
          weight: Number(item.weight.toFixed(2)),
        }))
        .sort((a, b) => b.weight - a.weight);
    });

    // Sort by date (newest first) + filter out empty
    const list = Object.values(dateMap)
      .map((d) => ({
        ...d,
        totalWeight: Number(d.totalWeight.toFixed(2)),
      }))
      .filter((d) => d.totalWeight > 0)
      .sort((a, b) => b.date.localeCompare(a.date));

    setHistory(list);
  }, [supabase]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchTodayData(), fetchHistory()]);
      setLoading(false);
    };
    load();
  }, [fetchTodayData, fetchHistory]);

  const todayTotalWeight = todayItems.reduce(
    (sum, item) => sum + item.weight,
    0
  );

  // ===== Print Market List =====
  const handlePrint = async (items: WeightItem[], dateLabel: string) => {
    if (items.length === 0) {
      alert("No weight data to print");
      return;
    }

    setDownloading(true);

    try {
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageW = 210;
      const marginX = 15;
      let y = 15;

      const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);

      // Header
      pdf.setFillColor(37, 99, 235);
      pdf.rect(0, 0, pageW, 30, "F");

      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(22);
      pdf.setFont("helvetica", "bold");
      pdf.text("Quickpin", marginX, 15);

      pdf.setFontSize(12);
      pdf.setFont("helvetica", "normal");
      pdf.text("Market Shopping List", marginX, 23);

      pdf.setFontSize(9);
      pdf.text(dateLabel, pageW - marginX, 15, { align: "right" });
      pdf.text(`Total Weight: ${totalWeight.toFixed(2)} kg`, pageW - marginX, 23, {
        align: "right",
      });

      y = 42;

      // Products
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(11);
      pdf.setFont("helvetica", "bold");
      pdf.text("PRODUCTS", marginX, y);
      y += 2;

      pdf.setDrawColor(200, 200, 200);
      pdf.line(marginX, y, pageW - marginX, y);
      y += 4;

      const contentW = pageW - marginX * 2;
      pdf.setFillColor(240, 240, 240);
      pdf.rect(marginX, y, contentW, 8, "F");

      pdf.setFontSize(10);
      pdf.text("#", marginX + 3, y + 5.5);
      pdf.text("Product", marginX + 15, y + 5.5);
      pdf.text("Weight", pageW - marginX - 3, y + 5.5, { align: "right" });

      y += 8;

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);

      items.forEach((item, index) => {
        if (y > 260) {
          pdf.addPage();
          y = 20;
        }

        const displayName = item.name_bn
          ? `${item.name} (${item.name_bn})`
          : item.name;

        pdf.text(`${index + 1}`, marginX + 3, y + 5);
        pdf.text(displayName, marginX + 15, y + 5);
        pdf.text(`${item.weight.toFixed(2)} kg`, pageW - marginX - 3, y + 5, {
          align: "right",
        });

        y += 7;

        pdf.setDrawColor(235, 235, 235);
        pdf.line(marginX, y, pageW - marginX, y);
      });

      y += 4;

      // Total
      pdf.setFillColor(248, 250, 252);
      pdf.rect(pageW - marginX - 70, y, 70, 12, "F");

      pdf.setFontSize(11);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(37, 99, 235);
      pdf.text("TOTAL:", pageW - marginX - 65, y + 8);
      pdf.text(`${totalWeight.toFixed(2)} kg`, pageW - marginX - 5, y + 8, {
        align: "right",
      });

      // Footer
      pdf.setFontSize(8);
      pdf.setTextColor(150, 150, 150);
      pdf.setFont("helvetica", "normal");
      pdf.text("Quickpin ⚡ | quickpin.in", pageW / 2, 285, {
        align: "center",
      });

      pdf.save(`market-list-${dateLabel.replace(/\s/g, "-")}.pdf`);
    } catch (err) {
      console.error("Print failed:", err);
      alert("PDF generate করতে সমস্যা হয়েছে");
    } finally {
      setDownloading(false);
    }
  };

  const todayLabel = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="space-y-4 pb-20">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Shopping List</h1>
        <p className="text-sm text-gray-500 mt-1">
          Market buying history & today's list
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <>
          {/* Today's List */}
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl border-2 border-blue-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">⚖️</span>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">
                    Today's List
                  </h3>
                  <p className="text-xs text-gray-500">
                    {todayLabel} • {todayOrderCount} orders
                  </p>
                </div>
              </div>

              {todayItems.length > 0 && (
                <button
                  onClick={() => handlePrint(todayItems, todayLabel)}
                  disabled={downloading}
                  className="text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg transition disabled:opacity-50"
                >
                  🖨️ Print
                </button>
              )}
            </div>

            {todayItems.length === 0 ? (
              <div className="bg-white rounded-xl p-6 text-center">
                <p className="text-3xl mb-2">📭</p>
                <p className="text-sm text-gray-500">
                  কোনো Current Order নেই
                </p>
              </div>
            ) : (
              <>
                <div className="bg-white rounded-xl p-4 mb-3">
                  <p className="text-xs text-gray-500 mb-1">Total Weight</p>
                  <p className="text-3xl font-bold text-blue-600">
                    {todayTotalWeight.toFixed(2)} kg
                  </p>
                </div>

                <div className="bg-white rounded-xl p-3 space-y-2">
                  {todayItems.map((item, index) => (
                    <div
                      key={item.name + index}
                      className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-b-0"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="text-xs text-gray-400 font-mono w-5 shrink-0">
                          {index + 1}.
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-800 truncate">
                            {item.name}
                          </p>
                          {item.name_bn && (
                            <p className="text-xs text-gray-500 truncate">
                              {item.name_bn}
                            </p>
                          )}
                        </div>
                      </div>
                      <span className="text-sm font-bold text-purple-600 shrink-0 ml-2">
                        {item.weight.toFixed(2)} kg
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* History */}
          <div>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              📚 History (Last 30 Days)
            </h2>

            {history.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                <div className="text-6xl mb-4">📚</div>
                <h2 className="text-lg font-semibold text-gray-700 mb-1">
                  No history yet
                </h2>
                <p className="text-sm text-gray-500">
                  এই 30 দিনে কোনো Data নেই
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {history.map((day) => {
                  const isExpanded = expandedDate === day.date;
                  return (
                    <div
                      key={day.date}
                      className="bg-white rounded-xl border border-gray-100 overflow-hidden"
                    >
                      <button
                        onClick={() =>
                          setExpandedDate(isExpanded ? null : day.date)
                        }
                        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition text-left"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-base shrink-0">
                            📅
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-gray-900">
                              {day.dateLabel}
                            </p>
                            <p className="text-xs text-gray-500">
                              {day.orderCount} orders
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0 ml-2">
                          <span className="text-sm font-bold text-purple-600">
                            {day.totalWeight.toFixed(2)} kg
                          </span>
                          <span className="text-gray-400 text-sm">
                            {isExpanded ? "▲" : "▼"}
                          </span>
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="border-t border-gray-100 p-4 bg-gray-50">
                          <div className="flex items-center justify-between mb-3">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                              Product Breakdown
                            </p>
                            <button
                              onClick={() =>
                                handlePrint(day.items, day.dateLabel)
                              }
                              className="text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1.5 rounded-lg transition"
                            >
                              🖨️ Print
                            </button>
                          </div>

                          <div className="space-y-1.5">
                            {day.items.map((item, idx) => (
                              <div
                                key={item.name + idx}
                                className="flex items-center justify-between bg-white rounded-lg px-3 py-2"
                              >
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  <span className="text-xs text-gray-400 font-mono w-5 shrink-0">
                                    {idx + 1}.
                                  </span>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs font-medium text-gray-800 truncate">
                                      {item.name}
                                    </p>
                                    {item.name_bn && (
                                      <p className="text-xs text-gray-500 truncate">
                                        {item.name_bn}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <span className="text-xs font-bold text-purple-600 shrink-0 ml-2">
                                  {item.weight.toFixed(2)} kg
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
          }
