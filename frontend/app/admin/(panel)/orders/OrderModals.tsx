"use client";

import React, { useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";

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

interface OrderModalsProps {
  orders: Order[];
  selectedDate: string;
  showPicklist: boolean;
  onClosePicklist: () => void;
  rejectingOrder: Order | null;
  onCloseReject: () => void;
  actionLoading: boolean;
  setActionLoading: (loading: boolean) => void;
  zoomedImage: string | null;
  onCloseZoom: () => void;
  onSuccess: () => void;
}

export default function OrderModals({
  orders,
  selectedDate,
  showPicklist,
  onClosePicklist,
  rejectingOrder,
  onCloseReject,
  actionLoading,
  setActionLoading,
  zoomedImage,
  onCloseZoom,
  onSuccess,
}: OrderModalsProps) {
  const supabase = createClient();
  const [rejectReason, setRejectReason] = useState("");

  // শুধুমাত্র CURRENT অর্ডারের মোট পণ্য একত্রিত (Aggregate) করার লজিক
  const { picklistItems, currentOrdersCount } = useMemo(() => {
    const currentOrders = orders.filter((o) => o.order_status === "current");
    const itemMap: Record<
      string,
      { name: string; quantity: number; unit: string; count: number }
    > = {};

    currentOrders.forEach((order) => {
      (order.items || []).forEach((item) => {
        const name = (item.product_name || item.name || "Unknown").trim();
        const unit = (item.unit || "পিস").trim();
        const key = `${name.toLowerCase()}__${unit.toLowerCase()}`;

        if (!itemMap[key]) {
          itemMap[key] = {
            name,
            quantity: 0,
            unit,
            count: 0,
          };
        }
        itemMap[key].quantity += Number(item.quantity || 0);
        itemMap[key].count += 1;
      });
    });

    const list = Object.values(itemMap).sort((a, b) =>
      a.name.localeCompare(b.name)
    );

    return {
      picklistItems: list,
      currentOrdersCount: currentOrders.length,
    };
  }, [orders]);

  // মাস্টার পিকলিস্ট প্রিন্ট
  const handlePrintPicklist = () => {
    const printWin = window.open("", "_blank");
    if (!printWin) return;
    printWin.document.write(`
      <html>
        <head>
          <title>Master Picklist - ${selectedDate}</title>
          <style>
            body { font-family: sans-serif; padding: 20px; font-size: 13px; color: #111; }
            h2 { margin: 0 0 4px 0; text-align: center; }
            p { text-align: center; margin: 0 0 16px 0; color: #555; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #ccc; padding: 8px 10px; text-align: left; }
            th { background-color: #f4f4f4; font-weight: bold; }
            .text-center { text-align: center; }
          </style>
        </head>
        <body>
          <h2>Quickpin Packing Picklist (Current Orders Only)</h2>
          <p>Date: ${selectedDate} | Total Current Orders: ${currentOrdersCount}</p>
          <table>
            <thead>
              <tr>
                <th style="width: 40px;">#</th>
                <th>Product Name</th>
                <th class="text-center">Total Quantity</th>
                <th class="text-center">Total Orders</th>
              </tr>
            </thead>
            <tbody>
              ${picklistItems
                .map(
                  (item, idx) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td><strong>${item.name}</strong></td>
                  <td class="text-center"><strong>${item.quantity}</strong>${item.unit}</td>
                  <td class="text-center">${item.count}</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
          <script>window.onload = () => { window.print(); window.close(); };</script>
        </body>
      </html>
    `);
    printWin.document.close();
  };

  // স্ক্রিনশট রিজেক্ট সাবমিট
  const handleRejectSubmit = async () => {
    if (!rejectingOrder || !rejectReason.trim()) {
      alert("দয়া করে রিজেক্ট করার কারণ নির্বাচন বা উল্লেখ করুন");
      return;
    }
    setActionLoading(true);
    const { error } = await supabase
      .from("orders")
      .update({
        screenshot_status: "rejected",
        rejection_reason: rejectReason.trim(),
        order_status: "pending",
        status_changed_at: new Date().toISOString(),
      })
      .eq("id", rejectingOrder.id);

    setActionLoading(false);
    if (error) {
      alert("রিজেক্ট করা যায়নি: " + error.message);
      return;
    }
    setRejectReason("");
    onCloseReject();
    onSuccess();
  };

  return (
    <>
      {/* ১. MASTER PICKLIST MODAL (Only Current Orders) */}
      {showPicklist && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3">
          <div className="bg-white w-full max-w-lg rounded-2xl p-4 shadow-xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                  📋 Master Picklist
                </h3>
                <p className="text-[11px] font-semibold text-emerald-600">
                  Current Orders: {currentOrdersCount} টি
                </p>
              </div>
              <button
                onClick={onClosePicklist}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* আইটেম তালিকা */}
            <div className="flex-1 overflow-y-auto py-2 space-y-1.5 divide-y divide-slate-100">
              {picklistItems.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400 font-semibold">
                  প্যাকিংয়ের জন্য বর্তমানে কোনো কারেন্ট অর্ডার নেই।
                </div>
              ) : (
                picklistItems.map((item, index) => (
                  <div
                    key={index}
                    className="pt-1.5 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-slate-800">
                        {item.name}
                      </span>
                      <span className="text-[10px] text-slate-400 ml-1.5">
                        ({item.count} টি অর্ডারে)
                      </span>
                    </div>
                    <div className="font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      {item.quantity} {item.unit}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* ফুটার অ্যাকশন বাটন */}
            <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
              <button
                onClick={handlePrintPicklist}
                disabled={picklistItems.length === 0}
                className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
              >
                🖨️ Print Picklist
              </button>
              <button
                onClick={onClosePicklist}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ২. SCREENSHOT REJECT MODAL */}
      {rejectingOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3">
          <div className="bg-white w-full max-w-sm rounded-2xl p-4 shadow-xl space-y-3">
            <div>
              <h3 className="text-xs font-black text-slate-900">
                পেমেন্ট বাতিল / রিজেক্ট (#{rejectingOrder.order_number})
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                বাতিল করার কারণ নির্বাচন করুন:
              </p>
            </div>

            {/* দ্রুত কারণ বাটন (Chips) */}
            <div className="flex flex-wrap gap-1.5">
              {[
                "ভুয়ো স্ক্রিনশট",
                "UTR মেলেনি",
                "টাকার অঙ্ক অমিল",
                "স্ক্রিনশট অস্পষ্ট",
              ].map((reason) => (
                <button
                  key={reason}
                  type="button"
                  onClick={() => setRejectReason(reason)}
                  className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition ${
                    rejectReason === reason
                      ? "bg-rose-50 border-rose-300 text-rose-700"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {reason}
                </button>
              ))}
            </div>

            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="অন্য কোনো কারণ থাকলে লিখুন..."
              rows={2}
              className="w-full text-xs p-2 rounded-xl border border-slate-200 outline-none focus:ring-1 focus:ring-rose-500"
            />

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handleRejectSubmit}
                disabled={actionLoading || !rejectReason.trim()}
                className="flex-1 py-1.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition"
              >
                {actionLoading ? "প্রসেস হচ্ছে..." : "কনফার্ম রিজেক্ট"}
              </button>
              <button
                onClick={onCloseReject}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
              >
                বাতিল
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ৩. SCREENSHOT ZOOM MODAL */}
      {zoomedImage && (
        <div
          onClick={onCloseZoom}
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            className="relative max-w-sm w-full bg-slate-900 rounded-2xl overflow-hidden p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onCloseZoom}
              className="absolute top-3 right-3 bg-black/60 text-white rounded-full w-7 h-7 flex items-center justify-center text-xs font-bold hover:bg-black"
            >
              ✕
            </button>
            <img
              src={zoomedImage}
              alt="Payment Proof"
              className="w-full max-h-[75vh] object-contain rounded-xl"
            />
          </div>
        </div>
      )}
    </>
  );
            }

