"use client";

import { useState } from "react";
import jsPDF from "jspdf";
import QRCode from "qrcode";
import type { OrderData } from "./OrderCard";

interface AddressStickerProps {
  order: OrderData;
  onClose: () => void;
}

export default function AddressSticker({
  order,
  onClose,
}: AddressStickerProps) {
  const [downloading, setDownloading] = useState(false);

  const handleDownloadPDF = async () => {
    setDownloading(true);

    try {
      // Sticker size: 75mm × 50mm (compact)
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: [75, 50],
      });

      const pageW = 75;
      const pageH = 50;
      const margin = 3;

      // ============ HEADER ============
      pdf.setFillColor(37, 99, 235);
      pdf.rect(0, 0, pageW, 8, "F");

      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "bold");
      pdf.text("⚡ QUICKPIN", margin, 5.5);

      pdf.setFontSize(6);
      pdf.setFont("helvetica", "normal");
      pdf.text(`Order: ${order.order_number}`, pageW - margin, 5.5, {
        align: "right",
      });

      // ============ MAIN CONTENT ============
      let y = 12;

      pdf.setTextColor(0, 0, 0);

      // Customer Name
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "bold");
      const customerName =
        order.address?.full_name || "Customer";
      pdf.text(customerName, margin, y);
      y += 4.5;

      // Phone
      if (order.phone || order.address?.phone) {
        pdf.setFontSize(8);
        pdf.setFont("helvetica", "normal");
        pdf.text(
          `📞 ${order.phone || order.address?.phone}`,
          margin,
          y
        );
        y += 4;
      }

      // Address
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
          const cityLine = `${addr.city}${addr.state ? ", " + addr.state : ""}${
            addr.pincode ? " - " + addr.pincode : ""
          }`;
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

      // ============ QR CODE ============
      // QR content: All customer info
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

        // QR on right side
        const qrSize = 22;
        const qrX = pageW - margin - qrSize;
        const qrY = pageH - margin - qrSize;

        pdf.addImage(qrDataUrl, "PNG", qrX, qrY, qrSize, qrSize);
      } catch (e) {
        console.error("QR error:", e);
      }

      // ============ FOOTER ============
      pdf.setFontSize(5);
      pdf.setTextColor(150, 150, 150);
      pdf.text("quickpin.in", margin, pageH - 2);

      // Save
      pdf.save(`sticker-${order.order_number}.pdf`);
      onClose();
    } catch (err) {
      console.error("Sticker PDF generation failed:", err);
      alert("Sticker generate করতে সমস্যা হয়েছে");
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
              📌 Address Sticker
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {order.order_number}
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
              📌 Small Sticker PDF
            </p>
            <p className="text-xs text-blue-600">
              75mm × 50mm sticker — শুধু Delivery Info। QR code-এ সব
              customer details থাকবে।
            </p>
          </div>

          {/* Preview */}
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Preview
            </p>
            <div className="bg-white rounded-lg border-2 border-gray-200 p-3">
              <div className="flex items-start justify-between mb-2">
                <span className="text-xs font-bold text-blue-600">
                  ⚡ QUICKPIN
                </span>
                <span className="text-xs text-gray-500">
                  {order.order_number}
                </span>
              </div>
              <p className="text-sm font-bold text-gray-900">
                {order.address?.full_name || "Customer"}
              </p>
              {order.phone && (
                <p className="text-xs text-gray-600">
                  📞 {order.phone}
                </p>
              )}
              {order.delivery_type === "self_pickup" ? (
                <p className="text-xs font-semibold text-amber-600 mt-1">
                  SELF PICKUP
                </p>
              ) : (
                order.address && (
                  <p className="text-xs text-gray-600 mt-1 leading-tight">
                    📍{" "}
                    {[
                      order.address.address_line1,
                      order.address.city,
                      order.address.pincode,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                )
              )}
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
            disabled={downloading}
            className="flex-1 py-3 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition disabled:opacity-50"
          >
            {downloading ? "Generating..." : "📥 Download Sticker"}
          </button>
        </div>
      </div>
    </div>
  );
          }
