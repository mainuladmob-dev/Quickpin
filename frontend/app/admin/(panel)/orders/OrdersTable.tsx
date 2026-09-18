"use client";

type Order = any;

const STATUSES = [
  { value: "pending", label: "Pending", color: "bg-yellow-100 text-yellow-700" },
  { value: "current", label: "Current", color: "bg-green-100 text-green-700" },
  { value: "out_for_delivery", label: "Out for Delivery", color: "bg-blue-100 text-blue-700" },
  { value: "delivered", label: "Delivered", color: "bg-emerald-100 text-emerald-700" },
  { value: "refund", label: "Refund", color: "bg-purple-100 text-purple-700" },
  { value: "spam", label: "Spam", color: "bg-red-100 text-red-700" },
];

export default function OrdersTable({
  orders,
  selected,
  onToggleSelect,
  onToggleSelectAll,
  onStatusChange,
  onDelete,
  onView,
  onDownload,
  canPrintLabel,
  generatingLabel,
}: {
  orders: Order[];
  selected: string[];
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onStatusChange: (order: Order, status: string) => void;
  onDelete: (order: Order) => void;
  onView: (order: Order) => void;
  onDownload: (order: Order) => void;
  canPrintLabel: (order: Order) => boolean;
  generatingLabel: boolean;
}) {
  const getStatusInfo = (status: string) =>
    STATUSES.find((s) => s.value === status) || {
      value: status,
      label: status,
      color: "bg-gray-100 text-gray-700",
    };

  return (
    <div>
      {/* Select All bar */}
      <div className="bg-white rounded-xl px-4 py-3 mb-3 flex items-center gap-3 border border-gray-200">
        <input
          type="checkbox"
          checked={selected.length === orders.length && orders.length > 0}
          onChange={onToggleSelectAll}
          className="w-5 h-5 accent-blue-600"
        />
        <span className="text-sm text-gray-600 font-medium">
          Select All ({orders.length})
        </span>
      </div>

      {/* Order Cards */}
      <div className="space-y-3">
        {orders.map((o) => {
          const statusInfo = getStatusInfo(o.order_status);
          const isSelected = selected.includes(o.id);
          const canPrint = canPrintLabel(o);
          const codAmount = (o.total_amount || 0) - (o.partial_payment_amount || 0);

          return (
            <div
              key={o.id}
              className={`bg-white rounded-xl border-2 p-4 transition ${
                isSelected ? "border-blue-500 bg-blue-50" : "border-gray-200"
              }`}
            >
              {/* Header Row */}
              <div className="flex items-start gap-3 mb-3">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onToggleSelect(o.id)}
                  className="mt-1 w-5 h-5 accent-blue-600 flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <button
                      onClick={() => onView(o)}
                      className="font-bold text-gray-800 text-sm hover:text-blue-600 text-left"
                    >
                      {o.order_number}
                    </button>
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-medium flex-shrink-0 ${statusInfo.color}`}
                    >
                      {statusInfo.label}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
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

              {/* Customer Info */}
              <div className="bg-gray-50 rounded-lg p-3 mb-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm">👤</span>
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {o.profiles?.name || "—"}
                  </p>
                </div>
                {o.profiles?.phone ? (
                  <a
                    href={`tel:${o.profiles.phone}`}
                    className="flex items-center gap-2 text-blue-600 hover:underline"
                  >
                    <span className="text-sm">📱</span>
                    <span className="text-sm font-medium">{o.profiles.phone}</span>
                  </a>
                ) : (
                  <p className="text-xs text-gray-400 ml-6">
                    {o.profiles?.email || "No phone"}
                  </p>
                )}
              </div>

              {/* Amount Breakdown */}
              <div className="bg-white rounded-lg border border-gray-200 p-3 mb-3">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600 font-medium">Total</span>
                  <span className="font-bold text-gray-800">
                    ₹{o.total_amount}
                  </span>
                </div>
                {o.payment_type === "partial" && (
                  <>
                    <div className="flex justify-between text-xs mt-1">
                      <span className="text-green-700 font-medium">Advance</span>
                      <span className="font-bold text-green-700">
                        ₹{o.partial_payment_amount}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs mt-1">
                      <span className="text-orange-700 font-medium">COD</span>
                      <span className="font-bold text-orange-700">
                        ₹{codAmount.toFixed(2)}
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Delivery + Payment Type Row */}
              <div className="flex items-center gap-2 mb-3 text-xs">
                <span className="px-2 py-1 bg-gray-100 rounded-md font-medium text-gray-700">
                  {o.delivery_type === "self_pickup" ? "🚶 Pickup" : "🏠 Home"}
                </span>
                <span className="px-2 py-1 bg-blue-50 rounded-md font-medium text-blue-700">
                  {o.payment_type === "full" ? "Full" : "Advance"}
                </span>
                <span
                  className={`px-2 py-1 rounded-md font-medium ${
                    o.payment_status === "success"
                      ? "bg-green-100 text-green-700"
                      : o.payment_status === "pending"
                      ? "bg-yellow-100 text-yellow-700"
                      : o.payment_status === "failed"
                      ? "bg-red-100 text-red-700"
                      : "bg-purple-100 text-purple-700"
                  }`}
                >
                  {o.payment_status}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                <select
                  value={o.order_status}
                  onChange={(e) => onStatusChange(o, e.target.value)}
                  className="flex-1 text-xs border border-gray-300 rounded-lg px-2 py-2 text-gray-900 font-medium"
                >
                  {STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>

                {canPrint && (
                  <button
                    onClick={() => onDownload(o)}
                    disabled={generatingLabel}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-3 py-2 rounded-lg font-medium disabled:opacity-50 flex items-center gap-1"
                    title="Download Label"
                  >
                    📥 Label
                  </button>
                )}

                {o.order_status === "spam" && (
                  <button
                    onClick={() => onDelete(o)}
                    className="bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-2 rounded-lg font-medium"
                  >
                    🗑️
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
