"use client";

import { useEffect, useState, useMemo } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Order = any;

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

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // Sync Date with URL Bar
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

  const fetchFinancials = async () => {
    setLoading(true);
    let query = supabase
      .from("orders")
      .select("*, order_items(*), addresses(*)")
      .order("created_at", { ascending: false });

    if (selectedDate) {
      const start = `${selectedDate}T00:00:00.000Z`;
      const end = `${selectedDate}T23:59:59.999Z`;
      query = query.gte("created_at", start).lte("created_at", end);
    }

    const { data, error } = await query;
    let orderList = (data as any) || [];

    if (error) {
      let fallback = supabase.from("orders").select("*").order("created_at", { ascending: false });
      if (selectedDate) {
        fallback = fallback
          .gte("created_at", `${selectedDate}T00:00:00.000Z`)
          .lte("created_at", `${selectedDate}T23:59:59.999Z`);
      }
      const { data: fbData } = await fallback;
      orderList = fbData || [];
    }

    // Attach Customer Profile Names & Phones
    const userIds = [...new Set(orderList.map((o: any) => o.user_id).filter(Boolean))];
    let profileMap: Record<string, any> = {};

    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name, phone")
        .in("id", userIds);

      (profiles || []).forEach((p: any) => {
        profileMap[p.id] = p;
      });
    }

    const enriched = orderList.map((o: any) => ({
      ...o,
      profiles: o.user_id ? profileMap[o.user_id] || null : null,
    }));

    setOrders(enriched);
    setLoading(false);
  };

  useEffect(() => {
    fetchFinancials();
  }, [selectedDate]);

  // 100% Automated Multi-Tier Financial & Drawer Accounting Engine
  const accountsData = useMemo(() => {
    let grossDelivered = 0;
    let deliveredCount = 0;

    let onlineAdvanceCollected = 0;
    let rawCodCollected = 0;

    let cashRefundDeductions = 0;
    let upiRefundDeductions = 0;

    orders.forEach((o) => {
      const isDeliveredOrRefund = o.order_status === "delivered" || o.order_status === "refund";
      const totalBill = Number(o.total_amount || 0);
      const refundAmt = Number(o.refund_amount || 0);
      const isCashRefund = o.refund_method?.toLowerCase() === "cash";
      const isUpiRefund = o.refund_method?.toLowerCase() === "upi" || o.refund_method?.toLowerCase() === "bank";

      if (isDeliveredOrRefund) {
        grossDelivered += totalBill;
        deliveredCount += 1;

        if (o.payment_type === "full") {
          onlineAdvanceCollected += totalBill;
        } else if (o.payment_type === "partial") {
          const advance = Number(o.partial_payment_amount || 0);
          onlineAdvanceCollected += advance;
          rawCodCollected += Math.max(0, totalBill - advance);
        } else {
          // Pure COD
          rawCodCollected += totalBill;
        }
      }

      // Track Refund Deductions Separately for Drawer vs Bank
      if (refundAmt > 0 || o.order_status === "refund") {
        const actualRefund = refundAmt > 0 ? refundAmt : totalBill;
        if (isCashRefund) {
          cashRefundDeductions += actualRefund;
        } else {
          // Default to UPI/Bank refund
          upiRefundDeductions += actualRefund;
        }
      }
    });

    const totalRefunds = cashRefundDeductions + upiRefundDeductions;
    const actualNetSales = Math.max(0, grossDelivered - totalRefunds);

    // Physical Drawer Balance: COD Collected minus Doorstep Cash Refunded
    const physicalCashInHand = Math.max(0, rawCodCollected - cashRefundDeductions);

    // Bank Account Balance: Online Collected minus UPI Refunded
    const netBankReceipts = Math.max(0, onlineAdvanceCollected - upiRefundDeductions);

    return {
      totalOrders: orders.length,
      deliveredCount,
      grossDelivered,
      totalRefunds,
      cashRefundDeductions,
      upiRefundDeductions,
      actualNetSales,
      rawCodCollected,
      physicalCashInHand,
      onlineAdvanceCollected,
      netBankReceipts,
    };
  }, [orders]);
    return (
    <div className="space-y-4">
      {/* 1. Operating Date Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
            📅 Operating Date:
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
        <div className="text-xs text-slate-500 font-medium">
          Filtered Records: <span className="font-bold text-slate-800">{accountsData.totalOrders}</span>
        </div>
      </div>

      {/* 2. Top Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">
            Gross Delivered Sales
          </p>
          <p className="text-xl font-bold text-blue-600 mt-1">
            ₹{accountsData.grossDelivered.toFixed(2)}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            {accountsData.deliveredCount} Delivered Orders
          </p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">
            Total Refund Deductions
          </p>
          <p className="text-xl font-bold text-rose-600 mt-1">
            - ₹{accountsData.totalRefunds.toFixed(2)}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            Cash + UPI Combined
          </p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/40 shadow-xs">
          <p className="text-[11px] font-bold text-emerald-800 uppercase tracking-wide">
            Actual Net Realized Sales
          </p>
          <p className="text-xl font-black text-emerald-700 mt-1">
            ₹{accountsData.actualNetSales.toFixed(2)}
          </p>
          <p className="text-[10px] text-emerald-600 mt-0.5">Realized Total</p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-amber-200 bg-amber-50/40 shadow-xs">
          <p className="text-[11px] font-bold text-amber-800 uppercase tracking-wide">
            Physical Cash In Drawer
          </p>
          <p className="text-xl font-black text-amber-700 mt-1">
            ₹{accountsData.physicalCashInHand.toFixed(2)}
          </p>
          <p className="text-[10px] text-amber-600 mt-0.5">Delivery Boy Deposit</p>
        </div>
      </div>

      {/* 3. Detailed Dual-Drawer Reconciliation Panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Panel A: Physical Drawer Cash Reconciliation */}
        <div className="bg-white rounded-xl border border-amber-200 p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-amber-100">
            <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              💵 Physical Cash Drawer (COD Settlement)
            </h4>
            <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">
              Day-End Bag
            </span>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Gross COD Expected from Customers:</span>
              <span className="font-semibold text-slate-800">
                ₹{accountsData.rawCodCollected.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-rose-600">
              <span>Doorstep Cash Refunds Handed Over:</span>
              <span className="font-semibold">
                - ₹{accountsData.cashRefundDeductions.toFixed(2)}
              </span>
            </div>
            <div className="pt-2 border-t border-dashed border-amber-200 flex justify-between items-center bg-amber-50/70 p-2 rounded-lg font-bold">
              <span className="text-amber-900">Exact Cash To Collect From Delivery Boy:</span>
              <span className="text-base text-amber-700 font-mono">
                ₹{accountsData.physicalCashInHand.toFixed(2)}
              </span>
            </div>
          </div>
          <p className="text-[10px] text-slate-400">
            * UPI refunds do not touch this drawer balance as the cash remained in customer's hand.
          </p>
        </div>

        {/* Panel B: Online Bank Settlements */}
        <div className="bg-white rounded-xl border border-purple-200 p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-purple-100">
            <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              🏦 Direct Bank & QR Settlements
            </h4>
            <span className="text-[10px] bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded-full">
              0% Gateway Fee
            </span>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Advance / Full Online QR Payments:</span>
              <span className="font-semibold text-slate-800">
                ₹{accountsData.onlineAdvanceCollected.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-rose-600">
              <span>UPI / Bank Direct Refunds Paid:</span>
              <span className="font-semibold">
                - ₹{accountsData.upiRefundDeductions.toFixed(2)}
              </span>
            </div>
            <div className="pt-2 border-t border-dashed border-purple-200 flex justify-between items-center bg-purple-50/70 p-2 rounded-lg font-bold">
              <span className="text-purple-900">Net Realized In Bank Account:</span>
              <span className="text-base text-purple-700 font-mono">
                ₹{accountsData.netBankReceipts.toFixed(2)}
              </span>
            </div>
          </div>
          <p className="text-[10px] text-slate-400">
            * Matches your direct bank/UPI statement minus initiated customer payouts.
          </p>
        </div>
      </div>

      {/* 4. Financial Audit Register */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Daily Financial Breakdown ({orders.length} Orders)
          </h4>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            Loading accounts ledger...
          </div>
        ) : orders.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            No transactions found for {selectedDate}.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100/75 text-slate-600 font-bold border-b border-slate-200 text-[11px]">
                  <th className="p-2.5">Order</th>
                  <th className="p-2.5">Customer</th>
                  <th className="p-2.5">Type</th>
                  <th className="p-2.5 text-right">Gross Bill</th>
                  <th className="p-2.5 text-right">Refund / Deduction</th>
                  <th className="p-2.5 text-right">Net Realized</th>
                  <th className="p-2.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((o) => {
                  const gross = Number(o.total_amount || 0);
                  const refundVal = Number(o.refund_amount || 0);
                  const net = Math.max(0, gross - refundVal);
                  const isRefund = o.order_status === "refund" || refundVal > 0;

                  return (
                    <tr key={o.id} className="hover:bg-slate-50/80 transition">
                      <td className="p-2.5 font-bold text-slate-900">
                        #{o.order_number}
                      </td>
                      <td className="p-2.5 text-slate-700">
                        <p className="font-semibold">{o.profiles?.name || o.customer_name || "Customer"}</p>
                        <p className="text-[10px] text-slate-400">{o.profiles?.phone || o.customer_phone || ""}</p>
                      </td>
                      <td className="p-2.5">
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          {o.payment_type === "full" ? "Full Paid" : "Advance + COD"}
                        </span>
                      </td>
                      <td className="p-2.5 text-right font-semibold text-slate-800">
                        ₹{gross.toFixed(2)}
                      </td>
                      <td className="p-2.5 text-right font-semibold text-rose-600">
                        {isRefund ? `- ₹${refundVal.toFixed(2)} (${o.refund_method?.toUpperCase() || "UPI"})` : "—"}
                      </td>
                      <td className="p-2.5 text-right font-bold text-emerald-700 font-mono">
                        ₹{net.toFixed(2)}
                      </td>
                      <td className="p-2.5 text-center">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            o.order_status === "delivered"
                              ? "bg-emerald-100 text-emerald-800"
                              : o.order_status === "refund"
                              ? "bg-rose-100 text-rose-800"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {o.order_status}
                        </span>
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
