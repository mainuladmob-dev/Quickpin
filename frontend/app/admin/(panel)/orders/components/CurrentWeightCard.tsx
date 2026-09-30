"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import jsPDF from "jspdf";

interface WeightItem {
  name: string;
  name_bn: string;
  weight: number;
}

export default function CurrentWeightCard() {
  const supabase = useMemo(() => createClient(), []);

  const [items, setItems] = useState<WeightItem[]>([]);
  const [orderCount, setOrderCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  const fetchWeight = useCallback(async () => {
    setLoading(true);

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
      console.error("Weight fetch error:", error);
      setLoading(false);
      return;
    }

    // ===== Calculate Product-wise Weight =====
    const productMap: Record<string, WeightItem> = {};

    orders.forEach((order: any) => {
      (order.order_items || []).forEach((item: any) => {
        const product = item.products;
        if (!product) return;

        const nameEn = product.name_en || "Product";
        const nameBn = product.name_bn || "";
        const itemWeight = (Number(item.qty) || 0) * (Number(product.weight) || 0);

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

    setItems(list);
    setOrderCount(orders.length);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchWeight();
  }, [fetchWeight]);

  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);

  const handlePrint = async () => {
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

      // ============ HEADER ============
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
      pdf.text(
        `Date: ${new Date().toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })}`,
        pageW - marginX,
        15,
        { align: "right" }
      );
      pdf.text(`Total Orders: ${orderCount}`, pageW - marginX, 23, {
        align: "right",
      });

      y = 42;

      // ============ SUMMARY ============
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(11);
      pdf.setFont("helvetica", "bold");
      pdf.text("SUMMARY", marginX, y);
      y += 2;

      pdf.setDrawColor(200, 200, 200);
      pdf.line(marginX, y, pageW - marginX, y);
      y += 6;

      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.text(`Current Orders: ${orderCount}`, marginX, y);
      y += 5;

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(12);
      pdf.setTextColor(37, 99, 235);
      pdf.text(`Total Weight: ${totalWeight.toFixed(2)} kg`, marginX, y);
      y += 10;

      pdf.setTextColor(0, 0, 0);

      // ============ PRODUCTS TABLE ============
      pdf.setFontSize(11);
      pdf.setFont("helvetica", "bold");
      pdf.text("PRODUCTS", marginX, y);
      y += 2;

      pdf.line(marginX, y, pageW - marginX, y);
      y += 4;

      // Table Header
      const contentW = pageW - marginX * 2;
      pdf.setFillColor(240, 240, 240);
      pdf.rect(marginX, y, contentW, 8, "F");

      pdf.setFontSize(10);
      pdf.setFont("helvetica", "bold");
      pdf.text("#", marginX + 3, y + 5.5);
      pdf.text("Product", marginX + 15, y + 5.5);
      pdf.text("Weight", pageW - marginX - 3, y + 5.5, { align: "right" });

      y += 8;

      // Table Rows
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

      // ============ TOTAL ============
      pdf.setFillColor(248, 250, 252);
      pdf.rect(pageW - marginX - 70, y, 70, 12, "F");

      pdf.setFontSize(11);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(37, 99, 235);
      pdf.text("TOTAL:", pageW - marginX - 65, y + 8);
      pdf.text(
        `${totalWeight.toFixed(2)} kg`,
        pageW - marginX - 5,
        y + 8,
        { align: "right" }
      );

      y += 20;

      // ============ FOOTER ============
      pdf.setFontSize(8);
      pdf.setTextColor(150, 150, 150);
      pdf.setFont("helvetica", "normal");
      pdf.text(
        "Quickpin ⚡ | quickpin.in",
        pageW / 2,
        285,
        { align: "center" }
      );

      // Save
      const date = new Date().toISOString().split("T")[0];
      pdf.save(`market-list-${date}.pdf`);
    } catch (err) {
      console.error("Print failed:", err);
      alert("PDF generate করতে সমস্যা হয়েছে");
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center justify-center py-6">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">⚖️</span>
          <h3 className="text-sm font-bold text-gray-900">
            Weight to Buy (Current Orders)
          </h3>
        </div>
        <div className="text-center py-6">
          <p className="text-3xl mb-2">📭</p>
          <p className="text-sm text-gray-500">
            কোনো Current Order নেই
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl border-2 border-blue-100 p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">⚖️</span>
          <div>
            <h3 className="text-sm font-bold text-gray-900">
              Weight to Buy
            </h3>
            <p className="text-xs text-gray-500">
              Current Orders ({orderCount})
            </p>
          </div>
        </div>

        <button
          onClick={handlePrint}
          disabled={downloading}
          className="text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg transition disabled:opacity-50 flex items-center gap-1.5"
        >
          {downloading ? (
            <>
              <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></span>
              <span>Printing...</span>
            </>
          ) : (
            <>
              <span>🖨️</span>
              <span>Print</span>
            </>
          )}
        </button>
      </div>

      {/* Total */}
      <div className="bg-white rounded-xl p-4 mb-3">
        <p className="text-xs text-gray-500 mb-1">Total Weight</p>
        <p className="text-3xl font-bold text-blue-600">
          {totalWeight.toFixed(2)} kg
        </p>
      </div>

      {/* Product Breakdown */}
      <div className="bg-white rounded-xl p-3 space-y-2">
        {items.map((item, index) => (
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
    </div>
  );
        }
