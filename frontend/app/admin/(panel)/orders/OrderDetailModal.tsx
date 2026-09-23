"use client";

import { useState } from "react";

type OrderItem = {
  id?: string;
  product_name?: string;
  name?: string;
  price?: number;
  unit_price?: number;
  quantity?: number;
  qty?: number;
  weight?: number;
  products?: {
    name_en?: string;
    name_bn?: string;
    name?: string;
    title?: string;
    weight?: number;
    images?: any;
    image_url?: string;
  };
};

type Order = {
  id: string;
  order_number: string;
  delivery_type: string;
  payment_type: string;
  subtotal?: number;
  delivery_charge?: number;
  total_amount: number;
  paid_amount?: number;
  remaining_amount?: number;
  partial_payment_amount?: number;
  payment_status: string;
  order_status: string;
  refund_reason?: string | null;
  refund_amount?: number | null;
  refund_method?: string | null;
  refund_note?: string | null;
  refunded_at?: string | null;
  customer_upi?: string | null;
  upi_id?: string | null;
  transaction_ref?: string | null;
  created_at: string;
  delivered_at?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  order_items?: OrderItem[];
  items?: OrderItem[];
  profiles?: {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
  addresses?: {
    full_address?: string;
    address_line?: string;
    street?: string;
    city?: string;
    pincode?: string;
  } | null;
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: "Pending", color: "bg-amber-100 text-amber-800 border-amber-200" },
  current: { label: "Current Order", color: "bg-blue-100 text-blue-800 border-blue-200" },
  out_for_delivery: { label: "Out for Delivery", color: "bg-indigo-100 text-indigo-800 border-indigo-200" },
  delivered: { label: "Delivered", color: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  refund: { label: "Refunded", color: "bg-rose-100 text-rose-800 border-rose-200" },
  spam: { label: "Spam", color: "bg-red-100 text-red-800 border-red-200" },
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
    item.name_bn ||
    "Grocery Product"
  );
}

export default function OrderDetailModal({
  order,
  onClose,
}: {
  order: Order;
  onClose: () => void;
}) {
  const [copiedUpi, setCopiedUpi] = useState(false);

  const rawItems: OrderItem[] = Array.isArray(order.order_items)
    ? order.order_items
    : Array.isArray(order.items)
    ? order.items
    : [];

  const customerName = order.profiles?.name || order.customer_name || "Customer";
  const customerPhone = order.profiles?.phone || order.customer_phone;
  const customerEmail = order.profiles?.email;
  const customerUpi = order.customer_upi || order.upi_id;
  const address = order.addresses;
  const statusMeta = STATUS_CONFIG[order.order_status] || {
    label: order.order_status,
    color: "bg-slate-100 text-slate-700 border-slate-200",
  };

  const codDue =
    order.payment_type === "partial"
      ? (order.total_amount || 0) - (order.partial_payment_amount || order.paid_amount || 0)
      : 0;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto backdrop-blur-xs">
      <div className="bg-white rounded-2xl w-full max-w-xl p-6 my-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">
                Order #{order.order_number}
              </h2>
              <span
                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-md uppercase tracking-wider border ${statusMeta.color}`}
              >
                {statusMeta.label}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Placed on: {new Date(order.created_at).toLocaleString("en-IN", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-xl font-bold leading-none p-1"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto flex-1 pr-1 space-y-4 text-xs">
          {/* 1. Customer & Address Details */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 text-sm">👤 {customerName}</span>
              {customerPhone ? (
                <a
                  href={`tel:${customerPhone}`}
                  className="font-semibold text-blue-600 hover:underline flex items-center gap-1"
                >
                  📱 {customerPhone}
                </a>
              ) : (
                <span className="text-slate-400">No phone</span>
              )}
            </div>
            {customerEmail && (
              <p className="text-slate-500 text-[11px]">✉️ {customerEmail}</p>
            )}

            {order.delivery_type === "self_pickup" ? (
              <p className="text-emerald-700 font-semibold pt-1 border-t border-slate-200/60">
                🏬 Store Self-Pickup Order
              </p>
            ) : (
              <div className="pt-2 border-t border-slate-200/60">
                <p className="font-semibold text-slate-700">📍 Delivery Address:</p>
                <p className="text-slate-600 mt-0.5 leading-relaxed">
                  {address?.full_address ||
                    address?.address_line ||
                    [address?.street, address?.city, address?.pincode]
                      .filter(Boolean)
                      .join(", ") ||
                    "Standard address recorded"}
                </p>
              </div>
            )}
          </div>

          {/* 2. Ordered Items List with Weight & Subtotals */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <p className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                Packaged Items ({rawItems.length})
              </p>
              <span className="text-[10px] text-slate-400">Verified Unit Weights</span>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
              {rawItems.length === 0 ? (
                <p className="p-4 text-center text-slate-400">No item details recorded</p>
              ) : (
                rawItems.map((item, idx) => {
                  const name = resolveItemName(item);
                  const qty = Number(item.quantity || item.qty || 1);
                  const price = Number(item.price || item.unit_price || 0);
                  const p = item.products || {};
                  const unitWeight = Number(p.weight || item.weight || 0);
                  const itemWeight = unitWeight * qty;

                  return (
                    <div
                      key={item.id || idx}
                      className="p-3 bg-white flex items-center justify-between gap-3 hover:bg-slate-50/50"
                    >
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800 text-xs truncate">{name}</p>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                          <span>₹{price} × {qty}</span>
                          {itemWeight > 0 && (
                            <span className="font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded">
                              {itemWeight.toFixed(2)} Kg
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="font-bold text-slate-900">
                        ₹{(price * qty).toFixed(2)}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
                    {/* 3. Financial & Payment Breakdown */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 space-y-2">
            <p className="font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
              Financial Summary
            </p>
            <div className="space-y-1.5">
              {order.subtotal !== undefined && (
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span>₹{order.subtotal}</span>
                </div>
              )}
              {order.delivery_charge !== undefined && (
                <div className="flex justify-between text-slate-600">
                  <span>Delivery Charge</span>
                  <span>₹{order.delivery_charge}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-slate-900 pt-1.5 border-t border-slate-200">
                <span className="text-sm">Total Billed</span>
                <span className="text-sm text-blue-600">₹{order.total_amount}</span>
              </div>

              {order.payment_type === "partial" ? (
                <>
                  <div className="flex justify-between text-emerald-700 font-medium pt-1">
                    <span>Advance Paid</span>
                    <span>₹{order.partial_payment_amount || order.paid_amount || 0}</span>
                  </div>
                  <div className="flex justify-between text-amber-700 font-bold">
                    <span>COD Balance Due</span>
                    <span>₹{codDue.toFixed(2)}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between text-emerald-700 font-medium pt-1">
                  <span>Payment Mode</span>
                  <span className="capitalize">{order.payment_type} Payment</span>
                </div>
              )}
            </div>
          </div>

          {/* 4. Customer UPI Information */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                Customer UPI ID
              </p>
              <p className="font-mono font-bold text-blue-700 text-xs mt-0.5">
                {customerUpi || "No UPI recorded"}
              </p>
            </div>
            {customerUpi && (
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(customerUpi);
                  setCopiedUpi(true);
                  setTimeout(() => setCopiedUpi(false), 2000);
                }}
                className="bg-blue-50 text-blue-700 hover:bg-blue-100 px-3 py-1.5 rounded-lg font-semibold text-[11px] border border-blue-200 transition"
              >
                {copiedUpi ? "✓ Copied" : "📋 Copy UPI"}
              </button>
            )}
          </div>

          {/* 5. Granular Refund Audit Trail */}
          {order.order_status === "refund" && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 space-y-1.5">
              <div className="flex justify-between items-center pb-1.5 border-b border-rose-200">
                <p className="font-bold text-rose-900 text-xs">🔄 Refund Audit Record</p>
                <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded">
                  Method: {order.refund_method || "UPI"}
                </span>
              </div>
              <div className="flex justify-between text-rose-800">
                <span>Refund Reason:</span>
                <span className="font-semibold capitalize">{order.refund_reason || "General Issue"}</span>
              </div>
              <div className="flex justify-between text-rose-900 font-bold">
                <span>Refunded Amount:</span>
                <span>₹{order.refund_amount || 0}</span>
              </div>
              {order.transaction_ref && (
                <div className="flex justify-between text-rose-800 font-mono text-[11px]">
                  <span>UTR / Ref No:</span>
                  <span className="font-bold">{order.transaction_ref}</span>
                </div>
              )}
              {order.refunded_at && (
                <p className="text-[10px] text-rose-600 pt-1">
                  Settled at: {new Date(order.refunded_at).toLocaleString("en-IN")}
                </p>
              )}
            </div>
          )}

          {/* 6. Timeline Audit */}
          {order.delivered_at && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 flex items-center justify-between text-[11px] text-emerald-800 font-medium">
              <span>✅ Delivered Timestamp:</span>
              <span className="font-bold">
                {new Date(order.delivered_at).toLocaleString("en-IN", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-100 flex-shrink-0">
          <button
            onClick={onClose}
            className="w-full py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700 font-semibold text-xs transition"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
}
