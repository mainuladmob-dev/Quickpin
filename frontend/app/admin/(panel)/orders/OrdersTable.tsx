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
  const getStatusStyle = (status: string) =>
    STATUSES.find((s) => s.value === status)?.color || "bg-gray-100 text-gray-700";

  const getStatusLabel = (status: string) =>
    STATUSES.find((s) => s.value === status)?.label || status;

  return (
    <div className="bg-white rounded-xl overflow-hidden border border-gray-200 overflow-x-auto">
      <table className="w-full text-sm min-w-[900px]">
        <thead className="bg-gray-50 text-gray-600 text-left">
          <tr>
            <th className="px-3 py-3 w-8">
              <input
                type="checkbox"
                checked={selected.length === orders.length && orders.length > 0}
                onChange={onToggleSelectAll}
              />
            </th>
            <th className="px-3 py-3 font-medium">Order #</th>
            <th className="px-3 py-3 font-medium">Customer</th>
            <th className="px-3 py-3 font-medium">Total</th>
            <th className="px-3 py-3 font-medium">Type</th>
            <th className="px-3 py-3 font-medium">Payment</th>
            <th className="px-3 py-3 font-medium">Status</th>
            <th className="px-3 py-3 font-medium">Change</th>
            <th className="px-3 py-3 font-medium text-right">Action</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id} className="border-t border-gray-100 hover:bg-gray-50">
              <td className="px-3 py-3">
                <input
                  type="checkbox"
                  checked={selected.includes(o.id)}
                  onChange={() => onToggleSelect(o.id)}
                />
              </td>
              <td className="px-3 py-3 font-medium text-gray-800">
                <button onClick={() => onView(o)} className="text-blue-600 hover:underline">
                  {o.order_number}
                </button>
              </td>
              <td className="px-3 py-3 text-gray-700">
                <div className="text-xs">{o.profiles?.name || "—"}</div>
                <div className="text-xs text-gray-400">{o.profiles?.email || ""}</div>
              </td>
              <td className="px-3 py-3 text-gray-800 font-medium">₹{o.total_amount}</td>
              <td className="px-3 py-3 text-gray-600 text-xs">
                <div>{o.delivery_type === "self_pickup" ? "🚶 Pickup" : "🏠 Home"}</div>
                <div className="text-gray-400">
                  {o.payment_type === "full" ? "Full" : "Partial"}
                </div>
              </td>
              <td className="px-3 py-3">
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
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
              </td>
              <td className="px-3 py-3">
                <span
                  className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusStyle(o.order_status)}`}
                >
                  {getStatusLabel(o.order_status)}
                </span>
              </td>
              <td className="px-3 py-3">
                <select
                  value={o.order_status}
                  onChange={(e) => onStatusChange(o, e.target.value)}
                  className="text-xs border border-gray-300 rounded-lg px-2 py-1 text-gray-900"
                >
                  {STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </td>
              <td className="px-3 py-3 text-right space-x-2">
                {canPrintLabel(o) && (
                  <button
                    onClick={() => onDownload(o)}
                    disabled={generatingLabel}
                    className="text-indigo-600 hover:underline text-xs disabled:opacity-50"
                    title="Download Label"
                  >
                    📥
                  </button>
                )}
                {o.order_status === "spam" && (
                  <button
                    onClick={() => onDelete(o)}
                    className="text-red-600 hover:underline text-xs"
                  >
                    Delete
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
      }
