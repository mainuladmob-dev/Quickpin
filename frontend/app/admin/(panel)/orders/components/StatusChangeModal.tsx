"use client";

import { useState } from "react";

export type OrderStatus =
  | "pending"
  | "current"
  | "out_for_delivery"
  | "delivered"
  | "spam";

interface StatusChangeModalProps {
  orderIds: string[];
  currentStatus?: string;
  onClose: () => void;
  onConfirm: (newStatus: OrderStatus) => Promise<void>;
}

// ✅ Status অনুযায়ী available next options
const getAvailableOptions = (currentStatus?: string) => {
  const options: {
    value: OrderStatus;
    label: string;
    icon: string;
    color: string;
    warning: string;
  }[] = [];

  if (currentStatus === "pending") {
    options.push(
      {
        value: "current",
        label: "Current (Verified)",
        icon: "🔵",
        color: "blue",
        warning: "Payment verify হয়েছে ধরে নেওয়া হবে",
      },
      {
        value: "spam",
        label: "Spam",
        icon: "🚫",
        color: "red",
        warning: "Order বাতিল হবে",
      }
    );
  } else if (currentStatus === "current") {
    options.push({
      value: "out_for_delivery",
      label: "Out for Delivery",
      icon: "🚚",
      color: "purple",
      warning: "Delivery-তে পাঠানো হবে",
    });
  } else if (currentStatus === "out_for_delivery") {
    options.push({
      value: "delivered",
      label: "Delivered",
      icon: "✅",
      color: "green",
      warning: "Due amount collect হয়েছে ধরে নেওয়া হবে",
    });
  } else if (currentStatus === "spam") {
    options.push({
      value: "current",
      label: "Restore to Current",
      icon: "🔵",
      color: "blue",
      warning: "Order আবার active হবে",
    });
  }

  return options;
};

const getColorClasses = (color: string, isSelected: boolean) => {
  const map: Record<string, { selected: string; normal: string }> = {
    blue: {
      selected: "bg-blue-50 border-blue-400 ring-2 ring-blue-100",
      normal: "bg-white border-gray-200 hover:border-blue-200",
    },
    purple: {
      selected: "bg-purple-50 border-purple-400 ring-2 ring-purple-100",
      normal: "bg-white border-gray-200 hover:border-purple-200",
    },
    green: {
      selected: "bg-green-50 border-green-400 ring-2 ring-green-100",
      normal: "bg-white border-gray-200 hover:border-green-200",
    },
    red: {
      selected: "bg-red-50 border-red-400 ring-2 ring-red-100",
      normal: "bg-white border-gray-200 hover:border-red-200",
    },
  };
  return isSelected ? map[color].selected : map[color].normal;
};

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
  const availableOptions = getAvailableOptions(currentStatus);

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
              {isBulk ? `${orderIds.length} orders selected` : "1 order"}
              {currentStatus && ` • Current: ${currentStatus}`}
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
            Select Next Status
          </p>

          {availableOptions.length === 0 ? (
            <div className="bg-amber-50 border border-amber-200 text-amber-700 text-sm px-3 py-3 rounded-xl">
              ⚠️ এই order-এর জন্য কোনো status option নেই।
            </div>
          ) : (
            availableOptions.map((option) => {
              const isSelected = selectedStatus === option.value;

              return (
                <button
                  key={option.value}
                  onClick={() => setSelectedStatus(option.value)}
                  className={`w-full flex flex-col gap-1 p-3 rounded-xl border-2 transition text-left ${getColorClasses(
                    option.color,
                    isSelected
                  )}`}
                >
                  <div className="flex items-center gap-3 w-full">
                    <span className="text-xl">{option.icon}</span>
                    <span className="flex-1 text-sm font-semibold text-gray-800">
                      {option.label}
                    </span>
                    {isSelected && <span className="text-lg">✅</span>}
                  </div>
                  <p className="text-[11px] text-gray-500 pl-8">
                    ⚠️ {option.warning}
                  </p>
                </button>
              );
            })
          )}

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
            disabled={
              loading || !selectedStatus || availableOptions.length === 0
            }
            className="flex-1 py-3 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition disabled:opacity-50"
          >
            {loading ? "Updating..." : "✅ Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}
