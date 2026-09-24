/* eslint-disable @next/next/no-img-element */
"use client";

type Order = any;

interface OrdersTableProps {
  orders: Order[];
  selected: string[];
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onStatusChange: (order: Order, newStatus: string) => void;
  onMarkRefundDone: (order: Order) => void;
  onDelete: (order: Order) => void;
  onView: (order: Order) => void;
  onDownload: (order: Order) => void;
  canPrintLabel: (order: Order) => boolean;
  generatingLabel: boolean;
}

const STATUS_OPTIONS = [
  { value: "current", label: "Current Order" },
  { value: "out_for_delivery", label: "Out for Delivery" },
  { value: "delivered", label: "Delivered" },
  { value: "refund", label: "Refund" },
  { value: "pending", label: "Pending Order" },
  { value: "spam", label: "Spam" },
];

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

export default function OrdersTable({
  orders,
  selected,
  onToggleSelect,
  onToggleSelectAll,
  onStatusChange,
  onMarkRefundDone,
  onDelete,
  onView,
  onDownload,
  canPrintLabel,
  generatingLabel,
}: OrdersTableProps) {
  const allSelected = orders.length > 0 && selected.length === orders.length;

  return (
    <div className="space-y-3">
      {/* Bulk Select Header */}
      <div className="bg-white px-4 py-2.5 rounded-xl border border-slate-200 flex items-center justify-between text-xs text-slate-600 shadow-xs">
        <label className="flex items-center gap-2 cursor-pointer font-semibold">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={onToggleSelectAll}
            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
          />
          <span>Select All ({orders.length} Orders)</span>
        </label>
        <span className="text-[11px] text-slate-400 font-medium">Automated Pipeline</span>
      </div>

      {/* Orders List */}
      {orders.map((o) => {
        const isSelected = selected.includes(o.id);
        const profile = o.profiles;
        const total = Number(o.total_amount || 0);
        const refundAmt = Number(o.refund_amount || 0);

        // রিফান্ড সংক্রান্ত স্ট্যাটাস লজিক
        const isRefundOrder =
          o.order_status === "refund" ||
          o.order_status === "refunded" ||
          refundAmt > 0;

        // রিফান্ড পেমেন্ট সম্পন্ন হয়েছে কি না
        const isSettled =
          o.refund_status === "success" ||
          o.is_refund_paid === true ||
          o.refund_paid === true;

        const netRealized = Math.max(
          0,
          total - (refundAmt > 0 ? refundAmt : (isRefundOrder ? total : 0))
        );

        const rawItems = Array.isArray(o.order_items)
          ? o.order_items
          : Array.isArray(o.items)
          ? o.items
          : [];

        return (
          <div
            key={o.id}
            className={`bg-white rounded-xl border transition shadow-xs ${
              isSelected ? "border-blue-500 ring-1 ring-blue-500" : "border-slate-200"
            }`}
          >
            {/* 1. Card Header */}
            <div className="p-4 border-b border-slate-100 flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onToggleSelect(o.id)}
                  className="w-4 h-4 mt-1 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">
                      #{o.order_number}
                    </span>

                    {/* Status Badge */}
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider border ${
                        isRefundOrder
                          ? "bg-rose-50 text-rose-700 border-rose-200"
                          : o.order_status === "delivered"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : o.order_status === "current"
                          ? "bg-blue-50 text-blue-700 border-blue-200"
                          : o.order_status === "out_for_delivery"
                          ? "bg-purple-50 text-purple-700 border-purple-200"
                          : o.order_status === "spam"
                          ? "bg-red-50 text-red-700 border-red-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}
                    >
                      {isRefundOrder
                        ? isSettled
                          ? "refunded"
                          : "refund"
                        : String(o.order_status || "pending").replace(/_/g, " ")}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {new Date(o.created_at).toLocaleString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>

              {/* Customer record */}
              <div className="text-right text-xs">
                <p className="font-semibold text-slate-700 flex items-center justify-end gap-1">
                  <span>👤</span>
                  <span>{profile?.name || "Customer Record"}</span>
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {profile?.phone || profile?.email || "No phone attached"}
                </p>
              </div>
            </div>

            {/* 2. Packaged Items */}
            <div className="p-4 border-b border-slate-100 bg-slate-50/40">
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2">
                Packaged Items ({rawItems.length})
              </p>
              <div className="space-y-2">
                {rawItems.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No items listed</p>
                ) : (
                  rawItems.map((item: any, idx: number) => {
                    const itemName = resolveItemName(item);
                    const qty = Number(item.quantity || item.qty || item.count || 1);
                    const price = Number(item.price || item.unit_price || 0);
                    const weight = Number(item?.products?.weight || item.weight || 0);

                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-xs bg-white p-2 rounded-lg border border-slate-100"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-base">📦</span>
                          <div>
                            <p className="font-semibold text-slate-800">{itemName}</p>
                            <p className="text-[11px] text-slate-500">
                              ₹{price} × {qty}
                              {weight > 0 && (
                                <span className="ml-1 text-emerald-700 font-medium">
                                  ({(weight * qty).toFixed(2)} Kg)
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                        <p className="font-bold text-slate-800">₹{(price * qty).toFixed(2)}</p>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* 3. Financial Breakdown */}
            <div className="p-4 border-b border-slate-100 space-y-1 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Gross Bill:</span>
                <span className="font-bold text-slate-800">₹{total.toFixed(2)}</span>
              </div>

              {(refundAmt > 0 || isRefundOrder) && (
                <div className="flex justify-between text-rose-600 font-semibold">
                  <span>
                    Deducted Refund {o.refund_method ? `(${String(o.refund_method).toUpperCase()})` : ""}:
                  </span>
                  <span>- ₹{(refundAmt > 0 ? refundAmt : total).toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between text-emerald-700 font-bold pt-1 border-t border-slate-100 text-sm">
                <span>Actual Net Realized:</span>
                <span>₹{netRealized.toFixed(2)}</span>
              </div>

              {/* Delivery and payment badges */}
              <div className="flex flex-wrap gap-1.5 pt-2">
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                  🚶 {o.delivery_type === "home_delivery" ? "Home Delivery" : "Pickup"}
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                  💳 {o.payment_type === "partial" ? "Advance Payment" : "Full Payment"}
                </span>

                {/* সংশোধিত স্ট্যাটাস লজিক: পেমেন্ট বাকি থাকলে 'refund pending', সম্পন্ন হলে 'refunded' */}
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                    isRefundOrder
                      ? isSettled
                        ? "bg-slate-100 text-slate-600 border-slate-200"
                        : "bg-rose-50 text-rose-700 border-rose-200 animate-pulse"
                      : "bg-slate-100 text-slate-600 border-slate-200"
                  }`}
                >
                  Status:{" "}
                  {isRefundOrder
                    ? isSettled
                      ? "refunded"
                      : "refund pending"
                    : o.payment_status || "unpaid"}
                </span>
              </div>
            </div>

            {/* 4. Card Footer */}
            <div className="p-3 bg-slate-50/60 rounded-b-xl flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <select
                  value={o.order_status}
                  disabled={isSettled}
                  onChange={(e) => onStatusChange(o, e.target.value)}
                  className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs disabled:bg-slate-100 disabled:text-slate-400"
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>

                {/* Refund Final Settlement Action Button */}
                {isRefundOrder && (
                  <>
                    {isSettled ? (
                      <span className="px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1 shadow-2xs">
                        ✓ Settled
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onMarkRefundDone(o)}
                        className="px-3 py-1.5 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow-xs flex items-center gap-1.5 transition active:scale-95"
                      >
                        <span>💳</span>
                        <span>Payment Done</span>
                      </button>
                    )}
                  </>
                )}
              </div>

              {/* View, Label and Delete Controls */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onView(o)}
                  className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition shadow-2xs"
                >
                  👁️ Details
                </button>

                <button
                  type="button"
                  onClick={() => onDownload(o)}
                  disabled={generatingLabel || !canPrintLabel(o)}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-900 hover:bg-slate-800 text-white flex items-center gap-1 disabled:opacity-50 transition shadow-2xs"
                >
                  <span>🏷️</span>
                  <span>Label</span>
                </button>

                {o.order_status === "spam" && (
                  <button
                    type="button"
                    onClick={() => onDelete(o)}
                    className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition"
                  >
                    🗑️
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
            }

