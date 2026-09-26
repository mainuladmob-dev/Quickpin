"use client";

import { useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import type { OrderData } from "./OrderCard";

interface RefundModalProps {
  order: OrderData;
  onClose: () => void;
  onSuccess: () => void;
}

export default function RefundModal({
  order,
  onClose,
  onSuccess,
}: RefundModalProps) {
  const supabase = useMemo(() => createClient(), []);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [refundMethod, setRefundMethod] = useState<"upi" | "cash" | null>(null);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const items = order.order_items || [];
  const upiId = order.upi_id;

  const toggleItem = (itemId: string) => {
    setSelectedItems((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId]
    );
  };

  const refundAmount = useMemo(() => {
    return items
      .filter((item) => selectedItems.includes(item.id))
      .reduce((sum, item) => sum + item.qty * item.price, 0);
  }, [items, selectedItems]);

  const handleConfirm = async () => {
    if (selectedItems.length === 0) {
      setError("কমপক্ষে একটা product select করুন");
      return;
    }

    if (!refundMethod) {
      setError("Refund method select করুন (UPI / Cash)");
      return;
    }

    if (refundMethod === "upi" && !upiId) {
      setError("এই order-এ UPI ID নেই — Cash refund করুন");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // 1. Get selected products
      const selectedProducts = items.filter((item) =>
        selectedItems.includes(item.id)
      );

      // 2. Insert one row per product into refunds table
      const refundRows = selectedProducts.map((item) => ({
        order_id: order.id, // UUID
        product_name: item.products?.name_en || "Product",
        quantity: item.qty,
        amount: item.qty * item.price,
        weight_kg: null,
        refund_method: refundMethod,
        reason: reason.trim() || null,
        customer_upi: upiId || null,
        refunded_at: new Date().toISOString(),
      }));

      const { error: refundErr } = await supabase
        .from("refunds")
        .insert(refundRows);

      if (refundErr) throw refundErr;

      // 3. Update order — set refund_amount + status = "refund"
      const newRefundTotal = (order.refund_amount || 0) + refundAmount;
      const { error: orderErr } = await supabase
        .from("orders")
        .update({
          refund_amount: newRefundTotal,
          order_status: "refund",
          status_changed_at: new Date().toISOString(),
        })
        .eq("id", order.id);

      if (orderErr) throw orderErr;

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Refund failed");
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
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">↩️ Refund Order</h2>
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
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Products */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              🛍️ Select Products
            </p>
            <div className="space-y-2">
              {items.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">
                  No products found
                </p>
              ) : (
                items.map((item) => {
                  const isSelected = selectedItems.includes(item.id);
                  return (
                    <label
                      key={item.id}
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${
                        isSelected
                          ? "bg-blue-50 border-blue-200"
                          : "bg-gray-50 border-gray-100 hover:bg-gray-100"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleItem(item.id)}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">
                          {item.products?.name_en || "Product"}
                        </p>
                        <p className="text-xs text-gray-500">
                          x{item.qty} × ₹{item.price}
                        </p>
                      </div>
                      <p className="text-sm font-bold text-gray-800">
                        ₹{(item.qty * item.price).toLocaleString("en-IN")}
                      </p>
                    </label>
                  );
                })
              )}
            </div>
          </div>

          {/* Refund Method */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              💸 Refund Method
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setRefundMethod("upi")}
                disabled={!upiId}
                className={`p-3 rounded-xl border-2 transition text-left ${
                  refundMethod === "upi"
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 bg-white hover:border-blue-300"
                } ${!upiId ? "opacity-40 cursor-not-allowed" : ""}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">🔗</span>
                  <span className="text-sm font-semibold text-gray-800">
                    UPI Refund
                  </span>
                </div>
                <p className="text-xs text-gray-500 truncate">
                  {upiId || "No UPI available"}
                </p>
              </button>

              <button
                onClick={() => setRefundMethod("cash")}
                className={`p-3 rounded-xl border-2 transition text-left ${
                  refundMethod === "cash"
                    ? "border-green-500 bg-green-50"
                    : "border-gray-200 bg-white hover:border-green-300"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">💵</span>
                  <span className="text-sm font-semibold text-gray-800">
                    Cash Refund
                  </span>
                </div>
                <p className="text-xs text-gray-500">Hand delivery</p>
              </button>
            </div>
          </div>

          {/* Reason */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              📝 Reason (Optional)
            </p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: Product damaged..."
              rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-gray-100 space-y-3">
          <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
            <span className="text-sm font-medium text-gray-600">
              Total Refund:
            </span>
            <span className="text-xl font-bold text-red-600">
              ₹{refundAmount.toLocaleString("en-IN")}
            </span>
          </div>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-3 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={loading || selectedItems.length === 0 || !refundMethod}
              className="flex-1 py-3 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition disabled:opacity-50"
            >
              {loading ? "Processing..." : "✅ Confirm Refund"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
