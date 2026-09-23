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

  if (Array.isArray(target) && target.length > 0) {
    target = target[0];
  }

  if (typeof target === "string") {
    const trimmed = target.trim();
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed) && parsed.length > 0) {
          target = parsed[0];
        }
      } catch {
        target = trimmed.replace(/[\[\]"']/g, "");
      }
    }
  }

  if (typeof target !== "string" || !target.trim()) return null;
  target = target.trim();

  if (target.startsWith("http://") || target.startsWith("https://")) {
    return target;
  }

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
      color: "bg-gray-100 text-gray-700",
    };

  return (
    <div>
      {/* Select All Bar */}
      <div className="bg-white rounded-xl px-4 py-3 mb-3 flex items-center gap-3 border border-gray-200 shadow-sm">
        <input
          type="checkbox"
          checked={selected.length === orders.length && orders.length > 0}
          onChange={onToggleSelectAll}
          className="w-5 h-5 accent-blue-600 cursor-pointer"
        />
        <span className="text-sm text-gray-600 font-medium">
          Select All ({orders.length})
        </span>
      </div>

      {/* Orders List */}
      <div className="space-y-3">
        {orders.map((o) => {
          const statusInfo = getStatusInfo(o.order_status);
          const isSelected = selected.includes(o.id);
          const canPrint = canPrintLabel(o);
          const codAmount = (o.total_amount || 0) - (o.partial_payment_amount || 0);

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
              className={`bg-white rounded-xl border-2 p-4 transition ${
                isSelected ? "border-blue-500 bg-blue-50/40" : "border-gray-200"
              }`}
            >
              {/* Header Row */}
              <div className="flex items-start gap-3 mb-3">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onToggleSelect(o.id)}
                  className="mt-1 w-5 h-5 accent-blue-600 flex-shrink-0 cursor-pointer"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <button
                      onClick={() => onView(o)}
                      className="font-bold text-gray-900 text-sm hover:text-blue-600 text-left transition"
                    >
                      {o.order_number}
                    </button>
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-semibold flex-shrink-0 ${statusInfo.color}`}
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

              {/* Customer Info & Direct Delivery Address */}
              <div className="bg-gray-50 rounded-lg p-3 mb-3">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm">👤</span>
                    <p className="text-sm font-semibold text-gray-800 truncate">
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
                    <p className="text-xs text-gray-400">
                      {o.profiles?.email || "No phone"}
                    </p>
                  )}
                </div>

                {/* Delivery Address (Directly Visible) */}
                {o.delivery_type !== "self_pickup" && (
                  <div className="mt-2 pt-2 border-t border-gray-200/70 text-xs text-gray-600">
                    <p className="font-semibold text-gray-700">📍 Delivery Address:</p>
                    <p className="mt-0.5 leading-relaxed">
                      {address.full_address ||
                        address.address_line ||
                        [address.street, address.city, address.pincode]
                          .filter(Boolean)
                          .join(", ") ||
                        "Address saved in record"}
                    </p>
                  </div>
                )}
              </div>
              
