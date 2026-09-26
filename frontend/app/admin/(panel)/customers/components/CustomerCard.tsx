"use client";

import { useState } from "react";

export interface CustomerData {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  upi_id: string | null;
  address: {
    full_name: string;
    phone: string;
    address_line1: string;
    address_line2?: string | null;
    city: string;
    state: string;
    pincode: string;
  } | null;
  total_orders: number;
  total_spent: number;
  last_order_date: string | null;
  order_history: {
    id: string;
    order_number: string;
    total_amount: number;
    order_status: string;
    created_at: string;
  }[];
}

interface CustomerCardProps {
  customer: CustomerData;
}

const statusIcon = (status: string) => {
  const map: Record<string, string> = {
    pending: "⏳",
    current: "🔵",
    out_for_delivery: "🚚",
    delivered: "✅",
    refund: "↩️",
    spam: "🚫",
  };
  return map[status] || "📦";
};

const statusLabel = (status: string) => {
  const map: Record<string, string> = {
    pending: "Pending",
    current: "Current",
    out_for_delivery: "Out for Delivery",
    delivered: "Delivered",
    refund: "Refund",
    spam: "Spam",
  };
  return map[status] || status;
};

export default function CustomerCard({ customer }: CustomerCardProps) {
  const [expanded, setExpanded] = useState(false);
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

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const initial = (customer.name || "?").charAt(0).toUpperCase();

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Main Card */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg shrink-0">
            {initial}
          </div>

          <div className="flex-1 min-w-0">
            {/* Name */}
            <h3 className="text-base font-bold text-gray-900 truncate">
              {customer.name || "Unknown Customer"}
            </h3>

            {/* Phone + UPI */}
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {customer.phone && (
                <button
                  onClick={() => copyToClipboard(customer.phone!, "phone")}
                  className="inline-flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 px-2.5 py-1 rounded-lg transition"
                >
                  <span className="text-xs font-mono font-semibold text-gray-800">
                    📞 {customer.phone}
                  </span>
                  <span className="text-xs">
                    {copied === "phone" ? "✅" : "📋"}
                  </span>
                </button>
              )}

              {customer.upi_id && (
                <button
                  onClick={() => copyToClipboard(customer.upi_id!, "upi")}
                  className="inline-flex items-center gap-1.5 bg-green-50 hover:bg-green-100 px-2.5 py-1 rounded-lg transition"
                >
                  <span className="text-xs font-mono font-semibold text-green-700">
                    🔗 {customer.upi_id}
                  </span>
                  <span className="text-xs">
                    {copied === "upi" ? "✅" : "📋"}
                  </span>
                </button>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 mt-3">
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Orders</p>
                <p className="text-sm font-bold text-gray-800">
                  {customer.total_orders}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Spent</p>
                <p className="text-sm font-bold text-green-600">
                  ₹{customer.total_spent.toLocaleString("en-IN")}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Last Order</p>
                <p className="text-xs font-semibold text-gray-700">
                  {formatDate(customer.last_order_date)}
                </p>
              </div>
            </div>

            {/* Address (if available) */}
            {customer.address && (
              <div className="mt-3 bg-gray-50 rounded-lg p-2.5">
                <p className="text-xs text-gray-500 leading-relaxed">
                  📍{" "}
                  {[
                    customer.address.address_line1,
                    customer.address.address_line2,
                    customer.address.city,
                    customer.address.state,
                    customer.address.pincode,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              </div>
            )}

            {/* Expand Button */}
            {customer.order_history.length > 0 && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="mt-3 text-xs font-semibold text-blue-600 hover:text-blue-700 transition flex items-center gap-1"
              >
                {expanded ? "▼ Hide" : "▶ View"} Order History (
                {customer.order_history.length})
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Order History (Expandable) */}
      {expanded && customer.order_history.length > 0 && (
        <div className="border-t border-gray-100 bg-gray-50 p-4 space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            📦 Order History
          </p>
          {customer.order_history.map((order) => (
            <div
              key={order.id}
              className="flex items-center justify-between bg-white rounded-lg px-3 py-2"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm">{statusIcon(order.order_status)}</span>
                <span className="text-xs font-mono font-semibold text-gray-800 truncate">
                  {order.order_number}
                </span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs text-gray-500">
                  {formatDate(order.created_at)}
                </span>
                <span className="text-xs font-bold text-gray-800">
                  ₹{order.total_amount.toLocaleString("en-IN")}
                </span>
                <span className="text-xs text-gray-400 hidden sm:inline">
                  {statusLabel(order.order_status)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
    }
