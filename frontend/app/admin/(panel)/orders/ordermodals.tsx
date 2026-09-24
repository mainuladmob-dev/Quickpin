"use client";

import { useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";

// './page' থেকে ইমপোর্ট করার দরকার নেই, সরাসরি any টাইপ ব্যবহার করা হলো
type OrderModalsProps = {
  orders: any[];
  selectedDate?: string;
  showPicklist: boolean;
  onClosePicklist: () => void;
  rejectingOrder: any;
  onCloseReject: () => void;
  actionLoading?: boolean;
  setActionLoading?: (loading: boolean) => void;
  zoomedImage?: string | null;
  onCloseZoom: () => void;
  onSuccess?: () => void;
};

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

  // মাস্টার পিকলিস্ট হিসাব
  const picklistItems = useMemo(() => {
    const map: Record<string, { name: string; qty: number; unit: string; weight: number }> = {};
    orders
      .filter((o) => o.order_status === "current")
      .forEach((o) => {
        (o.items || []).forEach((item) => {
          const name = item.product_name || item.name || "Unknown Product";
          if (!map[name]) {
            map[name] = { name, qty: 0, unit: item.unit || "Unit", weight: 0 };
          }
          const q = Number(item.quantity || 0);
          map[name].qty += q;
          if (item.weight) map[name].weight += Number(item.weight) * q;
        });
      });
    return Object.values(map);
  }, [orders]);

  // স্ক্রিনশট রিজেক্ট করার ব্যাকএন্ড লজিক (সর্বোচ্চ ৩ বারের সুযোগ)
  const submitRejectScreenshot = async () => {
    if (!rejectingOrder || !rejectReason.trim()) {
      alert("অনুগ্রহ করে রিজেক্ট করার কারণ লিখুন");
      return;
    }
    setActionLoading(true);

    const newAttempts = Number(rejectingOrder.screenshot_attempts || 0) + 1;
    const maxAttempts = 3;

    const updateData: any = {
      payment_status: "pending",
      screenshot_status: "rejected",
      rejection_reason: rejectReason.trim(),
      screenshot_attempts: newAttempts,
    };

    if (newAttempts >= maxAttempts) {
      updateData.order_status = "spam";
      updateData.payment_status = "failed";
      updateData.status_changed_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from("orders")
      .update(updateData)
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
      {/* ১. মাস্টার পিকলিস্ট মোডাল */}
      {showPicklist && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-xl max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 text-sm">
                📋 Master Item Picklist ({selectedDate})
              </h3>
              <button
                onClick={onClosePicklist}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold"
              >
                ✕
              </button>
            </div>
            <div className="overflow-y-auto flex-1 space-y-2 py-3 pr-1">
              {picklistItems.length === 0 ? (
                <p className="text-center text-slate-400 py-6 text-xs">
                  কারেন্ট অর্ডারের কোনো আইটেম পাওয়া যায়নি।
                </p>
              ) : (
                picklistItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center p-2.5 bg-slate-50 rounded-xl text-xs border border-slate-100"
                  >
                    <span className="font-bold text-slate-800">{item.name}</span>
                    <span className="bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-full">
                      মোট: {item.qty} {item.unit} {item.weight > 0 ? `(${item.weight.toFixed(2)} Kg)` : ""}
                    </span>
                  </div>
                ))
              )}
            </div>
            <button
              onClick={onClosePicklist}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition"
            >
              বন্ধ করুন
            </button>
          </div>
        </div>
      )}

      {/* ২. রিজেক্ট স্ক্রিনশট মোডাল */}
      {rejectingOrder && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-xl space-y-3">
            <h3 className="font-bold text-slate-900 text-sm">
              স্ক্রিনশট রিজেক্ট করুন (#{rejectingOrder.order_number})
            </h3>
            <p className="text-xs text-slate-500">
              গ্রাহককে জানান কেন স্ক্রিনশটটি বাতিল করা হলো (যেমন: ছবি স্পষ্ট নয়, UTR মেলেনি):
            </p>
            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="রিজেক্ট করার কারণ লিখুন..."
              className="w-full p-2.5 border border-slate-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
            />
            <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-200 text-[11px] text-amber-800">
              ⚠️ রিজেক্ট সংখ্যা হবে: <strong>{Number(rejectingOrder.screenshot_attempts || 0) + 1} / ৩</strong>। ৩ বার অতিক্রম করলে অর্ডারটি স্বয়ংক্রিয়ভাবে স্প্যাম হয়ে যাবে[span_0](start_span)[span_0](end_span)[span_1](start_span)[span_1](end_span)।
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => {
                  setRejectReason("");
                  onCloseReject();
                }}
                className="flex-1 py-2 border border-slate-200 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-50"
              >
                বাতিল
              </button>
              <button
                onClick={submitRejectScreenshot}
                disabled={actionLoading}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition disabled:opacity-50"
              >
                {actionLoading ? "রিজেক্ট হচ্ছে..." : "কনফার্ম রিজেক্ট"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ৩. ইমেজ জুম মোডাল */}
      {zoomedImage && (
        <div
          onClick={onCloseZoom}
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="max-w-md w-full bg-white rounded-2xl p-2 shadow-2xl">
            <img
              src={zoomedImage}
              alt="Proof"
              className="w-full h-auto max-h-[75vh] rounded-xl object-contain"
            />
            <p className="text-center text-xs text-slate-500 mt-2 font-bold">
              বন্ধ করতে যেকোনো জায়গায় ক্লিক করুন
            </p>
          </div>
        </div>
      )}
    </>
  );
            }
