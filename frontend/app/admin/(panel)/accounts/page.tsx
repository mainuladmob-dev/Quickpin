"use client";

import { useEffect, useState, useMemo } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type OrderItem = {
  id?: string;
  product_name?: string;
  name?: string;
  price?: number;
  unit_price?: number;
  quantity?: number;
  qty?: number;
};

type Order = {
  id: string;
  order_number: string;
  delivery_type: string;
  payment_type: string;
  total_amount: number;
  paid_amount?: number;
  remaining_amount?: number;
  partial_payment_amount?: number;
  payment_status: string;
  order_status: string;
  refund_amount?: number | null;
  refund_method?: string | null;
  refund_reason?: string | null;
  created_at: string;
  delivered_at?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  order_items?: OrderItem[];
  items?: OrderItem[];
  profiles?: {
    name?: string | null;
    phone?: string | null;
  } | null;
};

type RefundItem = {
  id: string;
  order_id: string;
  amount: number;
  refund_method: string;
  reason: string;
  refunded_at: string;
};

// Helper: Timezone Safe Date Strings
function getTodayDateString(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().split("T")[0];
}

function getYesterdayDateString(): string {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().split("T")[0];
}

export default function AdminAccountsPage() {
  const supabase = createClient();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const queryDate = searchParams.get("date");
  const [selectedDate, setSelectedDate] = useState<string>(
    queryDate || getTodayDateString()
  );
  const [deliveredOrders, setDeliveredOrders] = useState<Order[]>([]);
  const [refundRecords, setRefundRecords] = useState<RefundItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Sync Date with URL
  const handleDateChange = (newDate: string) => {
    setSelectedDate(newDate);
    const params = new URLSearchParams(searchParams.toString());
    if (newDate) {
      params.set("date", newDate);
    } else {
      params.delete("date");
    }
    router.replace(`${pathname}?${params.toString()}`);
  };

  // 1. Fetch Delivered Orders and Recorded Refunds for Selected Date
  const fetchSettlementData = async () => {
    setLoading(true);

    const start = `${selectedDate}T00:00:00.000Z`;
    const end = `${selectedDate}T23:59:59.999Z`;

    // Fetch orders that were delivered or marked refund on this operating date
    const ordersQuery = supabase
      .from("orders")
      .select("*, order_items(*), profiles(name, phone)")
      .in("order_status", ["delivered", "refund"])
      .gte("created_at", start)
      .lte("created_at", end)
      .order("created_at", { ascending: false });

    // Fetch refund audit logs recorded on this operating date
    const refundsQuery = supabase
      .from("refunds")
      .select("*")
      .gte("refunded_at", start)
      .lte("refunded_at", end);

    const [ordersRes, refundsRes] = await Promise.all([ordersQuery, refundsQuery]);

    setDeliveredOrders(ordersRes.data || []);
    setRefundRecords(refundsRes.data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchSettlementData();
  }, [selectedDate]);

  // 2. Daily Financial Settlement Math & Cash Drawer Engine
  const settlement = useMemo(() => {
    let grossDeliveredValue = 0;
    let totalOnlineAdvanceCollected = 0;
    let totalExpectedCodCash = 0;
    let totalRefundsDeducted = 0;
    let cashRefundsPaid = 0;
    let upiRefundsPaid = 0;

    // A. Reconcile Delivered Orders
    deliveredOrders.forEach((o) => {
      const bill = Number(o.total_amount || 0);
      const advancePaid = Number(o.partial_payment_amount || (o.payment_type === "full" ? bill : 0));
      const codDue = o.payment_type === "partial" ? Math.max(0, bill - advancePaid) : 0;

      grossDeliveredValue += bill;
      totalOnlineAdvanceCollected += advancePaid;
      totalExpectedCodCash += codDue;
    });

    // B. Reconcile Item-Level Refunds from Audit Table
    refundRecords.forEach((r) => {
      const refundAmt = Number(r.amount || 0);
      totalRefundsDeducted += refundAmt;

      if (r.refund_method?.toLowerCase() === "cash") {
        cashRefundsPaid += refundAmt;
      } else {
        upiRefundsPaid += refundAmt;
      }
    });

    // C. Physical Drawer Cash Calculation (Delivery boy COD collection minus cash handed back)
    const expectedDrawerCash = Math.max(0, totalExpectedCodCash - cashRefundsPaid);

    // D. Actual Realized Net Sales
    const actualNetSales = Math.max(0, grossDeliveredValue - totalRefundsDeducted);

    // E. Online Net Settlement
    const netOnlineSettlement = Math.max(0, totalOnlineAdvanceCollected - upiRefundsPaid);

    return {
      totalDeliveredOrders: deliveredOrders.length,
      grossDeliveredValue,
      totalOnlineAdvanceCollected,
      totalExpectedCodCash,
      cashRefundsPaid,
      upiRefundsPaid,
      totalRefundsDeducted,
      expectedDrawerCash,
      netOnlineSettlement,
      actualNetSales,
    };
  }, [deliveredOrders, refundRecords]);
    return (
    <div className="space-y-4">
      {/* 1. Universal Top Date Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
            📅 Settlement Date:
          </span>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => handleDateChange(e.target.value)}
            className="text-xs font-semibold border border-slate-300 rounded-lg px-3 py-1.5 bg-slate-50 text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={() => handleDateChange(getTodayDateString())}
            className={`text-xs px-2.5 py-1.5 rounded-md font-medium transition ${
              selectedDate === getTodayDateString()
                ? "bg-blue-600 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            Today
          </button>
          <button
            onClick={() => handleDateChange(getYesterdayDateString())}
            className={`text-xs px-2.5 py-1.5 rounded-md font-medium transition ${
              selectedDate === getYesterdayDateString()
                ? "bg-blue-600 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            Yesterday
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-500">
            Delivered Volume: <strong className="text-slate-800">{settlement.totalDeliveredOrders} Orders</strong>
          </span>
        </div>
      </div>

      {/* 2. Executive Settlement KPI Grid (Universal 00 Guaranteed on Empty Days) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Actual Net Sales */}
        <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-xs">
          <p className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
            💰 Actual Net Sales
          </p>
          <p className="text-2xl font-black text-emerald-700 mt-1">
            ₹{settlement.actualNetSales.toFixed(2)}
          </p>
          <p className="text-[10px] text-emerald-600 mt-0.5">Realized Revenue</p>
        </div>

        {/* Physical Cash In Hand */}
        <div className="bg-white p-4 rounded-xl border border-amber-200 bg-amber-50/20 shadow-xs">
          <p className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">
            💵 Expected Cash in Hand
          </p>
          <p className="text-2xl font-black text-amber-700 mt-1">
            ₹{settlement.expectedDrawerCash.toFixed(2)}
          </p>
          <p className="text-[10px] text-amber-600 mt-0.5">Delivery Boys Handover</p>
        </div>

        {/* Online Bank Settlement */}
        <div className="bg-white p-4 rounded-xl border border-blue-200 bg-blue-50/20 shadow-xs">
          <p className="text-[11px] font-bold text-blue-800 uppercase tracking-wider">
            📱 Net Online Settlement
          </p>
          <p className="text-2xl font-black text-blue-700 mt-1">
            ₹{settlement.netOnlineSettlement.toFixed(2)}
          </p>
          <p className="text-[10px] text-blue-600 mt-0.5">Bank Inflow</p>
        </div>

        {/* Total Deductions / Refunds */}
        <div className="bg-white p-4 rounded-xl border border-rose-200 bg-rose-50/20 shadow-xs">
          <p className="text-[11px] font-bold text-rose-800 uppercase tracking-wider">
            🔻 Total Deductions
          </p>
          <p className="text-2xl font-black text-rose-700 mt-1">
            - ₹{settlement.totalRefundsDeducted.toFixed(2)}
          </p>
          <p className="text-[10px] text-rose-500 mt-0.5">
            {refundRecords.length < 10 ? `0${refundRecords.length}` : refundRecords.length} Claims Subtracted
          </p>
        </div>
      </div>

      {/* 3. Cash Drawer Settlement Card */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
            📥 Cash Drawer Verification Breakdown
          </h3>
          <span className="text-[11px] text-slate-400">Desk reconciliation</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
            <span className="text-slate-500">Gross COD Collected:</span>
            <p className="text-base font-bold text-slate-800 mt-0.5">
              ₹{settlement.totalExpectedCodCash.toFixed(2)}
            </p>
            <p className="text-[10px] text-slate-400">Total COD collected by drivers</p>
          </div>

          <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
            <span className="text-slate-500">Cash Handed to Customers (Refund):</span>
            <p className="text-base font-bold text-rose-600 mt-0.5">
              - ₹{settlement.cashRefundsPaid.toFixed(2)}
            </p>
            <p className="text-[10px] text-slate-400">Cash returned on doorstep</p>
          </div>

          <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
            <span className="font-semibold text-amber-800">Must Collect in Drawer:</span>
            <p className="text-base font-black text-amber-900 mt-0.5">
              ₹{settlement.expectedDrawerCash.toFixed(2)}
            </p>
            <p className="text-[10px] text-amber-700">Actual cash to count right now</p>
          </div>
        </div>
      </div>

      {/* 4. Delivered Orders Reconciliation Ledger */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
            📋 Delivered Orders Audit Trail ({deliveredOrders.length})
          </h3>
          <span className="text-[11px] text-slate-400">Date: {selectedDate}</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-500">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-xs">Calculating daily accounts...</p>
          </div>
        ) : deliveredOrders.length === 0 ? (
          <div className="p-10 text-center text-slate-400 text-xs">
            There are 00 delivered records to settle on {selectedDate}.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="p-3">Order #</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Type</th>
                  <th className="p-3 text-right">Total Bill</th>
                  <th className="p-3 text-right">Advance Paid</th>
                  <th className="p-3 text-right">COD Due</th>
                  <th className="p-3 text-right">Refunds</th>
                  <th className="p-3 text-right">Net Realized</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {deliveredOrders.map((o) => {
                  const bill = Number(o.total_amount || 0);
                  const advancePaid = Number(
                    o.partial_payment_amount || (o.payment_type === "full" ? bill : 0)
                  );
                  const codDue = o.payment_type === "partial" ? Math.max(0, bill - advancePaid) : 0;
                  const refundDeduction = Number(o.refund_amount || 0);
                  const netRealized = Math.max(0, bill - refundDeduction);

                  return (
                    <tr key={o.id} className="hover:bg-slate-50/50 transition">
                      <td className="p-3 font-bold text-slate-900">#{o.order_number}</td>
                      <td className="p-3">
                        <p className="font-semibold text-slate-800">
                          {o.profiles?.name || o.customer_name || "Customer"}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {o.profiles?.phone || o.customer_phone || ""}
                        </p>
                      </td>
                      <td className="p-3">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 uppercase">
                          {o.payment_type}
                        </span>
                      </td>
                      <td className="p-3 text-right font-bold text-slate-900">₹{bill.toFixed(2)}</td>
                      <td className="p-3 text-right text-blue-600 font-medium">₹{advancePaid.toFixed(2)}</td>
                      <td className="p-3 text-right text-amber-700 font-semibold">₹{codDue.toFixed(2)}</td>
                      <td className="p-3 text-right text-rose-600 font-bold">
                        {refundDeduction > 0 ? `- ₹${refundDeduction.toFixed(2)}` : "—"}
                      </td>
                      <td className="p-3 text-right font-black text-emerald-700">
                        ₹{netRealized.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
            }

