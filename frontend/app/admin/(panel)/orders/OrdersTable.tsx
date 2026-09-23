"use client";

type Order = any;

const STATUSES = [
  { value: "pending", label: "Pending", color: "bg-amber-100 text-amber-800 border-amber-200" },
  { value: "current", label: "Current Order", color: "bg-blue-100 text-blue-800 border-blue-200" },
  { value: "out_for_delivery", label: "Out for Delivery", color: "bg-indigo-100 text-indigo-800 border-indigo-200" },
  { value: "delivered", label: "Delivered", color: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  { value: "refund", label: "Refunded", color: "bg-rose-100 text-rose-800 border-rose-200" },
  { value: "spam", label: "Spam", color: "bg-red-100 text-red-800 border-red-200" },
];

// Strict State Transition Engine
function getAllowedNextStatuses(currentStatus: string) {
  switch (currentStatus) {
    case "pending":
      return [
        { value: "pending", label: "Pending" },
        { value: "current", label: "Move to Current Order" },
        { value: "spam", label: "Mark as Spam" },
      ];
    case "current":
      return [
        { value: "current", label: "Current Order" },
        { value: "out_for_delivery", label: "Send to Out for Delivery" },
        { value: "spam", label: "Mark as Spam" },
      ];
    case "out_for_delivery":
      return [
        { value: "out_for_delivery", label: "Out for Delivery" },
        { value: "delivered", label: "Mark as Delivered" },
      ];
    case "delivered":
      return [{ value: "delivered", label: "Delivered" }];
    case "refund":
      return [{ value: "refund", label: "Refunded" }];
    case "spam":
      return [{ value: "spam", label: "Spam" }];
    default:
      return [{ value: currentStatus, label: currentStatus }];
  }
}

// Helper: Smart Image URL Resolver
function resolveImageUrl(item: any): string | null {
  const p = item?.products || item?.product || {};
  const raw =
    p.images ??
    p.image ??
    p.image_url ??
    item?.images ??
    item?.image ??
    item?.image_url ??
    p.thumbnail ??
    p.photo ??
    null;

  if (!raw) return null;

  let target: any = raw;
  if (Array.isArray(target) && target.length > 0) target = target[0];

  if (typeof target === "string") {
    const trimmed = target.trim();
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed) && parsed.length > 0) target = parsed[0];
      } catch {
        target = trimmed.replace(/[\[\]"']/g, "");
      }
    }
  }

  if (typeof target !== "string" || !target.trim()) return null;
  target = target.trim();

  if (target.startsWith("http://") || target.startsWith("https://")) return target;

  const cleanPath = target.replace(/^\/+/, "").replace(/^products\//, "");
  return `https://uewgqsfptqbkytfyozqi.supabase.co/storage/v1/object/public/products/${cleanPath}`;
}

// Helper: 100% English Item Name Resolver
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
    item.name_bn ||
    "Product Item"
  );
}

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
      color: "bg-slate-100 text-slate-700 border-slate-200",
    };

  return (
    <div className="space-y-3">
      {/* Select All Bar */}
      <div className="bg-white rounded-xl px-4 py-3 flex items-center justify-between border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={selected.length === orders.length && orders.length > 0}
            onChange={onToggleSelectAll}
            className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
          />
          <span className="text-xs text-slate-700 font-semibold">
            Select All ({orders.length} Orders)
          </span>
        </div>
        <span className="text-[11px] text-slate-400 font-medium">
          Showing filtered date records
        </span>
      </div>

      {/* Orders List */}
      <div className="space-y-3">
        {orders.map((o) => {
          const statusInfo = getStatusInfo(o.order_status);
          const isSelected = selected.includes(o.id);
          const canPrint = canPrintLabel(o);
          const codAmount = (o.total_amount || 0) - (o.partial_payment_amount || 0);
          const allowedTransitions = getAllowedNextStatuses(o.order_status);

          let orderItems: any[] = [];
          if (Array.isArray(o.order_items)) {
            orderItems = o.order_items;
          } else if (Array.isArray(o.items)) {
            orderItems = o.items;
          } else if (typeof o.items === "string") {
            try {
              orderItems = JSON.parse(o.items);
            } catch {
              orderItems = [];
            }
          }

          const address = o.addresses || o.address || {};

          return (
            <div
              key={o.id}
              className={`bg-white rounded-xl border p-4 transition shadow-xs ${
                isSelected ? "border-blue-500 bg-blue-50/20 ring-1 ring-blue-500" : "border-slate-200"
              }`}
            >
              {/* Header Row */}
              <div className="flex items-start gap-3 mb-3">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onToggleSelect(o.id)}
                  className="mt-1 w-4 h-4 accent-blue-600 rounded cursor-pointer flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <button
                      onClick={() => onView(o)}
                      className="font-bold text-slate-900 text-sm hover:text-blue-600 text-left transition"
                    >
                      #{o.order_number}
                    </button>
                    <span
                      className={`text-[11px] px-2.5 py-0.5 rounded-md font-bold uppercase tracking-wide border ${statusInfo.color}`}
                    >
                      {statusInfo.label}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
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

              {/* Customer Info & Address Card */}
              <div className="bg-slate-50 rounded-lg p-3 mb-3 border border-slate-100">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm">👤</span>
                    <p className="text-xs font-bold text-slate-800 truncate">
                      {o.profiles?.name || o.customer_name || "Customer"}
                    </p>
                  </div>
                  {o.profiles?.phone ? (
                    <a
                      href={`tel:${o.profiles.phone}`}
                      className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1"
                    >
                      <span>📱</span>
                      <span>{o.profiles.phone}</span>
                    </a>
                  ) : (
                    <p className="text-xs text-slate-400">
                      {o.profiles?.email || "No phone recorded"}
                    </p>
                  )}
                </div>

                {o.delivery_type !== "self_pickup" && (
                  <div className="mt-2 pt-2 border-t border-slate-200/60 text-xs text-slate-600">
                    <p className="font-semibold text-slate-700">📍 Delivery Address:</p>
                    <p className="mt-0.5 text-[11px] text-slate-600 leading-relaxed">
                      {address.full_address ||
                        address.address_line ||
                        [address.street, address.city, address.pincode]
                          .filter(Boolean)
                          .join(", ") ||
                        "Address saved in customer profile"}
                    </p>
                  </div>
                )}
              </div>
                 {/* Ordered Items with Weight (Kg) Breakdown */}
              {orderItems.length > 0 && (
                <div className="bg-white rounded-lg border border-slate-200 p-3 mb-3 space-y-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Packaged Items ({orderItems.length})
                  </p>
                  <div className="space-y-2">
                    {orderItems.map((item: any, idx: number) => {
                      const itemName = resolveItemName(item);
                      const itemImg = resolveImageUrl(item);
                      const qty = Number(item.quantity || item.qty || item.count || 1);
                      const price = Number(item.price || item.unit_price || 0);
                      const subtotal = (price * qty).toFixed(2);

                      const p = item?.products || item?.product || {};
                      const unitWeight = Number(p.weight || item.weight || 0);
                      const totalWeight = unitWeight * qty;

                      return (
                        <div
                          key={item.id || idx}
                          className="flex items-center justify-between gap-2 text-xs py-1 border-b border-slate-100 last:border-b-0"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {itemImg ? (
                              <img
                                src={itemImg}
                                alt={itemName}
                                className="w-9 h-9 object-cover rounded-md border border-slate-200 bg-white flex-shrink-0"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = "none";
                                }}
                              />
                            ) : (
                              <div className="w-9 h-9 bg-slate-100 rounded-md flex items-center justify-center text-sm flex-shrink-0">
                                🛍️
                              </div>
                            )}

                            <div className="min-w-0">
                              <p className="font-semibold text-slate-800 text-xs truncate">
                                {itemName}
                              </p>
                              <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                                <span>₹{price} × {qty}</span>
                                {totalWeight > 0 && (
                                  <span className="font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded">
                                    {totalWeight.toFixed(2)} Kg
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <span className="font-bold text-slate-800 flex-shrink-0 text-xs">
                            ₹{subtotal}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Amount Breakdown */}
              <div className="bg-slate-50 rounded-lg border border-slate-100 p-2.5 mb-3 text-xs">
                <div className="flex justify-between font-semibold">
                  <span className="text-slate-600">Total Bill</span>
                  <span className="text-slate-900 font-bold">₹{o.total_amount}</span>
                </div>
                {o.payment_type === "partial" && (
                  <div className="flex justify-between pt-1 border-t border-slate-200/50 mt-1">
                    <span className="text-emerald-700">Advance Paid: ₹{o.partial_payment_amount}</span>
                    <span className="text-amber-700 font-bold">COD Due: ₹{codAmount.toFixed(2)}</span>
                  </div>
                )}
              </div>

              {/* Badges Row */}
              <div className="flex flex-wrap items-center gap-1.5 mb-3 text-[11px]">
                <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-700 font-medium">
                  {o.delivery_type === "self_pickup" ? "🚶 Pickup" : "🏠 Home Delivery"}
                </span>
                <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded font-medium">
                  {o.payment_type === "full" ? "Full Payment" : "Advance Paid"}
                </span>
                <span
                  className={`px-2 py-0.5 rounded font-semibold ${
                    o.payment_status === "success"
                      ? "bg-emerald-50 text-emerald-700"
                      : o.payment_status === "pending"
                      ? "bg-amber-50 text-amber-700"
                      : "bg-rose-50 text-rose-700"
                  }`}
                >
                  Payment: {o.payment_status}
                </span>
              </div>

              {/* Action Controls */}
              <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                {/* Dynamic Safe Status Selector */}
                {o.order_status !== "delivered" && o.order_status !== "refund" ? (
                  <select
                    value={o.order_status}
                    onChange={(e) => onStatusChange(o, e.target.value)}
                    className="flex-1 text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 font-semibold bg-white outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {allowedTransitions.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="flex-1">
                    {o.order_status === "delivered" ? (
                      <button
                        onClick={() => onStatusChange(o, "refund")}
                        className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5"
                      >
                        🔄 Initiate Refund
                      </button>
                    ) : (
                      <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-md border border-rose-200">
                        Refund Processed
                      </span>
                    )}
                  </div>
                )}

                {canPrint && (
                  <button
                    onClick={() => onDownload(o)}
                    disabled={generatingLabel}
                    className="bg-slate-800 hover:bg-slate-900 text-white text-xs px-3 py-1.5 rounded-lg font-semibold disabled:opacity-50 flex items-center gap-1 transition shadow-xs"
                    title="Download Label"
                  >
                    📥 Label
                  </button>
                )}

                {o.order_status === "spam" && (
                  <button
                    onClick={() => onDelete(o)}
                    className="bg-rose-600 hover:bg-rose-700 text-white text-xs px-3 py-1.5 rounded-lg font-semibold transition"
                    title="Permanently Delete"
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
