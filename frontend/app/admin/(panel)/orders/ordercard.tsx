"use client";

// ১. page.tsx থেকে সরাসরি আসল Order টাইপ ইমপোর্ট করুন (import type হিসেবে)
import type { Order } from "./page";

// ২. হ্যান্ডলারগুলোতে 'void | Promise<void>' দিন এবং অপশনাল (?) রাখুন
type OrderCardProps = {
  order: Order;
  isExpanded: boolean;
  onToggleExpand: () => void;
  actionLoading?: boolean;
  imageLoading?: boolean;
  onStatusChange?: (orderId: string, nextStatus: string) => void | Promise<void>;
  onApprovePayment?: (order: Order) => void | Promise<void>;
  onRejectClick?: (order: Order) => void | Promise<void>;
  onViewScreenshot?: (url: string | null) => void;
  onRefundClick?: (order: Order) => void | Promise<void>;
  onPrintSlip?: (order: Order) => void;
};

export default function OrderCard({
  order,
  isExpanded,
  onToggleExpand,
  actionLoading = false,
  imageLoading = false,
  onStatusChange,
  onApprovePayment,
  onRejectClick,
  onViewScreenshot,
  onRefundClick,
  onPrintSlip,
}: OrderCardProps) {
  const customerName = (order as any).profile?.name || "Customer";
  const customerPhone = (order as any).profile?.phone || "";
  const isPickup =
    (order as any).delivery_type === "pickup" ||
    (order as any).delivery_type === "self_pickup" ||
    (order as any).delivery_type === "self";
  const proofUrl = (order as any).payment_screenshot_url;
  const utrNumber = (order as any).upi_transaction_id;
  
};

export default function OrderCard({
  order,
  isExpanded,
  onToggleExpand,
  actionLoading = false,
  imageLoading = false,
  onStatusChange,
  onApprovePayment,
  onRejectClick,
  onViewScreenshot,
  onRefundClick,
  onPrintSlip,
}: OrderCardProps) {
  const customerName = order.profile?.name || "Customer";
  const customerPhone = order.profile?.phone || "";
  const isPickup =
    order.delivery_type === "pickup" ||
    order.delivery_type === "self_pickup" ||
    order.delivery_type === "self";
  const proofUrl = order.payment_screenshot_url;
  const utrNumber = order.upi_transaction_id;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs transition">
      {/* Card Header / Summary */}
      <div
        onClick={onToggleExpand}
        className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-slate-50 select-none"
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900 text-sm">
              #{order.order_number || order.id}
            </span>

            {/* Status Badge */}
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                order.order_status === "delivered"
                  ? "bg-emerald-100 text-emerald-800"
                  : order.order_status === "current"
                  ? "bg-blue-100 text-blue-800"
                  : order.order_status === "out_for_delivery"
                  ? "bg-purple-100 text-purple-800"
                  : order.order_status === "spam"
                  ? "bg-rose-100 text-rose-800"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {order.order_status}
            </span>

            {/* Delivery Type Badge */}
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600">
              {isPickup ? "🏪 Pickup" : "🏠 Delivery"}
            </span>
          </div>

          <p className="text-xs text-slate-600 font-medium">
            👤 {customerName} {customerPhone ? `(${customerPhone})` : ""}
          </p>
        </div>

        <div className="text-right flex items-center gap-3">
          <div>
            <p className="text-sm font-black text-slate-900">
              ₹{Number(order.total_amount || 0).toFixed(2)}
            </p>
            <p className="text-[10px] text-slate-500 font-semibold">
              {order.payment_status === "success" || order.payment_status === "full" ? (
                <span className="text-emerald-700 font-bold">✓ Paid</span>
              ) : (
                <span className="text-amber-700 font-medium capitalize">
                  {order.payment_status || "Pending"}
                </span>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
