"use client";

import { useState } from "react";

export type OrderStatus =
  | "pending"
  | "current"
  | "out_for_delivery"
  | "delivered"
  | "refund"
  | "spam";

interface StatusChangeModalProps {
  /** Single order হলে একটা id, bulk হলে multiple */
  orderIds: string[];
  /** Current status (single-এর জন্য) */
  currentStatus?: OrderStatus;
  onClose: () => void;
  onConfirm: (newStatus: OrderStatus) => Promise<void>;
}

const statusOptions: {
  value: OrderStatus;
  label: string;
  icon: string;
  color: string;
}[] = [
  {
    value: "pending",
    label: "Pending",
    icon: "⏳",
    color: "amber",
  },
  {
    value: "current",
    label: "Current",
    icon: "🔵",
    color: "blue",
  },
  {
    value: "out_for_delivery",
    label: "Out for Delivery",
    icon: "🚚",
    color: "purple",
  },
  {
    value: "delivered",
    label: "Delivered",
    icon: "✅",
    color: "green",
  },
  {
    value: "refund",
    label: "Refund",
    icon: "↩️",
    color: "yellow",
  },
  {
    value: "spam",
    label: "Spam",
    icon: "🚫",
    color: "red",
  },
];

export default function StatusChangeModal({
  orderIds,
  currentStatus,
  onClose,
  onConfirm,
}: StatusChangeModalProps) {
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isBulk = orderIds.length > 1;

  const handleConfirm = async () => {
    if (!selectedStatus) {
      setError("একটা status select করুন");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await onConfirm(selectedStatus);
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Status change failed");
    } finally {
      setLoading(false);
    }
  };

  const getColorClasses = (color: string, isSelected: boolean) => {
    const map: Record<string, { selected: string; normal: string }> = {
      amber: {
        selected: "bg-amber-50 border-amber-400 ring-2 ring-amber-100",
        normal: "bg-white border-gray-200 hover:border-amber-200 hover:bg-amber-50/30",
      },
      blue: {
        selected: "bg-blue-50 border-blue-400 ring-2 ring-blue-100",
        normal: "bg-white border-gray-200 hover:border-blue-200 hover:bg-blue-50/30",
      },
      purple: {
        selected: "bg-purple-50 border-purple-400 ring-2 ring-purple-100",
        normal: "bg-white border-gray-200 hover:border-purple-200 hover:bg-purple-50/30",
      },
      green: {
        selected: "bg-green-50 border-green-400 ring-2 ring-green-100",
        normal: "bg-white border-gray-200 hover:border-green-200 hover:bg-green-50/30",
      },
      yellow: {
        selected: "bg-yellow-50 border-yellow-400 ring-2 ring-yellow-100",
        normal: "bg-white border-gray-200 hover:border-yellow-200 hover:bg-yellow-50/30",
      },
      red: {
        selected: "bg-red-50 border-red-400 ring-2 ring-red-100",
        normal: "bg-white border-gray-200 hover:border-red-200 hover:bg-red-50/30",
      },
    };
    return isSelected ? map[color].selected : map[color].normal;
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
              🔄 Change Status
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {isBulk
                ? `${orderIds.length} orders selected`
                : `1 order`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500 text-xl"
          >
            ×
          </button>
        </div>

        {/* Status Options */}
        <div className="p-5 space-y-2 max-h-[60vh] overflow-y-auto">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Select New Status
          </p>

          {statusOptions.map((option) => {
            const isSelected = selectedStatus === option.value;
            const isCurrent = currentStatus === option.value;

            return (
              <button
                key={option.value}
                onClick={() => setSelectedStatus(option.value)}
                disabled={isCurrent}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition text-left ${getColorClasses(
                  option.color,
                  isSelected
                )} ${isCurrent ? "opacity-40 cursor-not-allowed" : ""}`}
              >
                <span className="text-xl">{option.icon}</span>
                <span className="flex-1 text-sm font-semibold text-gray-800">
                  {option.label}
                </span>
                {isCurrent && (
                  <span className="text-xs text-gray-500 font-medium">
                    Current
                  </span>
                )}
                {isSelected && !isCurrent && (
                  <span className="text-lg">✅</span>
                )}
              </button>
            );
          })}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg mt-3">
              {error}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-5 border-t border-gray-100 flex gap-2">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-3 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading || !selectedStatus}
            className="flex-1 py-3 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition disabled:opacity-50"
          >
            {loading ? "Updating..." : "✅ Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
        }
