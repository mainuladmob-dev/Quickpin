"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface DashboardMetrics {
  totalDeliveredOrders: number;
  cashInDrawer: number;
  bankSettlement: number;
  totalRefunds: number;
  netRealizedSales: number;
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalDeliveredOrders: 0,
    cashInDrawer: 0,
    bankSettlement: 0,
    totalRefunds: 0,
    netRealizedSales: 0,
  });
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  const loadDailyMetrics = async () => {
    setLoading(true);
    try {
      const { data: orders, error } = await supabase
        .from("orders")
        .select("total_amount, order_status, payment_type, payment_status, is_refund_paid, refund_amount");

      if (error) throw error;

      let deliveredCount = 0;
      let cash = 0;
      let bank = 0;
      let refunds = 0;

      orders?.forEach((o) => {
        const amount = Number(o.total_amount || 0);
        const refundAmt = Number(o.refund_amount || 0);

        // সফল ডেলিভারি ও সেলস
        if (o.order_status === "delivered") {
          deliveredCount += 1;
          if (o.payment_type === "cash" || o.payment_type === "cod") {
            cash += amount;
          } else {
            bank += amount;
          }
        }

        // রিফান্ড কর্তন
        if (o.is_refund_paid || o.order_status === "refunded") {
          refunds += refundAmt > 0 ? refundAmt : amount;
        }
      });

      const net = (cash + bank) - refunds;

      setMetrics({
        totalDeliveredOrders: deliveredCount,
        cashInDrawer: cash,
        bankSettlement: bank,
        totalRefunds: refunds,
        netRealizedSales: net,
      });
    } catch (err) {
      console.error("Failed to calculate metrics:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDailyMetrics();
  }, []);

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      {/* হেডার */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900">
            📊 দৈনিক ক্যাশ ও সেলস খাতা
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            আজকের নগদ ক্যাশ ড্রয়ার, ব্যাংক জমা ও নিট হিসাব
          </p>
        </div>

        <button
          onClick={loadDailyMetrics}
          disabled={loading}
          className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition shadow-2xs"
        >
          🔄 Refresh
        </button>
      </div>

      {/* ৫টি পরিষ্কার কার্ড (কোনো ডুপ্লিকেট হিসাব নেই) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* ১. মোট ডেলিভারি */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            মোট ডেলিভারি সম্পন্ন
          </p>
          <p className="text-2xl font-bold text-blue-600 mt-2">
            {metrics.totalDeliveredOrders} টি পার্সেল
          </p>
          <p className="text-[11px] text-slate-400 mt-1">সফলভাবে পৌঁছে দেওয়া অর্ডার</p>
        </div>

        {/* ২. হাতে নগদ ক্যাশ ড্রয়ার */}
        <div className="bg-white p-4 rounded-xl border border-amber-200 bg-amber-50/20 shadow-2xs">
          <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider">
            💵 ক্যাশ ড্রয়ার (COD জমা)
          </p>
          <p className="text-2xl font-bold text-amber-600 mt-2">
            ₹{metrics.cashInDrawer.toFixed(2)}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">ডেলিভারি বয়ের হাত থেকে জমা ক্যাশ</p>
        </div>

        {/* ৩. ব্যাংকে জমা (অনলাইন / QR) */}
        <div className="bg-white p-4 rounded-xl border border-indigo-200 bg-indigo-50/20 shadow-2xs">
          <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wider">
            🏦 ব্যাংক / QR জমা (Prepaid)
          </p>
          <p className="text-2xl font-bold text-indigo-600 mt-2">
            ₹{metrics.bankSettlement.toFixed(2)}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">সরাসরি অ্যাকাউন্টে আসা অনলাইন টাকা</p>
        </div>

        {/* ৪. মোট রিফান্ড ফেরত */}
        <div className="bg-white p-4 rounded-xl border border-rose-200 bg-rose-50/20 shadow-2xs">
          <p className="text-xs font-semibold text-rose-700 uppercase tracking-wider">
            ↩️ মোট ফেরত দেওয়া টাকা
          </p>
          <p className="text-2xl font-bold text-rose-600 mt-2">
            - ₹{metrics.totalRefunds.toFixed(2)}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">কাস্টমারকে ফেরত দেওয়া রিফান্ড</p>
        </div>

        {/* ৫. নেট আসল বিক্রি */}
        <div className="bg-white p-4 rounded-xl border-2 border-emerald-500 bg-emerald-50/30 shadow-xs sm:col-span-2 lg:col-span-2">
          <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
            ✅ দিনশেষের আসল মোট বিক্রি (Net Realized)
          </p>
          <p className="text-3xl font-extrabold text-emerald-700 mt-2">
            ₹{metrics.netRealizedSales.toFixed(2)}
          </p>
          <p className="text-xs text-emerald-600 mt-1 font-medium">
            (নগদ ক্যাশ + ব্যাংক জমা) − মোট রিফান্ড
          </p>
        </div>
      </div>
    </div>
  );
}
