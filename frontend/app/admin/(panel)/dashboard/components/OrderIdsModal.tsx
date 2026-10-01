"use client";

import { useState } from "react";

interface OrderIdItem {
  id: string;
  amount: number;
  gst?: number;
  refund?: number;
  refundGST?: number;
  netAmount?: number;
}

interface OrderIdsModalProps {
  title: string;
  orderIds: OrderIdItem[];
  isDelivery?: boolean;
  onClose: () => void;
}

export default function OrderIdsModal({
  title,
  orderIds,
  isDelivery = false,
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
      const allIds = orderIds.map((item) => item.id).join("\n");
      await navigator.clipboard.writeText(allIds);
      setCopiedId("ALL");
      setTimeout(() => setCopiedId(null), 1500);
    } catch (err) {
      console.error("Copy failed:", err);
    }
  };

  const isNetSales = title === "Net Sales";
  const isRefund = title === "Refund";
  const isGross = title === "Gross Sales";

  const totalAmount = orderIds.reduce(
    (sum, item) => sum + (item.amount || 0),
    0
  );

  const totalGST = orderIds.reduce(
    (sum, item) => sum + (item.gst || 0),
    0
  );

  const totalRefundGST = orderIds.reduce(
    (sum, item) => sum + (item.refundGST || 0),
    0
  );

  const totalNet = orderIds.reduce(
    (sum, item) => sum + (item.netAmount ?? item.amount ?? 0),
    0
  );

  const totalNetGST = orderIds.reduce((sum, item) => {
    if (isNetSales) {
      return sum + ((item.gst || 0) - (item.refundGST || 0));
    }
    return sum + (item.gst || 0);
  }, 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{title}</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {orderIds.length} order{orderIds.length !== 1 ? "s" : ""}
              {totalAmount > 0 && !isDelivery && !isNetSales && (
                <span className="ml-2 font-semibold text-gray-700">
                  • Total ₹{totalAmount.toLocaleString("en-IN")}
                </span>
              )}
              {isNetSales && totalNet > 0 && (
                <span className="ml-2 font-semibold text-blue-600">
                  • Net ₹{totalNet.toLocaleString("en-IN")}
                </span>
              )}
            </p>
            {/* GST Summary */}
            {!isDelivery && totalGST > 0 && (
              <p className="text-xs text-amber-600 mt-1 font-medium">
                GST: ₹{totalGST.toFixed(2)}
                {isNetSales && totalRefundGST > 0 && (
                  <span className="text-red-500 ml-1">
                    − Refund ₹{totalRefundGST.toFixed(2)} = ₹
                    {totalNetGST.toFixed(2)}
                  </span>
                )}
              </p>
            )}
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
            orderIds.map((item, index) => (
              <div
                key={item.id + index}
                className="bg-gray-50 hover:bg-gray-100 rounded-lg px-3 py-2.5 transition"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="text-xs text-gray-400 font-mono w-6 shrink-0">
                      {index + 1}.
                    </span>
                    <span className="text-sm font-mono font-semibold text-gray-800 truncate">
                      {item.id}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    {isNetSales ? (
                      <span className="text-sm font-bold text-blue-700">
                        ₹{(item.netAmount ?? item.amount).toLocaleString("en-IN")}
                      </span>
                    ) : (
                      item.amount > 0 && (
                        <span className="text-sm font-bold text-gray-700">
                          ₹{item.amount.toLocaleString("en-IN")}
                        </span>
                      )
                    )}
                    <button
                      onClick={() => handleCopy(item.id)}
                      className={`text-xs px-2 py-1 rounded-md transition ${
                        copiedId === item.id
                          ? "bg-green-100 text-green-600"
                          : "bg-white text-gray-600 hover:bg-blue-50 hover:text-blue-600 border border-gray-200"
                      }`}
                    >
                      {copiedId === item.id ? "✅" : "📋"}
                    </button>
                  </div>
                </div>

                {/* GST + breakdown */}
                {!isDelivery && (
                  <div className="mt-1.5 pl-8 flex items-center gap-3 text-xs flex-wrap">
                    {isGross && item.gst !== undefined && item.gst > 0 && (
                      <span className="text-amber-600">
                        GST: ₹{item.gst.toFixed(2)}
                      </span>
                    )}
                    {isRefund && item.gst !== undefined && item.gst > 0 && (
                      <span className="text-amber-600">
                        GST Refunded: ₹{item.gst.toFixed(2)}
                      </span>
                    )}
                    {isNetSales && (
                      <>
                        <span className="text-gray-500">
                          Gross: ₹{item.amount.toLocaleString("en-IN")}
                        </span>
                        <span className="text-red-500">
                          Refund: −₹
                          {(item.refund || 0).toLocaleString("en-IN")}
                        </span>
                        <span className="text-green-600 font-semibold">
                          Net: ₹
                          {(item.netAmount ?? item.amount).toLocaleString(
                            "en-IN"
                          )}
                        </span>
                        {item.gst !== undefined && item.gst > 0 && (
                          <span className="text-amber-600">
                            GST: ₹{item.gst.toFixed(2)}
                            {item.refundGST && item.refundGST > 0 && (
                              <span className="text-red-500">
                                {" "}
                                − ₹{item.refundGST.toFixed(2)} = ₹
                                {(item.gst - item.refundGST).toFixed(2)}
                              </span>
                            )}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
              }
