"use client";

import { useState, useMemo } from "react";

type OrderItem = {
  id?: string;
  name?: string;
  product_name?: string;
  price?: number;
  unit_price?: number;
  quantity?: number;
  qty?: number;
  count?: number;
  products?: {
    name_en?: string;
    name_bn?: string;
    name?: string;
  };
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
    p.name_bn ||
    "Product Item"
  );
}

export default function RefundModal({
  order,
  onClose,
  onSubmit,
  saving,
}: {
  order: any;
  onClose: () => void;
  onSubmit: (data: {
    reason: string;
    amount: number;
    method: string;
    note: string;
    product_name?: string;
    transaction_ref?: string;
    customer_upi?: string;
  }) => void;
  saving: boolean;
}) {
  // 1. Order Items Extraction
  const items: OrderItem[] = useMemo(() => {
    if (Array.isArray(order?.order_items)) return order.order_items;
    if (Array.isArray(order?.items)) return order.items;
    if (typeof order?.items === "string") {
      try {
        return JSON.parse(order.items);
      } catch {
        return [];
      }
    }
    return [];
  }, [order]);

  // Initializing Defaults
  const initialItem = items.length > 0 ? items[0] : null;
  const initialItemCap = initialItem
    ? Number(initialItem.price || initialItem.unit_price || 0) *
      Number(initialItem.quantity || initialItem.qty || 1)
    : Number(order?.total_amount || 0);

  const [selectedItemIdx, setSelectedItemIdx] = useState<number>(0);
  const [amount, setAmount] = useState<string>(initialItemCap > 0 ? initialItemCap.toString() : "0");
  const [reason, setReason] = useState<string>("rotten");
  const [method, setMethod] = useState<"upi" | "cash" | "bank">("upi");
  const [utr, setUtr] = useState<string>("");
  const [note, setNote] = useState<string>("");

  // UPI State (Database default ba manual input)
  const defaultUpi =
    order?.customer_upi ||
    order?.upi_id ||
    order?.profiles?.upi_id ||
    "";
  const [customerUpi, setCustomerUpi] = useState<string>(defaultUpi);
  const [copiedUpi, setCopiedUpi] = useState(false);

  // 2. Active Item Maximum Refund Cap Calculation
  const activeCap = useMemo(() => {
    if (selectedItemIdx === -1) {
      // Entire Order option
      return Number(order?.total_amount || 0);
    }
    const item = items[selectedItemIdx];
    if (!item) return Number(order?.total_amount || 0);
    const price = Number(item.price || item.unit_price || 0);
    const qty = Number(item.quantity || item.qty || item.count || 1);
    return price * qty;
  }, [selectedItemIdx, items, order]);

  // Handle Item Dropdown Change
  const handleItemChange = (idx: number) => {
    setSelectedItemIdx(idx);
    if (idx === -1) {
      setAmount(Number(order?.total_amount || 0).toString());
    } else {
      const it = items[idx];
      const maxVal =
        Number(it?.price || it?.unit_price || 0) *
        Number(it?.quantity || it?.qty || it?.count || 1);
      setAmount(maxVal.toString());
    }
  };

  const parsedAmount = Number(amount) || 0;
  const isAmountValid = parsedAmount > 0 && parsedAmount <= activeCap;

  // Handle Copy UPI
  const handleCopyUpi = () => {
    if (!customerUpi) return;
    navigator.clipboard.writeText(customerUpi);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  // Submit Handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAmountValid) {
      alert(`Invalid Amount! Must be between ₹1 and Cap of ₹${activeCap}`);
      return;
    }

    const selectedName =
      selectedItemIdx === -1
        ? "Entire Order / Full Return"
        : resolveItemName(items[selectedItemIdx]);

    onSubmit({
      reason,
      amount: parsedAmount,
      method,
      note,
      product_name: selectedName,
      transaction_ref: utr.trim() || undefined,
      customer_upi: method === "upi" ? customerUpi.trim() || undefined : undefined,
    });
  };
    return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto backdrop-blur-xs">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              🔄 Granular Item Refund
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Order #{order.order_number} • Total Bill ₹{order.total_amount}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-xl font-bold p-1 leading-none"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          {/* 1. Select Refunded Item */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Select Refunded Item *
            </label>
            <select
              value={selectedItemIdx}
              onChange={(e) => handleItemChange(Number(e.target.value))}
              className="w-full border border-slate-300 rounded-lg p-2.5 font-semibold text-slate-800 bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500"
            >
              {items.map((it, idx) => {
                const name = resolveItemName(it);
                const price = Number(it.price || it.unit_price || 0);
                const qty = Number(it.quantity || it.qty || it.count || 1);
                const max = price * qty;
                return (
                  <option key={idx} value={idx}>
                    {name} (Max ₹{max})
                  </option>
                );
              })}
              <option value={-1}>Entire Order (Max ₹{order.total_amount})</option>
            </select>
          </div>

          {/* 2. Refund Amount with Strict Cap Lock */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="font-bold text-slate-700">
                Refund Amount (₹) *
              </label>
              <span
                className={`font-mono text-[11px] font-bold ${
                  parsedAmount > activeCap ? "text-rose-600" : "text-slate-500"
                }`}
              >
                Cap: ₹{activeCap}
              </span>
            </div>
            <input
              type="number"
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              max={activeCap}
              min={1}
              className={`w-full border rounded-lg p-2 font-bold text-sm outline-none transition ${
                parsedAmount > activeCap
                  ? "border-rose-500 bg-rose-50 text-rose-700 focus:ring-2 focus:ring-rose-400"
                  : "border-slate-300 bg-white text-slate-800 focus:ring-2 focus:ring-blue-500"
              }`}
            />
            {parsedAmount > activeCap && (
              <p className="text-[10px] text-rose-600 font-semibold mt-1">
                ⚠️ Item price limit exceeded! Maximum refundable is ₹{activeCap}.
              </p>
            )}
          </div>

          {/* 3. Reason Code */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Reason Code *
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-2 font-semibold text-slate-800 bg-white outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="rotten">Rotten / Damaged Mal</option>
              <option value="missing">Missing Item</option>
              <option value="weight_shortage">Weight Shortage</option>
              <option value="wrong_item">Wrong Item Sent</option>
              <option value="other">Other Claim</option>
            </select>
          </div>

          {/* 4. Refund Method Selector (UPI / Cash / Bank) */}
          <div>
            <label className="block font-bold text-slate-700 mb-1.5">
              Refund Method *
            </label>
            <div className="flex items-center gap-5 font-semibold text-slate-700">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="refundMethod"
                  checked={method === "upi"}
                  onChange={() => setMethod("upi")}
                  className="accent-blue-600"
                />
                UPI
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="refundMethod"
                  checked={method === "cash"}
                  onChange={() => setMethod("cash")}
                  className="accent-amber-600"
                />
                Cash
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="refundMethod"
                  checked={method === "bank"}
                  onChange={() => setMethod("bank")}
                  className="accent-purple-600"
                />
                Bank
              </label>
            </div>
          </div>

          {/* 5A. Method is Cash -> Doorstep Handover Notice */}
          {method === "cash" && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
              <p className="font-bold text-amber-800 text-xs flex items-center gap-1">
                💵 Doorstep Cash Refund
              </p>
              <p className="text-[11px] text-amber-700 leading-relaxed">
                Delivery boy will hand over cash on doorstep. This ₹{parsedAmount} will automatically deduct from the physical cash drawer.
              </p>
            </div>
          )}

          {/* 5B. Method is UPI -> Auto/Manual UPI with 1-Click Copy */}
          {method === "upi" && (
            <div className="space-y-1.5 p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                Customer UPI ID
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Enter UPI ID (e.g. 9876543210@ybl)"
                  value={customerUpi}
                  onChange={(e) => setCustomerUpi(e.target.value)}
                  className="flex-1 bg-white border border-slate-300 rounded-lg p-2 font-mono text-xs font-bold text-blue-700 outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  disabled={!customerUpi.trim()}
                  onClick={handleCopyUpi}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-semibold rounded-lg text-xs transition flex-shrink-0"
                >
                  {copiedUpi ? "✓ Copied" : "📋 Copy"}
                </button>
              </div>
              {!customerUpi && (
                <p className="text-[10px] text-slate-400">
                  No default UPI found. Type customer UPI above and click copy.
                </p>
              )}
            </div>
          )}

          {/* 6. UTR / Ref & Admin Note */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                UTR / Ref (Optional)
              </label>
              <input
                type="text"
                placeholder="Bank ref ID"
                value={utr}
                onChange={(e) => setUtr(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2 font-mono text-xs outline-none bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Admin Note
              </label>
              <input
                type="text"
                placeholder="Internal memo"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2 text-xs outline-none bg-white"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !isAmountValid}
              className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl font-bold shadow-xs transition"
            >
              {saving ? "Processing..." : "Confirm Refund"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
