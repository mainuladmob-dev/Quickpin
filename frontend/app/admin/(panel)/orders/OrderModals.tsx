// @ts-nocheck
"use client";

import { useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";

export default function OrderModals({
  orders = [],
  selectedDate,
  showPicklist,
  onClosePicklist,
  rejectingOrder,
  onCloseReject,
  actionLoading = false,
  setActionLoading,
  zoomedImage,
  onCloseZoom,
  onSuccess,
}: any) {
  const supabase = createClient();
  const [rejectReason, setRejectReason] = useState("");

  // ১. মাস্টার পিকলিস্ট হিসাব
  const picklistItems = useMemo(() => {
    const map: Record<string, { name: string; qty: number; unit: string; weight: number }> = {};
    
    orders
      ?.filter((o: any) => o?.order_status === "current")
      .forEach((o: any) => {
        (o?.items || []).forEach((item: any) => {
          const name = item?.product_name || item?.name || "Unknown Product";
          if (!map[name]) {
            map[name] = { 
              name, 
              qty: 0, 
              unit: item?.unit || "Unit", 
              weight: 0 
            };
          }
          const q = Number(item?.quantity || 0);
          map[name].qty += q;
          if (item?.weight) {
            map[name].weight += Number(item.weight) * q;
          }
        });
      });

    return Object.values(map);
  }, [orders]);

  // ২. স্ক্রিনশট রিজেক্ট করার ফাংশন
  const submitRejectScreenshot = async () => {
    if (!rejectingOrder || !rejectReason.trim()) {
      alert("অনুগ্রহ করে রিজেক্ট করার কারণ লিখুন");
      return;
    }

    if (setActionLoading) setActionLoading(true);

    const newAttempts = Number(rejectingOrder?.screenshot_attempts || 0) + 1;
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

    try {
      const { error } = await supabase
        .from("orders")
        .update(updateData)
        .eq("id", rejectingOrder.id);

      if (error) throw error;

      alert("পেমেন্ট স্ক্রিনশট রিজেক্ট করা হয়েছে।");
      setRejectReason("");
      if (onCloseReject) onCloseReject();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      alert("রিজেক্ট করতে সমস্যা হয়েছে: " + (err.message || "Unknown error"));
    } finally {
      if (setActionLoading) setActionLoading(false);
    }
  };

  return (
    <>
      {/* --- ১. মাস্টার পিকলিস্ট মডাল --- */}
      {showPicklist && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-sm font-bold text-slate-800">📋 মাস্টার পিকলিস্ট (চলমান অর্ডার)</h3>
                <p className="text-[11px] text-slate-500">তারিখ: {selectedDate || "আজকের দিন"}</p>
              </div>
              <button
                onClick={onClosePicklist}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold px-2 py-1"
              >
                ✕
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 divide-y divide-slate-100">
              {picklistItems.length === 0 ? (
                <p className="text-center text-xs text-slate-400 py-8">
                  চলমান কোনো অর্ডারের আইটেম পাওয়া যায়নি।
                </p>
              ) : (
                picklistItems.map((item, idx) => (
                  <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-semibold text-slate-800">{item.name}</p>
                      {item.weight > 0 && (
                        <p className="text-[10px] text-slate-400">ওজন: {item.weight.toFixed(2)} kg</p>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="inline-block bg-blue-50 text-blue-700 font-bold px-2 py-1 rounded-md border border-blue-100">
                        {item.qty} {item.unit}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-3 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
              <button
                onClick={() => window.print()}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg transition"
              >
                🖨️ প্রিন্ট
              </button>
              <button
                onClick={onClosePicklist}
                className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded-lg transition"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- ২. স্ক্রিনশট রিজেক্ট করার মডাল --- */}
      {rejectingOrder && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-4 shadow-2xl border border-slate-200 space-y-3">
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                ❌ স্ক্রিনশট রিজেক্ট (#{rejectingOrder.order_number || rejectingOrder.id})
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                পূর্বের রিজেক্ট সংখ্যা: {rejectingOrder.screenshot_attempts || 0} / 3
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                রিজেক্ট করার কারণ:
              </label>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="যেমন: UTR নম্বর মেলেনি অথবা ভুল স্ক্রিনশট..."
                className="w-full text-xs p-2.5 border border-slate-200 rounded-xl outline-none focus:border-rose-500 resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={onCloseReject}
                disabled={actionLoading}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={submitRejectScreenshot}
                disabled={actionLoading || !rejectReason.trim()}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg transition disabled:opacity-50"
              >
                {actionLoading ? "প্রসেস হচ্ছে..." : "কনফার্ম রিজেক্ট"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- ৩. ইমেজ জুম / ফুল স্ক্রিন ভিউ --- */}
      {zoomedImage && (
        <div
          onClick={onCloseZoom}
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="relative max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={onCloseZoom}
              className="absolute -top-10 right-0 text-white text-sm font-bold bg-white/20 px-3 py-1 rounded-full hover:bg-white/40"
            >
              বন্ধ করুন ✕
            </button>
            <img
              src={zoomedImage}
              alt="Payment Proof Zoom"
              className="w-full max-h-[80vh] object-contain rounded-xl shadow-2xl bg-black"
            />
          </div>
        </div>
      )}
    </>
  );
}

