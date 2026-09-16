"use client";

type Order = {
  id: string;
  order_number: string;
  delivery_type: string;
  payment_type: string;
  subtotal: number;
  delivery_charge: number;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  payment_status: string;
  order_status: string;
  refund_reason: string | null;
  refund_amount: number | null;
  refund_method: string | null;
  profiles?: { name: string | null; email: string | null } | null;
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  current: "bg-green-100 text-green-700",
  out_for_delivery: "bg-blue-100 text-blue-700",
  delivered: "bg-emerald-100 text-emerald-700",
  refund: "bg-purple-100 text-purple-700",
  spam: "bg-red-100 text-red-700",
};

export default function OrderDetailModal({
  order,
  onClose,
}: {
  order: Order;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-lg p-6 my-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Order Details</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Order Number</span>
            <span className="font-bold text-gray-800">{order.order_number}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Customer</span>
            <span className="text-gray-800">{order.profiles?.name || "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Email</span>
            <span className="text-gray-800 text-xs">
              {order.profiles?.email || "—"}
            </span>
          </div>
          <hr className="border-gray-100" />
          <div className="flex justify-between">
            <span className="text-gray-500">Delivery Type</span>
            <span className="font-medium text-gray-800">
              {order.delivery_type === "self_pickup"
                ? "Self Pickup"
                : "Home Delivery"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Payment Type</span>
            <span className="font-medium text-gray-800">
              {order.payment_type === "full" ? "Full" : "Partial"}
            </span>
          </div>
          <hr className="border-gray-100" />
          <div className="flex justify-between">
            <span className="text-gray-500">Subtotal</span>
            <span className="text-gray-800">₹{order.subtotal}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Delivery Charge</span>
            <span className="text-gray-800">₹{order.delivery_charge}</span>
          </div>
          <div className="flex justify-between border-t border-gray-200 pt-2">
            <span className="font-bold text-gray-800">Total</span>
            <span className="font-bold text-blue-600">₹{order.total_amount}</span>
          </div>
          <div className="flex justify-between text-green-700">
            <span>Paid</span>
            <span className="font-medium">₹{order.paid_amount}</span>
          </div>
          <div className="flex justify-between text-orange-700">
            <span>Remaining</span>
            <span className="font-medium">₹{order.remaining_amount}</span>
          </div>
          <hr className="border-gray-100" />
          <div className="flex justify-between">
            <span className="text-gray-500">Payment Status</span>
            <span className="font-medium">{order.payment_status}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Order Status</span>
            <span
              className={`text-xs px-2 py-1 rounded-full font-medium ${
                STATUS_COLORS[order.order_status] || "bg-gray-100 text-gray-700"
              }`}
            >
              {order.order_status}
            </span>
          </div>

          {order.order_status === "refund" && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mt-3">
              <p className="font-medium text-purple-800 mb-1">Refund Info</p>
              <p className="text-xs text-purple-700">
                Reason: {order.refund_reason}
              </p>
              <p className="text-xs text-purple-700">
                Amount: ₹{order.refund_amount}
              </p>
              <p className="text-xs text-purple-700">
                Method: {order.refund_method}
              </p>
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          className="w-full mt-5 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 font-medium"
        >
          Close
        </button>
      </div>
    </div>
  );
}
