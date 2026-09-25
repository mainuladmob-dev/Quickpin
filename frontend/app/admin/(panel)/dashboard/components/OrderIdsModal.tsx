"use client";

import { useState } from "react";

interface OrderIdsModalProps {
  title: string;
  orderIds: string[];
  onClose: () => void;
}

export default function OrderIdsModal({
  title,
  orderIds,
  onClose,
}: OrderIdsModalProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch (err) {
      console.error("Copy failed:", err);
    }
  };

  const handleCopyAll = async () => {
    try {
      await navigator.clipboard.writeText(orderIds.join("\n"));
      setCopiedId("ALL");
      setTimeout(() => setCopiedId(null), 1500);
    } catch (err) {
      console.error("Copy failed:", err);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{title}</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {orderIds.length} order{orderIds.length !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500 text-xl"
          >
            ×
          </button>
        </div>

        {/* Copy All */}
        {orderIds.length > 0 && (
          <div className="px-5 py-3 border-b border-gray-100">
            <button
              onClick={handleCopyAll}
              className="w-full text-sm bg-blue-50 hover:bg-blue-100 text-blue-600 font-medium py-2 rounded-lg transition"
            >
              {copiedId === "ALL" ? "✅ Copied All!" : "📋 Copy All IDs"}
            </button>
          </div>
        )}

        {/* Order IDs List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-2">
          {orderIds.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-4xl mb-3">📭</p>
              <p className="text-gray-500 text-sm">No orders found</p>
            </div>
          ) : (
            orderIds.map((id, index) => (
              <div
                key={id + index}
                className="flex items-center justify-between bg-gray-50 hover:bg-gray-100 rounded-lg px-4 py-3 transition group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xs text-gray-400 font-mono w-6">
                    {index + 1}.
                  </span>
                  <span className="text-sm font-mono text-gray-800 truncate">
                    {id}
                  </span>
                </div>
                <button
                  onClick={() => handleCopy(id)}
                  className={`text-xs px-3 py-1.5 rounded-md transition shrink-0 ml-2 ${
                    copiedId === id
                      ? "bg-green-100 text-green-600"
                      : "bg-white text-gray-600 hover:bg-blue-50 hover:text-blue-600 border border-gray-200"
                  }`}
                >
                  {copiedId === id ? "✅ Copied" : "📋 Copy"}
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
