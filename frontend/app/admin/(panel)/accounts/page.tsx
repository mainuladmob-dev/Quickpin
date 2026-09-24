"use client";

import { useState, useEffect, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";

interface OrderAccountItem {
  id: string;
  order_number: string;
  total_amount: number;
  order_status: string;
  payment_type: string;
  payment_status: string;
  created_at: string;
}

function AccountsContent() {
  const [orders, setOrders] = useState<OrderAccountItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<"today" | "yesterday" | "all">("today");

  const supabase = createClient();

  const fetchAccountsData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("id, order_number, total_amount, order_status, payment_type, payment_status, created_at")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (err) {
      console.error("Accounts data load error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccountsData();
  }, []);

  // তারিখ অনুযায়ী ফিল্টারিং লজিক (useSearchParams ছাড়া নিরাপদ ক্লায়েন্ট স্টেট)
  const filteredOrders = orders.filter((order) => {
    if (dateFilter === "all") return true;

    const orderDate = new Date(order.created_at);
    const today = new Date();

    if (dateFilter === "today") {
      return orderDate.toDateString() === today.toDateString();
    }

    if (dateFilter === "yesterday") {
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);
      return orderDate.toDateString() === yesterday.toDateString();
    }

    return true;
  });

  // হিসাব নিকাশ
  let deliveredCount = 0;
  let grossDelivered = 0;
  let codExpected = 0;
  let bankOnline = 0;
  let totalRefunds = 0;

  filteredOrders.forEach((o) => {
    const amount = Number(o.total_amount || 0);

    if (o.order_status === "delivered") {
      deliveredCount += 1;
      grossDelivered += amount;

      if (o.payment_type === "cash" || o.payment_type === "cod") {
        codExpected += amount;
      } else {
        bankOnline += amount;
      }
    }

    if (o.order_status === "refund" || o.order_status === "refunded") {
      totalRefunds += amount;
    }
  });

  const netRealized = grossDelivered - totalRefunds;

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      {/* হেডার ও ডেট ফিল্টার */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <span>💰</span> Accounts & Cash Flow
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            ক্যাশ ড্রয়ার সেটেলমেন্ট ও অনলাইন ব্যাংক কালেকশন খতিয়ান
          </p>
        </div>

        {/* ফিল্টার বাটন */}
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
          <button
            onClick={() => setDateFilter("today")}
            className={`px-3 py-1.5 rounded-lg font-semibold transition ${
              dateFilter === "today" ? "bg-white text-blue-600 shadow-2xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Today
          </button>
          <button
            onClick={() => setDateFilter("yesterday")}
            className={`px-3 py-1.5 rounded-lg font-semibold transition ${
              dateFilter === "yesterday" ? "bg-white text-blue-600 shadow-2xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Yesterday
          </button>
          <button
            onClick={() => setDateFilter("all")}
            className={`px-3 py-1.5 rounded-lg font-semibold transition ${
              dateFilter === "all" ? "bg-white text-blue-600 shadow-2xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            All Time
          </button>
        </div>
      </div>

      {loading ? (
        <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-xs text-slate-400">
          হিসাবের খাতা লোড হচ্ছে...
        </div>
      ) : (
        <>
          {/* মূল ৪টি সামারি কার্ড */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <p className="text-[11px] font-semibold text-slate-500 uppercase">GROSS DELIVERED</p>
              <p className="text-xl font-bold text-blue-600 mt-1">₹{grossDelivered.toFixed(2)}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{deliveredCount} Orders</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <p className="text-[11px] font-semibold text-slate-500 uppercase">TOTAL REFUNDS</p>
              <p className="text-xl font-bold text-rose-600 mt-1">- ₹{totalRefunds.toFixed(2)}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Deductions</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <p className="text-[11px] font-semibold text-slate-500 uppercase">PHYSICAL CASH</p>
              <p className="text-xl font-bold text-amber-600 mt-1">₹{codExpected.toFixed(2)}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Delivery Boy Deposit</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <p className="text-[11px] font-semibold text-slate-500 uppercase">NET REALIZED</p>
              <p className="text-xl font-bold text-emerald-600 mt-1">₹{netRealized.toFixed(2)}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Realized Total</p>
            </div>
          </div>

          {/* ক্যাশ ড্রয়ার ও ব্যাংক সেটেলমেন্টের আলাদা খাতা */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* ফিজিক্যাল ক্যাশ ড্রয়ার */}
            <div className="bg-white p-5 rounded-2xl border border-amber-200 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-amber-100 pb-3">
                <h2 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <span>💵</span> Physical Cash Drawer (COD)
                </h2>
                <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">
                  Day-End Bag
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Gross COD Expected from Customers:</span>
                  <span className="font-semibold text-slate-900">₹{codExpected.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-500 border-t border-slate-100 pt-2">
                  <span className="font-bold text-slate-800">Exact Cash To Collect From Boy:</span>
                  <span className="font-bold text-amber-600 text-sm">₹{codExpected.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* ব্যাংক ও অনলাইন সেটেলমেন্ট */}
            <div className="bg-white p-5 rounded-2xl border border-indigo-200 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-indigo-100 pb-3">
                <h2 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <span>🏦</span> Direct Bank & QR Settlements
                </h2>
                <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded-full">
                  0% Gateway Fee
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Advance / Full Online Payments:</span>
                  <span className="font-semibold text-slate-900">₹{bankOnline.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-500 border-t border-slate-100 pt-2">
                  <span className="font-bold text-slate-800">Net Realized In Bank Account:</span>
                  <span className="font-bold text-indigo-600 text-sm">₹{bankOnline.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function AccountsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-xs text-slate-400">
          লোডিং হচ্ছে...
        </div>
      }
    >
      <AccountsContent />
    </Suspense>
  );
                }
