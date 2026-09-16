"use client";

import { useState } from "react";

type Order = {
  id: string;
  order_number: string;
  total_amount: number;
  refund_reason: string | null;
  refund_amount: number | null;
  refund_method: string | null;
  refund_note: string | null;
};

export default function RefundModal({
  order,
  onClose,
  onSubmit,
  saving,
}: {
  order: Order;
  onClose: () => void;
  onSubmit: (data: {
    reason: string;
    amount: number;
    method: string;
    note: string;
  }) => void;
  saving: boolean;
}) {
  const [form, setForm] = useState({
    reason: order.refund_reason || "",
    amount: order.refund_amount ? String(order.refund_amount) : "",
    method: order.refund_method || "UPI",
    note: order.refund_note || "",
  });
  const [error, setError] = useState("");

  const handleSubmit = () => {
    setError("");

    if (!form.reason.trim()) {
      setError("Refund reason is required");
      return;
    }
    const amt = parseFloat(form.amount);
    if (isNaN(amt) || amt <= 0) {
      setError("Refund amount must be a valid number");
      return;
    }
    if (!form.method.trim()) {
      setError("Refund method is required");
      return;
    }

    onSubmit({
      reason: form.reason.trim(),
      amount: amt,
      method: form.method,
      note: form.note.trim(),
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6">
        <h2 className="text-lg font-bold mb-1">Refund Order</h2>
        <p className="text-sm text-gray-500 mb-4">
          Order #{order.order_number} • Total ₹{order.total_amount}
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Refund Reason *
            </label>
            <textarea
              rows={2}
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              placeholder="e.g. Damaged product, Customer complaint..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Refund Amount (₹) *
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Refund Method *
            </label>
            <select
              value={form.method}
              onChange={(e) => setForm({ ...form, method: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            >
              <option value="UPI">UPI</option>
              <option value="Bank">Bank Transfer</option>
              <option value="Cash">Cash</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Note (optional)
            </label>
            <input
              type="text"
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">
              {error}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium disabled:opacity-50"
            >
              {saving ? "Processing..." : "Confirm Refund"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
