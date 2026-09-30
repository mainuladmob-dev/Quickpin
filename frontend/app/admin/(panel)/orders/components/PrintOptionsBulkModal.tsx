"use client";

import { useState } from "react";
import jsPDF from "jspdf";
import QRCode from "qrcode";
import type { OrderData } from "./OrderCard";

interface PrintOptionsBulkModalProps {
  orders: OrderData[];
  onClose: () => void;
}

type BulkPrintType = "stickers" | "invoices" | "both" | null;

// Calculate GST for item (inclusive price)
const calculateItemGST = (
  item: any,
  productGST: number
): { basePrice: number; gstAmount: number; total: number } => {
  const total = item.qty * item.price;
  const basePrice = total / (1 + productGST / 100);
  const gstAmount = total - basePrice;
  return { basePrice, gstAmount, total };
};

export default function PrintOptionsBulkModal({
  orders,
  onClose,
}: PrintOptionsBulkModalProps) {
  const [downloading, setDownloading] = useState(false);
  const [downloadingType, setDownloadingType] = useState<BulkPrintType>(null);

  // ============ GENERATE STICKERS PDF ============
  const generateStickersPDF = async () => {
    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: [75, 50],
    });

    for (let i = 0; i < orders.length; i++) {
      if (i > 0) pdf.addPage([75, 50], "landscape");

      const order = orders[i];
      const pageW = 75;
      const pageH = 50;
      const margin = 3;

      // Header
      pdf.setFillColor(37, 99, 235);
      pdf.rect(0, 0, pageW, 8, "F");

      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "bold");
      pdf.text("⚡ QUICKPIN", margin, 5.5);

      pdf.setFontSize(6);
      pdf.setFont("helvetica", "normal");
      pdf.text(`${i + 1}/${orders.length}`, pageW - margin, 5.5, {
        align: "right",
      });

      // Content
      let y = 12;
      pdf.setTextColor(0, 0, 0);

      pdf.setFontSize(9);
      pdf.setFont("helvetica", "bold");
      pdf.text(order.address?.full_name || "Customer", margin, y);
      y += 4.5;

      if (order.phone || order.address?.phone) {
        pdf.setFontSize(8);
        pdf.setFont("helvetica", "normal");
        pdf.text(`📞 ${order.phone || order.address?.phone}`, margin, y);
        y += 4;
      }

      if (order.delivery_type === "self_pickup") {
        pdf.setFontSize(7);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(234, 88, 12);
        pdf.text("SELF PICKUP", margin, y);
        pdf.setTextColor(0, 0, 0);
      } else if (order.address) {
        pdf.setFontSize(7);
        pdf.setFont("helvetica", "normal");

        const addr = order.address;
        const lines: string[] = [];
        if (addr.address_line1) lines.push(addr.address_line1);
        if (addr.address_line2) lines.push(addr.address_line2);
        if (addr.city) {
          const cityLine = `${addr.city}${
            addr.state ? ", " + addr.state : ""
          }${addr.pincode ? " - " + addr.pincode : ""}`;
          lines.push(cityLine);
        }

        lines.forEach((line) => {
          if (y > pageH - 15) return;
          const wrapped = pdf.splitTextToSize(line, pageW - margin * 2);
          wrapped.forEach((w: string) => {
            if (y > pageH - 15) return;
            pdf.text(w, margin, y);
            y += 3;
          });
        });
      }

      // QR Code
      const qrData = JSON.stringify({
        order_id: order.order_number,
        name: order.address?.full_name || "",
        phone: order.phone || order.address?.phone || "",
        address: order.address
          ? [
              order.address.address_line1,
              order.address.address_line2,
              order.address.city,
              order.address.state,
              order.address.pincode,
            ]
              .filter(Boolean)
              .join(", ")
          : "",
        type: `${order.payment_type || ""} + ${
          order.delivery_type === "home_delivery" ? "Home" : "Self"
        }`,
        total: order.total_amount,
        date: new Date(order.created_at).toLocaleDateString("en-IN"),
        products: (order.order_items || []).map((item) => ({
          name: item.products?.name_en || "Product",
          qty: item.qty,
        })),
      });

      try {
        const qrDataUrl = await QRCode.toDataURL(qrData, {
          width: 200,
          margin: 1,
          errorCorrectionLevel: "M",
        });

        const qrSize = 22;
        pdf.addImage(
          qrDataUrl,
          "PNG",
          pageW - margin - qrSize,
          pageH - margin - qrSize,
          qrSize,
          qrSize
        );
      } catch (e) {
        console.error("QR error:", e);
      }

      // Footer
      pdf.setFontSize(5);
      pdf.setTextColor(150, 150, 150);
      pdf.text(`${order.order_number} • quickpin.in`, margin, pageH - 2);
    }

    const date = new Date().toISOString().split("T")[0];
    pdf.save(`stickers-${date}.pdf`);
  };

  // ============ GENERATE INVOICES PDF ============
  const generateInvoicesPDF = async () => {
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pageW = 210;
    const marginX = 15;
    const marginY = 15;
    const contentW = pageW - marginX * 2;

    for (let i = 0; i < orders.length; i++) {
      if (i > 0) pdf.addPage();

      const order = orders[i];
      let y = marginY;

      // ============ HEADER ============
      pdf.setFillColor(37, 99, 235);
      pdf.rect(0, 0, pageW, 25, "F");

      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(20);
      pdf.setFont("helvetica", "bold");
      pdf.text("Quickpin", marginX, 12);

      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.text("Tax Invoice", marginX, 19);

      pdf.setFontSize(9);
      pdf.text(
        `Order ${i + 1} of ${orders.length}`,
        pageW - marginX,
        10,
        { align: "right" }
      );
      pdf.text(
        `Date: ${new Date(order.created_at).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })}`,
        pageW - marginX,
        16,
        { align: "right" }
      );
      pdf.text(`Order: ${order.order_number}`, pageW - marginX, 22, {
        align: "right",
      });

      y = 35;

      // ============ BILL TO ============
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(11);
      pdf.setFont("helvetica", "bold");
      pdf.text("BILL TO", marginX, y);
      y += 2;

      pdf.setDrawColor(200, 200, 200);
      pdf.line(marginX, y, pageW - marginX, y);
      y += 6;

      pdf.setFontSize(9);
      pdf.setFont("helvetica", "normal");

      const leftX = marginX;
      const rightX = marginX + contentW / 2 + 5;

      let leftY = y;
      pdf.setFont("helvetica", "bold");
      pdf.text("Customer:", leftX, leftY);
      pdf.setFont("helvetica", "normal");
      pdf.text(order.address?.full_name || "N/A", leftX + 22, leftY);
      leftY += 5;

      pdf.setFont("helvetica", "bold");
      pdf.text("Phone:", leftX, leftY);
      pdf.setFont("helvetica", "normal");
      pdf.text(order.phone || order.address?.phone || "N/A", leftX + 22, leftY);
      leftY += 5;

      let rightY = y;
      pdf.setFont("helvetica", "bold");
      pdf.text("Address:", rightX, rightY);
      rightY += 5;
      pdf.setFont("helvetica", "normal");

      if (order.delivery_type === "self_pickup") {
        pdf.text("SELF PICKUP", rightX, rightY);
      } else if (order.address) {
        const addr = order.address;
        const lines = [
          addr.address_line1,
          addr.address_line2,
          `${addr.city}, ${addr.state}`,
          `PIN: ${addr.pincode}`,
        ].filter(Boolean);

        lines.forEach((line) => {
          if (line) {
            pdf.text(line, rightX, rightY);
            rightY += 5;
          }
        });
      }

      y = Math.max(leftY, rightY) + 6;

      // ============ PRODUCTS ============
      pdf.setFontSize(11);
      pdf.setFont("helvetica", "bold");
      pdf.text("PRODUCTS", marginX, y);
      y += 2;

      pdf.line(marginX, y, pageW - marginX, y);
      y += 4;

      pdf.setFillColor(240, 240, 240);
      pdf.rect(marginX, y, contentW, 8, "F");

      pdf.setFontSize(9);
      pdf.setFont("helvetica", "bold");
      pdf.text("#", marginX + 2, y + 5.5);
      pdf.text("Product", marginX + 10, y + 5.5);
      pdf.text("Qty", marginX + 75, y + 5.5);
      pdf.text("Weight", marginX + 90, y + 5.5);
      pdf.text("Price", marginX + 115, y + 5.5);
      pdf.text("GST%", marginX + 140, y + 5.5);
      pdf.text("Total", pageW - marginX - 2, y + 5.5, { align: "right" });

      y += 8;

      pdf.setFont("helvetica", "normal");
      const items = order.order_items || [];

      let productBaseTotal = 0;
      let productGSTTotal = 0;

      items.forEach((item: any, index: number) => {
        const name = item.products?.name_en || "Product";
        const qty = item.qty;
        const weight = item.products?.weight
          ? (item.qty * item.products.weight).toFixed(2) + " kg"
          : "-";
        const price = `Rs.${item.price}`;

        const productGST = Number(item.products?.gst_percentage) || 0;
        const { basePrice, gstAmount, total } = calculateItemGST(
          item,
          productGST
        );

        productBaseTotal += basePrice;
        productGSTTotal += gstAmount;

        pdf.setTextColor(0, 0, 0);
        pdf.setFontSize(9);
        pdf.text(`${index + 1}`, marginX + 2, y + 5);

        const maxNameLen = 30;
        const displayName =
          name.length > maxNameLen
            ? name.substring(0, maxNameLen) + "..."
            : name;
        pdf.text(displayName, marginX + 10, y + 5);

        pdf.text(`${qty}`, marginX + 75, y + 5);
        pdf.text(weight, marginX + 90, y + 5);
        pdf.text(price, marginX + 115, y + 5);
        pdf.text(`${productGST}%`, marginX + 140, y + 5);
        pdf.text(`Rs.${total.toFixed(2)}`, pageW - marginX - 2, y + 5, {
          align: "right",
        });

        y += 7;

        pdf.setDrawColor(235, 235, 235);
        pdf.line(marginX, y, pageW - marginX, y);
      });

      y += 4;

      // ============ TOTALS ============
      const deliveryCharge = Number(order.delivery_charge) || 0;
      const deliveryGSTRate = 18;
      const deliveryGST =
        deliveryCharge > 0 ? (deliveryCharge * deliveryGSTRate) / 100 : 0;

      const boxW = 85;
      const boxX = pageW - marginX - boxW;
      const boxH = 50;

      pdf.setFillColor(248, 250, 252);
      pdf.rect(boxX, y, boxW, boxH, "F");

      pdf.setFontSize(9);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(80, 80, 80);

      pdf.text("Product Amount:", boxX + 4, y + 7);
      pdf.setTextColor(0, 0, 0);
      pdf.setFont("helvetica", "bold");
      pdf.text(
        `Rs.${productBaseTotal.toFixed(2)}`,
        boxX + boxW - 4,
        y + 7,
        { align: "right" }
      );

      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(80, 80, 80);
      pdf.text("Product GST:", boxX + 4, y + 14);
      pdf.setTextColor(0, 0, 0);
      pdf.setFont("helvetica", "bold");
      pdf.text(
        `Rs.${productGSTTotal.toFixed(2)}`,
        boxX + boxW - 4,
        y + 14,
        { align: "right" }
      );

      if (deliveryCharge > 0) {
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(80, 80, 80);
        pdf.text("Delivery:", boxX + 4, y + 21);
        pdf.setTextColor(0, 0, 0);
        pdf.setFont("helvetica", "bold");
        pdf.text(
          `Rs.${deliveryCharge.toFixed(2)}`,
          boxX + boxW - 4,
          y + 21,
          { align: "right" }
        );

        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(80, 80, 80);
        pdf.text("Delivery GST (18%):", boxX + 4, y + 28);
        pdf.setTextColor(0, 0, 0);
        pdf.setFont("helvetica", "bold");
        pdf.text(
          `Rs.${deliveryGST.toFixed(2)}`,
          boxX + boxW - 4,
          y + 28,
          { align: "right" }
        );
      }

      const totalGST = productGSTTotal + deliveryGST;
      const grandTotal =
        productBaseTotal + productGSTTotal + deliveryCharge + deliveryGST;

      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(80, 80, 80);
      pdf.text("Total GST:", boxX + 4, y + 35);
      pdf.setTextColor(234, 88, 12);
      pdf.setFont("helvetica", "bold");
      pdf.text(`Rs.${totalGST.toFixed(2)}`, boxX + boxW - 4, y + 35, {
        align: "right",
      });

      pdf.setDrawColor(200, 200, 200);
      pdf.line(boxX + 4, y + 38, boxX + boxW - 4, y + 38);

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(10);
      pdf.setTextColor(37, 99, 235);
      pdf.text("Grand Total:", boxX + 4, y + 45);
      pdf.text(`Rs.${grandTotal.toFixed(2)}`, boxX + boxW - 4, y + 45, {
        align: "right",
      });

      // Footer
      pdf.setFontSize(7);
      pdf.setTextColor(150, 150, 150);
      pdf.setFont("helvetica", "normal");
      pdf.text(
        "Thank you for shopping with Quickpin ⚡ | quickpin.in",
        pageW / 2,
        285,
        { align: "center" }
      );
    }

    const date = new Date().toISOString().split("T")[0];
    pdf.save(`invoices-${date}.pdf`);
  };

  // ============ HANDLE PRINT ============
  const handlePrint = async (type: BulkPrintType) => {
    if (!type) return;

    setDownloading(true);
    setDownloadingType(type);

    try {
      if (type === "stickers") {
        await generateStickersPDF();
      } else if (type === "invoices") {
        await generateInvoicesPDF();
      } else if (type === "both") {
        await generateStickersPDF();
        // Small delay before second download
        await new Promise((resolve) => setTimeout(resolve, 500));
        await generateInvoicesPDF();
      }

      onClose();
    } catch (err) {
      console.error("Bulk print failed:", err);
      alert("PDF generate করতে সমস্যা হয়েছে");
    } finally {
      setDownloading(false);
      setDownloadingType(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={downloading ? undefined : onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              🖨️ Bulk Print
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {orders.length} Current Orders
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={downloading}
            className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500 text-xl disabled:opacity-50"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-3">
          <p className="text-sm text-gray-600 mb-4">
            কী print করতে চান select করুন:
          </p>

          {/* All Stickers */}
          <button
            onClick={() => handlePrint("stickers")}
            disabled={downloading}
            className="w-full bg-white hover:bg-blue-50 border-2 border-gray-200 hover:border-blue-400 rounded-xl p-4 transition text-left group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-blue-100 group-hover:bg-blue-200 flex items-center justify-center text-2xl shrink-0 transition">
                📌
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-gray-900">
                  All Address Stickers
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {orders.length} stickers (75×50mm)
                </p>
              </div>
              {downloadingType === "stickers" ? (
                <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></span>
              ) : (
                <span className="text-gray-300 group-hover:text-blue-600 text-xl transition">
                  →
                </span>
              )}
            </div>
          </button>

          {/* All Invoices */}
          <button
            onClick={() => handlePrint("invoices")}
            disabled={downloading}
            className="w-full bg-white hover:bg-green-50 border-2 border-gray-200 hover:border-green-400 rounded-xl p-4 transition text-left group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-green-100 group-hover:bg-green-200 flex items-center justify-center text-2xl shrink-0 transition">
                📋
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-gray-900">
                  All Invoices
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {orders.length} A4 pages (with GST)
                </p>
              </div>
              {downloadingType === "invoices" ? (
                <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-600"></span>
              ) : (
                <span className="text-gray-300 group-hover:text-green-600 text-xl transition">
                  →
                </span>
              )}
            </div>
          </button>

          {/* Both */}
          <button
            onClick={() => handlePrint("both")}
            disabled={downloading}
            className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 rounded-xl p-4 transition text-left group disabled:opacity-50 disabled:cursor-not-allowed text-white"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-2xl shrink-0">
                📦
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold">
                  Both (Stickers + Invoices)
                </p>
                <p className="text-xs text-white/80 mt-0.5">
                  {orders.length * 2} pages total
                </p>
              </div>
              {downloadingType === "both" ? (
                <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></span>
              ) : (
                <span className="text-white/70 text-xl group-hover:translate-x-1 transition">
                  →
                </span>
              )}
            </div>
          </button>

          {downloading && (
            <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
              <p className="text-xs text-blue-700">
                ⏳ PDF generate হচ্ছে... অপেক্ষা করুন
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-gray-100">
          <button
            onClick={onClose}
            disabled={downloading}
            className="w-full py-3 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
      }
