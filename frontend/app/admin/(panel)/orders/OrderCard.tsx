"use client";

import React from "react";

export type OrderItem = {
  id: string;
  product_name?: string;
  name?: string;
  quantity: number;
  unit_price?: number;
  price?: number;
  unit?: string;
  weight?: number;
};

export type Order = {
  id: string;
  order_number: string;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  payment_method: string | null;
  payment_status: string;
  payment_type: "full" | "partial";
  partial_payment_amount: number;
  upi_transaction_id?: string | null;
  payment_screenshot_url?: string | null;
  screenshot_status?: string;
  screenshot_attempts?: number;
  rejection_reason?: string | null;
  order_status: string;
  delivery_type?: string;
  delivery_address?: string | null;
  refund_amount?: number;
  created_at: string;
  user_id: string | null;
  profile?: {
    name?: string;
    phone?: string;
    email?: string;
    address?: string;
  } | null;
  items?: OrderItem[];
};

interface OrderCardProps {
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
}

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
  // ৪টি মোড নির্ণয়ের লজিক
  const isPickup = order.delivery_type === "pickup" || order.delivery_type === "self_pickup";
  const isAdvance = order.payment_type === "partial" || Number(order.remaining_amount || 0) > 0;
  const remainingCash = Number(order.remaining_amount || 0);

  // মোড অনুযায়ী ব্যাজ ও রঙ নির্ধারণ
  const getDeliveryBadge = () => {
    if (!isPickup && !isAdvance) {
      return { label: "🏠 Home Full", bg: "bg-emerald-100 text-emerald-800 border-emerald-300" };
    }
    if (!isPickup && isAdvance) {
      return { label: "🏠 Home Advance", bg: "bg-amber-100 text-amber-900 border-amber-300" };
    }
    if (isPickup && !isAdvance) {
      return { label: "🏪 Self Full", bg: "bg-blue-100 text-blue-800 border-blue-300" };
    }
    return { label: "🏪 Self Advance", bg: "bg-orange-100 text-orange-900 border-orange-300" };
  };

  // ৭টি অর্ডার স্ট্যাটাস অনুযায়ী ট্যাগ
  const getStatusBadge = () => {
    switch (order.order_status) {
      case "current":
        return { label: "Current", bg: "bg-blue-50 text-blue-700 border-blue-200" };
      case "out_for_delivery":
        return { label: "Out for Delivery", bg: "bg-purple-50 text-purple-700 border-purple-200" };
      case "delivered":
        return { label: "Delivered", bg: "bg-emerald-50 text-emerald-700 border-emerald-200" };
      case "pending":
        return { label: "Pending", bg: "bg-amber-50 text-amber-700 border-amber-200" };
      case "refund":
        return { label: "Refund", bg: "bg-rose-50 text-rose-700 border-rose-200" };
      case "spam":
        return { label: "Spam", bg: "bg-slate-100 text-slate-600 border-slate-300" };
      default:
        return { label: order.order_status || "Unknown", bg: "bg-slate-50 text-slate-600 border-slate-200" };
    }
  };

  const deliveryBadge = getDeliveryBadge();
  const statusBadge = getStatusBadge();
  const customerName = order.profile?.name || "Customer";
  const customerPhone = order.profile?.phone;
  const deliveryAddress = order.delivery_address || order.profile?.address;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden transition hover:border-slate-300">
      {/* কার্ড হেডার: অর্ডার নম্বর, ৪টি মোড এবং স্ট্যাটাস */}
      <div className="p-3.5 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black text-slate-900 bg-white px-2 py-0.5 rounded-md border border-slate-200 shadow-2xs">
            #{order.order_number}
          </span>
          {/* ৪টি মোডের ব্যাজ */}
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${deliveryBadge.bg}`}>
            {deliveryBadge.label}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* বর্তমান স্ট্যাটাস ট্যাগ */}
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${statusBadge.bg}`}>
            {statusBadge.label}
          </span>
          {/* স্লিপ প্রিন্ট বাটন */}
          <button
            onClick={() => onPrintSlip(order)}
            title="Print Cash Memo"
            className="p-1 rounded-md text-slate-500 hover:text-slate-800 hover:bg-white border border-transparent hover:border-slate-200 transition text-xs"
          >
            🖨️
          </button>
        </div>
      </div>

      {/* কার্ড বডি: কাস্টমার ও টাকার বিস্তারিত */}
      <div className="p-3.5 space-y-2.5">
        {/* কাস্টমার ইনফো */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-black text-slate-800">{customerName}</p>
            {customerPhone ? (
              <a
                href={`tel:${customerPhone}`}
                className="text-[11px] font-bold text-blue-600 hover:underline inline-flex items-center gap-1 mt-0.5"
              >
                📞 {customerPhone}
              </a>
            ) : (
              <span className="text-[11px] text-slate-400">ফোন নম্বর নেই</span>
            )}
            {deliveryAddress && (
              <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                📍 {deliveryAddress}
              </p>
            )}
          </div>

          {/* টাকার হিসাব */}
          <div className="text-right shrink-0">
            <p className="text-xs font-black text-slate-900">
              ₹{Number(order.total_amount).toFixed(2)}
            </p>
            <p className="text-[10px] font-semibold text-emerald-600">
              জমা: ₹{Number(order.paid_amount || 0).toFixed(2)}
            </p>
          </div>
        </div>

        {/* বাকি টাকার লাল সতর্কতা (ডেলিভারি বয় / কাউন্টারের জন্য অত্যন্ত জরুরি) */}
        {remainingCash > 0 && (
          <div className="p-2 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between">
            <span className="text-[11px] font-bold text-rose-800 flex items-center gap-1">
              ⚠️ {isPickup ? "কাউন্টারে জমা নিতে হবে:" : "বাকি ক্যাশ তুলতে হবে:"}
            </span>
            <span className="text-xs font-black text-rose-700">
              ₹{remainingCash.toFixed(2)}
            </span>
          </div>
        )}

        {/* স্ক্রিনশট ও পেমেন্ট অ্যাকশন (পেন্ডিং পেমেন্ট হলে) */}
        {order.payment_status === "pending" && (
          <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-amber-900">
                পেমেন্ট পেন্ডিং রয়েছে
              </span>
              {order.payment_screenshot_url && (
                <button
                  onClick={() => onViewScreenshot(order.payment_screenshot_url)}
                  disabled={imageLoading}
                  className="text-[11px] font-bold text-blue-700 bg-white px-2 py-0.5 rounded-md border border-blue-200 hover:bg-blue-50"
                >
                  {imageLoading ? "লোড হচ্ছে..." : "📷 স্ক্রিনশট দেখুন"}
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => onApprovePayment(order)}
                disabled={actionLoading}
                className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-2xs"
              >
                পেমেন্ট অনুমোদন (Approve)
              </button>
              <button
                onClick={() => onRejectClick(order)}
                disabled={actionLoading}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition shadow-2xs"
              >
                বাতিল
              </button>
            </div>
          </div>
        )}

        {/* ৭টি স্ট্যাটাস ম্যানেজমেন্ট ও কুইক অ্যাকশন বাটন */}
        <div className="pt-1 flex items-center justify-between gap-2 flex-wrap">
          {/* স্ট্যাটাস পরিবর্তনের ড্রপডাউন */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-500">স্ট্যাটাস:</span>
            <select
              value={order.order_status}
              onChange={(e) => onStatusChange(order.id, e.target.value)}
              disabled={actionLoading}
              className="text-[11px] font-bold py-1 px-2 border border-slate-300 rounded-lg bg-slate-50 outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="current">Current Order</option>
              <option value="out_for_delivery">Out for Delivery</option>
              <option value="delivered">Delivered</option>
              <option value="pending">Pending</option>
              <option value="refund">Refund</option>
              <option value="spam">Spam</option>
            </select>
          </div>

          {/* কুইক অ্যাকশন বাটন */}
          <div className="flex items-center gap-1.5">
            {order.order_status === "current" && (
              <button
                onClick={() => onStatusChange(order.id, "out_for_delivery")}
                disabled={actionLoading}
                className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-bold rounded-lg transition"
              >
                🚚 Out for Delivery
              </button>
            )}

            {order.order_status === "out_for_delivery" && (
              <button
                onClick={() => onStatusChange(order.id, "delivered")}
                disabled={actionLoading}
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg transition"
              >
                ✅ Delivered
              </button>
            )}

            {order.order_status !== "refund" && (
              <button
                onClick={() => onRefundClick(order)}
                className="px-2 py-1 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-600 text-[11px] font-bold rounded-lg border border-slate-200 transition"
              >
                রিফান্ড
              </button>
            )}
          </div>
        </div>
      </div>

      {/* আইটেম তালিকা ড্রপডাউন টগল */}
      <div className="border-t border-slate-100 bg-slate-50/40">
        <button
          onClick={onToggleExpand}
          className="w-full py-1.5 px-3.5 flex items-center justify-between text-[11px] font-bold text-slate-600 hover:bg-slate-100/70 transition"
        >
          <span>পণ্য তালিকা ({(order.items || []).length} টি আইটেম)</span>
          <span>{isExpanded ? "▲ বন্ধ করুন" : "▼ বিস্তারিত দেখুন"}</span>
        </button>

        {isExpanded && (
          <div className="p-3 border-t border-slate-100 bg-white space-y-1.5">
            {(order.items || []).length === 0 ? (
              <p className="text-[11px] text-slate-400 text-center py-1">কোনো পণ্য পাওয়া যায়নি</p>
            ) : (
              order.items?.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between text-xs py-1 border-b border-slate-50 last:border-0"
                >
                  <span className="font-semibold text-slate-800">
                    {item.product_name || item.name}
                    <span className="text-slate-400 ml-1 text-[11px]">
                      ({item.quantity} {item.unit || "পিস"})
                    </span>
                  </span>
                  <span className="font-bold text-slate-700">
                    ₹{Number((item.unit_price || item.price || 0) * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

