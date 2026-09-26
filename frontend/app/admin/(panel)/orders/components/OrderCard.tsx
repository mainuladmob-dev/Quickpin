"use client";

import { useState } from "react";

export interface OrderData {
  id: string;
  order_number: string;
  phone: string | null;
  upi_id: string | null;
  payment_status: string;
  order_status: string;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  refund_amount: number;
  delivery_type: string | null;
  payment_screenshot_url: string | null;
  created_at: string;
  order_items?: { id: string; qty: number; price: number; products?: { name_en: string } | null }[];
  address?: { full_name: string; phone: string; address_line1: string; city: string; state: string; pincode: string } | null;
}

interface OrderCardProps {
  order: OrderData;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onChangeStatus: (order: OrderData) => void;
  onRefund: (order: OrderData) => void;
  onPrint: (order: OrderData) => void;
  onDelete: (order: OrderData) => void;
  onViewScreenshot: (url: string) => void;
}

const getOrderTypeLabel = (type: string | null) => {
  if (!type) return "N/A";
  const map: Record<string, string> = {
    full_home: "Full + Home",
    full_self: "Full + Self",
    advance_home: "Advance + Home",
    advance_self: "Advance + Self",
  };
  return map[type] || type;
};

export default function OrderCard({
  order,
  selected,
  onToggleSelect,
  onChangeStatus,
  onRefund,
  onPrint,
  onDelete,
  onViewScreenshot,
}: OrderCardProps) {
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    } catch (err) {
      console.error(err);
    }
  };

  const isPending = order.order_status === "pending";
  const isCurrent = order.order_status === "current";
  const isOFD = order.order_status === "out_for_delivery";
  const isDelivered = order.order_status === "delivered";
  const isRefund = order.order_status === "refund";
  const isSpam = order.order_status === "spam";

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div
      className={`bg-white rounded-2xl shadow-sm border p-4 transition ${
        selected
          ? "border-blue-400 ring-2 ring-blue-100"
          : isRefund
          ? "border-yellow-200 bg-yellow-50/30"
          : "border-gray-100"
      }`}
    >
      {/* Header Row */}
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggleSelect(order.id)}
          className="mt-1 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
        />

        <div className="flex-1 min-w-0">
          {/* Order ID + Phone */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <button
              onClick={() => copyToClipboard(order.order_number, "order")}
              className="inline-flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 px-2.5 py-1 rounded-lg transition"
            >
              <span className="text-xs font-mono font-semibold text-gray-800">
                📦 {order.order_number}
              </span>
              <span className="text-xs">
                {copied === "order" ? "✅" : "📋"}
              </span>
            </button>

            {order.phone && (
              <button
                onClick={() => copyToClipboard(order.phone!, "phone")}
                className="inline-flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 px-2.5 py-1 rounded-lg transition"
              >
                <span className="text-xs font-mono font-semibold text-gray-800">
                  📞 {order.phone}
                </span>
                <span className="text-xs">
                  {copied === "phone" ? "✅" : "📋"}
                </span>
              </button>
            )}
          </div>

          {/* Payment Info */}
          {isPending && (
            <div className="space-y-2 mb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded">
                  ❌ Payment Failed
                </span>
                {order.payment_screenshot_url && (
                  <button
                    onClick={() => onViewScreenshot(order.payment_screenshot_url!)}
                    className="text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded transition"
                  >
                    📸 View Screenshot
                  </button>
                )}
              </div>
            </div>
          )}

          {(isCurrent || isOFD || isDelivered || isRefund) && order.upi_id && (
            <div className="mb-3">
              <button
                onClick={() => copyToClipboard(order.upi_id!, "upi")}
                className="inline-flex items-center gap-1.5 bg-green-50 hover:bg-green-100 px-2.5 py-1 rounded-lg transition"
              >
                <span className="text-xs font-mono font-semibold text-green-700">
                  🔗 {order.upi_id}
                </span>
                <span className="text-xs">
                  {copied === "upi" ? "✅" : "📋"}
                </span>
              </button>
            </div>
          )}

          {isRefund && (
            <div className="mb-3 bg-yellow-50 border border-yellow-200 rounded-lg p-2.5">
              <p className="text-xs font-semibold text-yellow-800">
                ↩️ Refunded: ₹{order.refund_amount.toLocaleString("en-IN")}
              </p>
            </div>
          )}

          {/* Amount + Due + Type */}
          <div className="grid grid-cols-3 gap-2 mb-3 text-xs">
            <div>
              <p className="text-gray-400 mb-0.5">Amount</p>
              <p className="font-bold text-gray-800">
                ₹{order.total_amount.toLocaleString("en-IN")}
              </p>
            </div>
            <div>
              <p className="text-gray-400 mb-0.5">Due</p>
              <p
                className={`font-bold ${
                  order.remaining_amount > 0 ? "text-red-600" : "text-green-600"
                }`}
              >
                ₹{order.remaining_amount.toLocaleString("en-IN")}
              </p>
            </div>
            <div>
              <p className="text-gray-400 mb-0.5">Type</p>
              <p className="font-semibold text-gray-700">
                {getOrderTypeLabel(order.delivery_type)}
              </p>
            </div>
          </div>

          {/* Date */}
          <p className="text-xs text-gray-400 mb-3">
            📅 {formatDate(order.created_at)}
          </p>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {isPending && (
              <>
                <button
                  onClick={() => onChangeStatus(order)}
                  className="text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition"
                >
                  ✅ Verify → Current
                </button>
                <button
                  onClick={() => onChangeStatus(order)}
                  className="text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg transition"
                >
                  🚫 Spam
                </button>
              </>
            )}

            {isCurrent && (
              <>
                <button
                  onClick={() => onChangeStatus(order)}
                  className="text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition"
                >
                  🚚 Out for Delivery
                </button>
                <button
                  onClick={() => onPrint(order)}
                  className="text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg transition"
                >
                  🖨️ Print
                </button>
              </>
            )}

            {isOFD && (
              <>
                <button
                  onClick={() => onChangeStatus(order)}
                  className="text-xs font-semibold bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg transition"
                >
                  ✅ Mark Delivered
                </button>
                <button
                  onClick={() => onPrint(order)}
                  className="text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg transition"
                >
                  🖨️ Print
                </button>
              </>
            )}

            {isDelivered && (
              <>
                <button
                  onClick={() => onRefund(order)}
                  className="text-xs font-semibold bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1.5 rounded-lg transition"
                >
                  ↩️ Refund
                </button>
                <button
                  onClick={() => onPrint(order)}
                  className="text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg transition"
                >
                  🖨️ Print
                </button>
              </>
            )}

            {isRefund && (
              <button
                onClick={() => onPrint(order)}
                className="text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg transition"
              >
                🖨️ Print
              </button>
            )}

            {isSpam && (
              <>
                <button
                  onClick={() => onChangeStatus(order)}
                  className="text-xs font-semibold bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 py-1.5 rounded-lg transition"
                >
                  ♻️ Restore
                </button>
                <button
                  onClick={() => onDelete(order)}
                  className="text-xs font-semibold bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg transition"
                >
                  🗑️ Delete
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
    }
