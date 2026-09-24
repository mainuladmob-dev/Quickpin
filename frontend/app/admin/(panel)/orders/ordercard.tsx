"use client";

import { Order } from "./page";

type OrderCardProps = {
  order: Order;
  isExpanded: boolean;
  onToggleExpand: () => void;
  actionLoading: boolean;
  imageLoading: boolean;
  onStatusChange: (orderId: string, nextStatus: string) => void;
  onApprovePayment: (order: Order) => void;
  onRejectClick: (order: Order) => void;
  onViewScreenshot: (url?: string | null) => void;
  onRefundClick: (order: Order) => void;
  onPrintSlip: (order: Order) => void;
};

export default function OrderCard({
  order,
  isExpanded,
  onToggleExpand,
  actionLoading,
  imageLoading,
  onStatusChange,
  onApprovePayment,
  onRejectClick,
  onViewScreenshot,
  onRefundClick,
  onPrintSlip,
}: OrderCardProps) {
  const customerName = order.profile?.name || "Customer";
  const customerPhone = order.profile?.phone || "";
  const isPickup = order.delivery_type === "pickup" || order.delivery_type === "self_pickup";
  const proofUrl = order.payment_screenshot_url;
  const utrNumber = order.upi_transaction_id;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs transition">
      {/* অ্যাকর্ডিয়ন হেডার */}
      <div
        onClick={onToggleExpand}
        className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-slate-50 select-none"
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900 text-sm">
              #{order.order_number}
            </span>
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
              ₹{Number(order.total_amount).toFixed(2)}
            </p>
            <p className="text-[10px] text-slate-500 font-semibold">
              {order.payment_status === "success" ? (
                <span className="text-emerald-700 font-bold">✓ Paid</span>
              ) : (
                <span className="text-amber-700">
                  Due: ₹{Number(order.remaining_amount || order.total_amount).toFixed(2)}
                </span>
              )}
            </p>
          </div>
          <span className="text-slate-400 font-bold text-xs">
            {isExpanded ? "▲" : "▼"}
          </span>
        </div>
      </div>

      {/* অ্যাকর্ডিয়ন বডি */}
      {isExpanded && (
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 space-y-4">
          {/* কাস্টমার ও ডেলিভারি তথ্য */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 text-xs space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">গ্রাহক:</span>
              <span className="font-bold text-slate-800">{customerName}</span>
            </div>
            {customerPhone && (
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">মোবাইল নম্বর:</span>
                <a
                  href={`tel:${customerPhone}`}
                  className="text-blue-600 font-bold flex items-center gap-1 hover:underline"
                >
                  📞 {customerPhone} (কল করুন)
                </a>
              </div>
            )}
            <div className="flex justify-between items-start">
              <span className="text-slate-500 font-medium">ঠিকানা:</span>
              <span className="font-medium text-slate-800 text-right max-w-[240px]">
                {order.delivery_address || order.profile?.address || "দোকান থেকে পিকআপ"}
              </span>
            </div>
          </div>

          {/* আইটেম তালিকা */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 text-xs">
            <p className="font-bold text-slate-700 mb-2 border-b border-slate-100 pb-1">
              📦 অর্ডারের পণ্যের ফর্দ:
            </p>
            <div className="space-y-1.5">
              {(order.items || []).map((item, idx) => (
                <div key={idx} className="flex justify-between items-center text-slate-700">
                  <span>
                    {item.product_name || item.name} × <strong>{item.quantity} {item.unit || "unit"}</strong>
                  </span>
                  <span className="font-semibold">
                    ₹{Number((item.unit_price || item.price || 0) * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* পেমেন্ট ও স্ক্রিনশট অডিট বক্স */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-500">পেমেন্ট মেথড ও টাইপ:</span>
              <span className="font-bold text-slate-800 capitalize">
                {order.payment_type} ({order.payment_method || "UPI"})
              </span>
            </div>
            {utrNumber && (
              <div className="flex justify-between">
                <span className="text-slate-500">UPI Ref / UTR:</span>
                <span className="font-mono font-bold text-slate-800">{utrNumber}</span>
              </div>
            )}

            {/* স্ক্রিনশট প্রিভিউ বাটন */}
            {proofUrl && (
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-slate-500">পেমেন্ট স্ক্রিনশট:</span>
                <button
                  onClick={() => onViewScreenshot(proofUrl)}
                  disabled={imageLoading}
                  className="bg-blue-50 text-blue-700 border border-blue-200 font-bold px-3 py-1 rounded-lg text-xs hover:bg-blue-100 flex items-center gap-1"
                >
                  📸 {imageLoading ? "লোড হচ্ছে..." : "স্ক্রিনশট দেখুন"}
                </button>
              </div>
            )}

            {order.rejection_reason && (
              <div className="bg-rose-50 text-rose-700 p-2 rounded-lg border border-rose-200 text-[11px]">
                <strong>রিজেক্ট নোট:</strong> {order.rejection_reason}
              </div>
            )}
          </div>

          {/* অ্যাকশন বাটনসমূহ */}
          <div className="flex flex-wrap gap-2 pt-2">
            {/* পেমেন্ট কনফার্ম / রিজেক্ট */}
            {order.payment_status === "pending" && proofUrl && (
              <>
                <button
                  onClick={() => onApprovePayment(order)}
                  disabled={actionLoading}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition"
                >
                  ✓ কনফার্ম পেমেন্ট
                </button>
                <button
                  onClick={() => onRejectClick(order)}
                  disabled={actionLoading}
                  className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold rounded-xl text-xs transition"
                >
                  ✕ রিজেক্ট স্ক্রিনশট
                </button>
              </>
            )}

            {/* স্ট্যাটাস পরিবর্তন */}
            {order.order_status === "current" && (
              <button
                onClick={() => onStatusChange(order.id, "out_for_delivery")}
                disabled={actionLoading}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition"
              >
                🚚 Out for Delivery-তে পাঠান
              </button>
            )}

            {order.order_status === "out_for_delivery" && (
              <button
                onClick={() => onStatusChange(order.id, "delivered")}
                disabled={actionLoading}
                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition"
              >
                ✓ ডেলিভারি সম্পন্ন করুন
              </button>
            )}

            {/* রিফান্ড */}
            {order.order_status === "delivered" && (
              <button
                onClick={() => onRefundClick(order)}
                className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold rounded-xl text-xs transition"
              >
                💰 রিফান্ড দিন
              </button>
            )}

            {/* স্লিপ প্রিন্ট */}
            <button
              onClick={() => onPrintSlip(order)}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-bold rounded-xl text-xs transition"
            >
              🖨️ প্রিন্ট স্লিপ
            </button>
          </div>
        </div>
      )}
    </div>
  );
                }

