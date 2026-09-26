"use client";

import { useState } from "react";
import jsPDF from "jspdf";
import type { OrderData } from "./OrderCard";

interface PrintLabelProps {
  order: OrderData;
  onClose: () => void;
}

const getOrderTypeLabel = (
  paymentType: string | null,
  deliveryType: string | null
) => {
  const payment =
    paymentType === "full"
      ? "Full"
      : paymentType === "advance"
      ? "Advance"
      : "";
  const delivery =
    deliveryType === "home_delivery"
      ? "Home"
      : deliveryType === "self_pickup"
      ? "Self"
      : "";

  if (payment && delivery) return `${payment} + ${delivery}`;
  return payment || delivery || "N/A";
};

export default function PrintLabel({ order, onClose }: PrintLabelProps) {
  const [downloading, setDownloading] = useState(false);

  const handleDownloadPDF = async () => {
    setDownloading(true);

    try {
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageW = 210;
      const marginX = 15;
      const marginY = 15;
      const contentW = pageW - marginX * 2;
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
      pdf.text("Order Invoice", marginX, 19);

      pdf.setFontSize(9);
      pdf.text(
        `Date: ${new Date(order.created_at).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })}`,
        pageW - marginX,
        12,
        { align: "right" }
      );
      pdf.text(
        `Order: ${order.order_number}`,
        pageW - marginX,
        19,
        { align: "right" }
      );

      y = 35;

      // ============ CUSTOMER + DELIVERY INFO ============
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(11);
      pdf.setFont("helvetica", "bold");
      pdf.text("CUSTOMER & DELIVERY INFORMATION", marginX, y);
      y += 2;

      pdf.setDrawColor(200, 200, 200);
      pdf.line(marginX, y, pageW - marginX, y);
      y += 6;

      pdf.setFontSize(9);
      pdf.setFont("helvetica", "normal");

      const leftX = marginX;
      const rightX = marginX + contentW / 2 + 5;

      // Left column
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

      pdf.setFont("helvetica", "bold");
      pdf.text("Type:", leftX, leftY);
      pdf.setFont("helvetica", "normal");
      pdf.text(
        getOrderTypeLabel(order.payment_type, order.delivery_type),
        leftX + 22,
        leftY
      );

      // Right column — address
      let rightY = y;
      pdf.setFont("helvetica", "bold");
      pdf.text("Delivery Address:", rightX, rightY);
      rightY += 5;
      pdf.setFont("helvetica", "normal");

      if (order.delivery_type === "self_pickup") {
        pdf.text("SELF PICKUP", rightX, rightY);
        rightY += 5;
        pdf.setFontSize(8);
        pdf.setTextColor(120, 120, 120);
        pdf.text("Customer will pick up from store", rightX, rightY);
        pdf.setTextColor(0, 0, 0);
        pdf.setFontSize(9);
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
      } else {
        pdf.text("No address", rightX, rightY);
      }

      y = Math.max(leftY, rightY) + 6;

      // ============ PRODUCTS TABLE ============
      pdf.setFontSize(11);
      pdf.setFont("helvetica", "bold");
      pdf.text("PRODUCTS", marginX, y);
      y += 2;

      pdf.setDrawColor(200, 200, 200);
      pdf.line(marginX, y, pageW - marginX, y);
      y += 4;

      // Table header
      pdf.setFillColor(240, 240, 240);
      pdf.rect(marginX, y, contentW, 8, "F");

      pdf.setFontSize(9);
      pdf.setFont("helvetica", "bold");
      pdf.text("#", marginX + 2, y + 5.5);
      pdf.text("Product", marginX + 10, y + 5.5);
      pdf.text("Qty", marginX + 90, y + 5.5);
      pdf.text("Weight", marginX + 110, y + 5.5);
      pdf.text("Price", marginX + 135, y + 5.5);
      pdf.text("Total", pageW - marginX - 2, y + 5.5, { align: "right" });

      y += 8;

      // Table rows
      pdf.setFont("helvetica", "normal");
      const items = order.order_items || [];

      items.forEach((item, index) => {
        if (y > 240) {
          pdf.addPage();
          y = marginY;
        }

        const name = item.products?.name_en || "Product";
        const qty = item.qty;
        const weight = item.products?.weight
          ? (item.qty * item.products.weight).toFixed(2) + " kg"
          : "-";
        const price = `Rs.${item.price}`;
        const total = `Rs.${(item.qty * item.price).toLocaleString("en-IN")}`;

        pdf.setTextColor(0, 0, 0);
        pdf.setFontSize(9);
        pdf.text(`${index + 1}`, marginX + 2, y + 5);

        // Truncate long names
        const maxNameLen = 38;
        const displayName =
          name.length > maxNameLen
            ? name.substring(0, maxNameLen) + "..."
            : name;
        pdf.text(displayName, marginX + 10, y + 5);

        pdf.text(`${qty}`, marginX + 90, y + 5);
        pdf.text(weight, marginX + 110, y + 5);
        pdf.text(price, marginX + 135, y + 5);
        pdf.text(total, pageW - marginX - 2, y + 5, { align: "right" });

        y += 7;

        // Row separator
        pdf.setDrawColor(235, 235, 235);
        pdf.line(marginX, y, pageW - marginX, y);
      });

      y += 4;

      // ============ TOTALS BOX ============
      const boxW = 75;
      const boxX = pageW - marginX - boxW;

      pdf.setFillColor(248, 250, 252);
      pdf.rect(boxX, y, boxW, 32, "F");

      pdf.setFontSize(9);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(80, 80, 80);

      pdf.text("Total Amount:", boxX + 4, y + 7);
      pdf.setTextColor(0, 0, 0);
      pdf.setFont("helvetica", "bold");
      pdf.text(
        `Rs.${order.total_amount.toLocaleString("en-IN")}`,
        boxX + boxW - 4,
        y + 7,
        { align: "right" }
      );

      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(80, 80, 80);
      pdf.text("Paid:", boxX + 4, y + 14);
      pdf.setTextColor(22, 163, 74);
      pdf.setFont("helvetica", "bold");
      pdf.text(
        `Rs.${order.paid_amount.toLocaleString("en-IN")}`,
        boxX + boxW - 4,
        y + 14,
        { align: "right" }
      );

      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(80, 80, 80);
      pdf.text("Due:", boxX + 4, y + 21);
      if (order.remaining_amount > 0) {
        pdf.setTextColor(220, 38, 38);
      } else {
        pdf.setTextColor(22, 163, 74);
      }
      pdf.setFont("helvetica", "bold");
      pdf.text(
        `Rs.${order.remaining_amount.toLocaleString("en-IN")}`,
        boxX + boxW - 4,
        y + 21,
        { align: "right" }
      );

      // Refund
      if (order.refund_amount > 0) {
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(234, 88, 12);
        pdf.text("Refunded:", boxX + 4, y + 28);
        pdf.setFont("helvetica", "bold");
        pdf.text(
          `Rs.${order.refund_amount.toLocaleString("en-IN")}`,
          boxX + boxW - 4,
          y + 28,
          { align: "right" }
        );
      }

      y += 38;

      // ============ UPI INFO ============
      if (order.upi_id) {
        pdf.setFontSize(9);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(0, 0, 0);
        pdf.text("Payment UPI:", marginX, y);
        pdf.setFont("helvetica", "normal");
        pdf.text(order.upi_id, marginX + 25, y);
        y += 6;
      }

      // ============ FOOTER ============
      pdf.setFontSize(8);
      pdf.setTextColor(150, 150, 150);
      pdf.setFont("helvetica", "normal");
      pdf.text(
        "Thank you for shopping with Quickpin ⚡",
        pageW / 2,
        285,
        { align: "center" }
      );

      // Save
      pdf.save(`bill-${order.order_number}.pdf`);
      onClose();
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("PDF generate করতে সমস্যা হয়েছে");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              🖨️ Print Full Bill
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">{order.order_number}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500 text-xl"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
            <p className="text-sm text-blue-800 font-medium mb-2">
              📄 Full Bill PDF Ready
            </p>
            <p className="text-xs text-blue-600">
              A4 page-এ সম্পূর্ণ bill থাকবে — Customer info, Address, Product
              list (নাম + ওজন + দাম), Total, Paid, Due, Refund, UPI।
            </p>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Order</span>
              <span className="font-medium text-gray-800">
                {order.order_number}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Items</span>
              <span className="font-medium text-gray-800">
                {order.order_items?.length || 0} products
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Total</span>
              <span className="font-medium text-gray-800">
                ₹{order.total_amount.toLocaleString("en-IN")}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Type</span>
              <span className="font-medium text-gray-800">
                {getOrderTypeLabel(order.payment_type, order.delivery_type)}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-gray-100 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-3 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition"
          >
            Cancel
          </button>
          <button
            onClick={handleDownloadPDF}
            disabled={downloading}
            className="flex-1 py-3 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition disabled:opacity-50"
          >
            {downloading ? "Generating..." : "📥 Download Bill"}
          </button>
        </div>
      </div>
    </div>
  );
}
