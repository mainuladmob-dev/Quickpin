"use client";

import { useState } from "react";
import jsPDF from "jspdf";
import type { OrderData } from "./OrderCard";

interface PrintLabelBulkProps {
  orders: OrderData[];
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

export default function PrintLabelBulk({
  orders,
  onClose,
}: PrintLabelBulkProps) {
  const [downloading, setDownloading] = useState(false);

  const drawBillForOrder = (
    pdf: jsPDF,
    order: OrderData,
    index: number,
    total: number
  ) => {
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
      `Order ${index + 1} of ${total}`,
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

    items.forEach((item, idx) => {
      if (y > 250) {
        // If we run out of space, we'll just stop (for simplicity)
        return;
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
      pdf.text(`${idx + 1}`, marginX + 2, y + 5);

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
  };

  const handleDownloadPDF = async () => {
    if (orders.length === 0) {
      alert("কোনো current order নেই");
      return;
    }

    setDownloading(true);

    try {
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      orders.forEach((order, index) => {
        if (index > 0) {
          pdf.addPage();
        }
        drawBillForOrder(pdf, order, index, orders.length);
      });

      const date = new Date().toISOString().split("T")[0];
      pdf.save(`bulk-bills-${date}.pdf`);
      onClose();
    } catch (err) {
      console.error("Bulk PDF generation failed:", err);
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
              🖨️ Bulk Print Current Orders
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              এক PDF-এ সব bills
            </p>
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
              📄 {orders.length}টা Current Order Print হবে
            </p>
            <p className="text-xs text-blue-600">
              এক PDF-এ সব bills থাকবে (এক page = এক order)। প্রিন্টে সব
              একসাথে বের হবে — তারপর কেটে আলাদা করতে পারবেন।
            </p>
          </div>

          {/* Order List Preview */}
          <div className="bg-gray-50 rounded-xl p-3 max-h-60 overflow-y-auto">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Orders to Print
            </p>
            <div className="space-y-1.5">
              {orders.map((order, idx) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between bg-white rounded-lg px-3 py-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs text-gray-400 font-mono w-5">
                      {idx + 1}.
                    </span>
                    <span className="text-xs font-mono font-semibold text-gray-800 truncate">
                      📦 {order.order_number}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-gray-700 shrink-0 ml-2">
                    ₹{order.total_amount.toLocaleString("en-IN")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-5 border-t border-gray-100 flex gap-2">
          <button
            onClick={onClose}
            disabled={downloading}
            className="flex-1 py-3 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleDownloadPDF}
            disabled={downloading || orders.length === 0}
            className="flex-1 py-3 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition disabled:opacity-50"
          >
            {downloading
              ? "Generating..."
              : `📥 Download ${orders.length} Bills`}
          </button>
        </div>
      </div>
    </div>
  );
           }
