"use client";

import { useState } from "react";

type OrderItem = {
  id?: string;
  product_name?: string;
  name?: string;
  price?: number;
  unit_price?: number;
  quantity?: number;
  qty?: number;
  products?: {
    name_en?: string;
    name_bn?: string;
    name?: string;
    title?: string;
  };
};

type Order = {
  id: string;
  order_number: string;
  total_amount: number;
  refund_reason: string | null;
  refund_amount: number | null;
  refund_method: string | null;
  refund_note: string | null;
  customer_upi?: string | null;
  upi_id?: string | null;
  order_items?: OrderItem[];
  items?: OrderItem[];
};

function resolveItemName(item: any): string {
  const p = item?.products || item?.product || {};
  return (
    p.name_en ||
    item.name_en ||
    p.name ||
    item.name ||
    item.product_name ||
    p.title ||
    item.title ||
    "Grocery Item"
  );
}

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
    product_name?: string;
    transaction_ref?: string;
  }) => void;
  saving: boolean;
}) {
  const rawItems = order.order_items || order.items || [];
  const defaultItem = rawItems.length > 0 ? resolveItemName(rawItems[0]) : "Entire Order / Delivery Issue";
  const defaultPrice = rawItems.length > 0 ? Number(rawItems[0].price || rawItems[0].unit_price || order.total_amount) : order.total_amount;

  const [selectedProduct, setSelectedProduct] = useState<string>(defaultItem);
  const [maxLimit, setMaxLimit] = useState<number>(defaultPrice);
  const [form, setForm] = useState({
    reason: order.refund_reason || "rotten",
    amount: order.refund_amount ? String(order.refund_amount) : String(defaultPrice),
    method: order.refund_method || "UPI",
    note: order.refund_note || "",
    transactionRef: "",
  });

  const [error, setError] = useState("");
  const [copiedUpi, setCopiedUpi] = useState(false);

  const customerUpi = order.customer_upi || order.upi_id || "";

  // Handle Item Switch & Max Limit Locking
  const handleItemSelect = (itemName: string) => {
    setSelectedProduct(itemName);
    if (itemName === "Entire Order / Delivery Issue") {
      setMaxLimit(order.total_amount);
      setForm((prev) => ({ ...prev, amount: String(order.total_amount) }));
      return;
    }

    const matched = rawItems.find((it) => resolveItemName(it) === itemName);
    const itemPrice = matched ? Number(matched.price || matched.unit_price || 0) : order.total_amount;
    setMaxLimit(itemPrice > 0 ? itemPrice : order.total_amount);
    setForm((prev) => ({ ...prev, amount: String(itemPrice > 0 ? itemPrice : order.total_amount) }));
  };

  const handleSubmit = () => {
    setError("");

    if (!form.reason.trim()) {
      setError("Please select a refund reason.");
      return;
    }

    const amt = parseFloat(form.amount);
    if (isNaN(amt) || amt <= 0) {
      setError("Please enter a valid refund amount.");
      return;
    }

    // Over-Refund Protection Rule
    if (amt > order.total_amount) {
      setError(`Amount cannot exceed the total order value of ₹${order.total_amount}.`);
      return;
    }

    if (amt > maxLimit) {
      setError(`Amount exceeds the selected item cap (₹${maxLimit}).`);
      return;
    }

    onSubmit({
      reason: form.reason.trim(),
      amount: amt,
      method: form.method,
      note: form.note.trim(),
      product_name: selectedProduct,
      transaction_ref: form.transactionRef.trim(),
    });
  };
    return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-800">🔄 Granular Item Refund</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Order #{order.order_number} • Total Bill ₹{order.total_amount}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 font-bold text-lg"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3 text-xs">
          {/* 1. Item Selection */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Select Refunded Item *
            </label>
            <select
              value={selectedProduct}
              onChange={(e) => handleItemSelect(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none bg-slate-50 text-slate-800 focus:ring-2 focus:ring-rose-500"
            >
              {rawItems.map((item, idx) => {
                const name = resolveItemName(item);
                const price = Number(item.price || item.unit_price || 0);
                return (
                  <option key={idx} value={name}>
                    {name} {price > 0 ? `(Max ₹${price})` : ""}
                  </option>
                );
              })}
              <option value="Entire Order / Delivery Issue">
                Entire Order / Delivery Issue (Max ₹{order.total_amount})
              </option>
            </select>
          </div>

          {/* 2. Amount Input & Limit */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="font-semibold text-slate-700">Refund Amount (₹) *</label>
              <span className="text-[10px] text-slate-400 font-medium">Cap: ₹{maxLimit}</span>
            </div>
            <input
              type="number"
              step="0.01"
              min="0"
              max={maxLimit}
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none font-bold text-slate-900 focus:ring-2 focus:ring-rose-500"
            />
          </div>

          {/* 3. Reason Code */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Reason Code *</label>
            <select
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none bg-slate-50 text-slate-800"
            >
              <option value="rotten">Rotten / Damaged Mal</option>
              <option value="missing">Missing / Not Packed</option>
              <option value="weight_shortage">Weight Shortage</option>
              <option value="wrong_item">Wrong Item Sent</option>
              <option value="other">Other Issue</option>
            </select>
          </div>

          {/* 4. Method & UPI Copy */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Refund Method *</label>
            <div className="flex gap-4 mb-2">
              {["UPI", "Cash", "Bank"].map((m) => (
                <label key={m} className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700">
                  <input
                    type="radio"
                    name="modal_method"
                    checked={form.method === m}
                    onChange={() => setForm({ ...form, method: m })}
                  />
                  <span>{m}</span>
                </label>
              ))}
            </div>

            {form.method === "UPI" && (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 flex items-center justify-between">
                <span className="font-mono font-bold text-blue-700 text-xs">
                  {customerUpi || "No UPI recorded"}
                </span>
                {customerUpi && (
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(customerUpi);
                      setCopiedUpi(true);
                      setTimeout(() => setCopiedUpi(false), 2000);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1 rounded text-[11px] font-semibold"
                  >
                    {copiedUpi ? "✓ Copied" : "📋 Copy UPI"}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* 5. UTR Reference & Note */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">UTR / Ref (Optional)</label>
              <input
                type="text"
                placeholder="Bank ref ID"
                value={form.transactionRef}
                onChange={(e) => setForm({ ...form, transactionRef: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg outline-none text-slate-800"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Admin Note</label>
              <input
                type="text"
                placeholder="Internal memo"
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg outline-none text-slate-800"
              />
            </div>
          </div>

          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-2.5 rounded-lg font-medium">
              ⚠️ {error}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-semibold"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold disabled:opacity-50 transition"
            >
              {saving ? "Processing..." : "Confirm Refund"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
                                        }

