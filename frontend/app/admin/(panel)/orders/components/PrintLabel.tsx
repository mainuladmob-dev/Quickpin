"use client";

import { generateLabelPDF } from "@/lib/label-generator";
import type { OrderData } from "./OrderCard";

interface PrintLabelProps {
  order: OrderData;
  onClose: () => void;
}

export default function PrintLabel({ order, onClose }: PrintLabelProps) {
  const handleDownloadPDF = async () => {
    try {
      const labelOrder = {
        order_number: order.order_number,
        created_at: order.created_at,
        total_amount: order.total_amount,
        delivery_type: order.delivery_type || "home_delivery",
        delivery_address_snapshot: order.address || null,
        profiles: order.phone ? { name: null, email: null, phone: order.phone } : null,
        pickup_point: null,
        paid_amount: order.paid_amount,
        payment_type: order.remaining_amount > 0 ? "partial" : "full",
        partial_payment_amount: order.paid_amount,
      };

      await generateLabelPDF([labelOrder], `label-${order.order_number}.pdf`);
      onClose();
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("PDF generate করতে সমস্যা হয়েছে");
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
            <h2 className="text-lg font-bold text-gray-900">🖨️ Print Label</h2>
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
              📄 PDF Label Ready
            </p>
            <p className="text-xs text-blue-600">
              A4 page-এ ৪টা label থাকবে (2×2 grid)। QR code, address,
              amount সব থাকবে।
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
              <span className="text-gray-500">Amount</span>
              <span className="font-medium text-gray-800">
                ₹{order.total_amount.toLocaleString("en-IN")}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Type</span>
              <span className="font-medium text-gray-800 capitalize">
                {order.delivery_type || "N/A"}
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
            className="flex-1 py-3 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition"
          >
            📥 Download PDF
          </button>
        </div>
      </div>
    </div>
  );
}
