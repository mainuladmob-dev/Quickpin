"use client";

import { useEffect, useState, useMemo } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type RefundRecord = {
  id: string;
  order_id: string;
  product_name: string;
  quantity: number;
  weight_kg: number;
  amount: number;
  refund_method: "cash" | "upi" | string;
  reason: "rotten" | "missing" | "weight_shortage" | "wrong_item" | "other" | string;
  customer_upi: string | null;
  transaction_ref: string | null;
  refunded_at: string;
  created_at: string;
  orders?: {
    order_number?: string;
    total_amount?: number;
    profiles?: {
      name?: string;
      phone?: string;
    } | null;
  } | null;
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

const REASON_BADGES: Record<string, { label: string; color: string }> = {
  rotten: { label: "Rotten / Damaged", color: "bg-rose-100 text-rose-800 border-rose-200" },
  missing: { label: "Missing Item", color: "bg-amber-100 text-amber-800 border-amber-200" },
  weight_shortage: { label: "Weight Shortage", color: "bg-orange-100 text-orange-800 border-orange-200" },
  wrong_item: { label: "Wrong Item Sent", color: "bg-purple-100 text-purple-800 border-purple-200" },
  other: { label: "Other Issue", color: "bg-slate-100 text-slate-800 border-slate-200" },
};

export default function AdminRefundsPage() {
  const supabase = createClient();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const queryDate = searchParams.get("date");
  const [selectedDate, setSelectedDate] = useState<string>(
    queryDate || getTodayDateString()
  );
  const [refunds, setRefunds] = useState<RefundRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeMethodFilter, setActiveMethodFilter] = useState<"all" | "upi" | "cash">("all");

  // Inline UTR editing state
  const [editingUtrId, setEditingUtrId] = useState<string | null>(null);
  const [tempUtr, setTempUtr] = useState<string>("");
  const [savingUtr, setSavingUtr] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

  // 1. Fetch Refund Entries Strictly Filtered by Calendar Date
  const fetchRefunds = async () => {
    setLoading(true);

    const start = `${selectedDate}T00:00:00.000Z`;
    const end = `${selectedDate}T23:59:59.999Z`;

    let query = supabase
      .from("refunds")
      .select("*, orders(order_number, total_amount, profiles(name, phone))")
      .gte("refunded_at", start)
      .lte("refunded_at", end)
      .order("refunded_at", { ascending: false });

    const { data, error } = await query;

    if (error) {
      // Fallback query if deep relationship schema is slightly different
      let fallback = supabase
        .from("refunds")
        .select("*")
        .gte("refunded_at", start)
        .lte("refunded_at", end)
        .order("refunded_at", { ascending: false });

      const { data: fallbackData } = await fallback;
      setRefunds(fallbackData || []);
    } else {
      setRefunds(data || []);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchRefunds();
  }, [selectedDate]);

  // 2. Financial KPI Metrics (Shows 00 / 0.00 on empty days)
  const stats = useMemo(() => {
    let totalAmount = 0;
    let upiAmount = 0;
    let cashAmount = 0;
    let pendingUtrCount = 0;

    refunds.forEach((r) => {
      const val = Number(r.amount || 0);
      totalAmount += val;

      if (r.refund_method?.toLowerCase() === "cash") {
        cashAmount += val;
      } else {
        upiAmount += val;
        if (!r.transaction_ref) {
          pendingUtrCount += 1;
        }
      }
    });

    return {
      totalItems: refunds.length,
      totalAmount,
      upiAmount,
      cashAmount,
      pendingUtrCount,
    };
  }, [refunds]);

  // Filtered Refunds by Method
  const filteredRefunds = useMemo(() => {
    if (activeMethodFilter === "all") return refunds;
    return refunds.filter(
      (r) => r.refund_method?.toLowerCase() === activeMethodFilter
    );
  }, [refunds, activeMethodFilter]);

  // Save / Update UTR Reference
  const handleSaveUtr = async (id: string) => {
    if (!tempUtr.trim()) return alert("Enter a valid UTR or reference number.");
    setSavingUtr(true);

    const { error } = await supabase
      .from("refunds")
      .update({ transaction_ref: tempUtr.trim() })
      .eq("id", id);

    if (error) {
      alert("Failed to save reference: " + error.message);
    } else {
      setRefunds((prev) =>
        prev.map((r) => (r.id === id ? { ...r, transaction_ref: tempUtr.trim() } : r))
      );
      setEditingUtrId(null);
      setTempUtr("");
    }
    setSavingUtr(false);
  };
  return (
    <div className="space-y-4">
      {/* 1. Universal Top Date Bar */}
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

        <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
          <span>
            Total Entries: <strong className="text-slate-800">{stats.totalItems}</strong>
          </span>
          {stats.pendingUtrCount > 0 && (
            <span className="bg-amber-100 text-amber-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-amber-200">
              ⚠️ {stats.pendingUtrCount} UTR Pending
            </span>
          )}
        </div>
      </div>

      {/* 2. Financial Metrics Cards (Strict Universal Template - 00 State Guaranteed) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">
            Total Refund Items
          </p>
          <p className="text-xl font-bold text-slate-800 mt-1">
            {stats.totalItems < 10 ? `0${stats.totalItems}` : stats.totalItems}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">Recorded Claims</p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">
            Total Refunded Value
          </p>
          <p className="text-xl font-bold text-rose-600 mt-1">
            ₹{stats.totalAmount.toFixed(2)}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">Deducted from sales</p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">
            UPI Settlements
          </p>
          <p className="text-xl font-bold text-blue-600 mt-1">
            ₹{stats.upiAmount.toFixed(2)}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">Direct bank transfers</p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">
            Cash Settlements
          </p>
          <p className="text-xl font-bold text-amber-700 mt-1">
            ₹{stats.cashAmount.toFixed(2)}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">Delivery boy handovers</p>
        </div>
      </div>

      {/* 3. Method Filter Tabs */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center gap-2 shadow-xs">
        <button
          onClick={() => setActiveMethodFilter("all")}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
            activeMethodFilter === "all"
              ? "bg-slate-900 text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          All Claims ({refunds.length})
        </button>
        <button
          onClick={() => setActiveMethodFilter("upi")}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
            activeMethodFilter === "upi"
              ? "bg-blue-600 text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          UPI Only ({refunds.filter((r) => r.refund_method?.toLowerCase() === "upi").length})
        </button>
        <button
          onClick={() => setActiveMethodFilter("cash")}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
            activeMethodFilter === "cash"
              ? "bg-amber-600 text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          Cash Only ({refunds.filter((r) => r.refund_method?.toLowerCase() === "cash").length})
        </button>
      </div>

      {/* 4. Itemized Audit Register */}
      {loading ? (
        <div className="bg-white rounded-xl p-8 text-center text-slate-500 border border-slate-200">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-xs">Loading refund audit logs for {selectedDate}...</p>
        </div>
      ) : filteredRefunds.length === 0 ? (
        <div className="bg-white rounded-xl p-10 text-center text-slate-500 border border-slate-200">
          <p className="text-base font-semibold text-slate-700">No refunds recorded</p>
          <p className="text-xs text-slate-400 mt-1">
            There are 00 refund claims matching this filter on {selectedDate}.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRefunds.map((refund) => {
            const badge = REASON_BADGES[refund.reason] || REASON_BADGES.other;
            const isUpi = refund.refund_method?.toLowerCase() === "upi";
            const orderNumber = refund.orders?.order_number || refund.order_id;
            const customerName = refund.orders?.profiles?.name || "Customer";
            const customerPhone = refund.orders?.profiles?.phone;

            return (
              <div
                key={refund.id}
                className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4"
              >
                {/* Left Side: Product & Claim Details */}
                <div className="space-y-1.5 max-w-md">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">
                      #{orderNumber}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wide border ${badge.color}`}
                    >
                      {badge.label}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase ${
                        isUpi
                          ? "bg-blue-50 text-blue-700 border border-blue-200"
                          : "bg-amber-50 text-amber-700 border border-amber-200"
                      }`}
                    >
                      {refund.refund_method}
                    </span>
                  </div>

                  <p className="text-xs font-bold text-slate-800">
                    Item: {refund.product_name}
                    {refund.weight_kg > 0 && ` (${refund.weight_kg} Kg)`}
                    {refund.quantity > 1 && ` × ${refund.quantity}`}
                  </p>

                  <p className="text-[11px] text-slate-500">
                    Customer: {customerName} {customerPhone ? `(${customerPhone})` : ""} •{" "}
                    Logged: {new Date(refund.refunded_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>

                {/* Right Side: Financial Math & Settlement Action */}
                <div className="flex flex-col sm:items-end gap-2">
                  <div className="text-right">
                    <span className="text-xs text-slate-400 font-medium mr-1.5">Amount:</span>
                    <span className="text-base font-black text-rose-600">
                      - ₹{Number(refund.amount).toFixed(2)}
                    </span>
                  </div>

                  {/* UPI Copy Button */}
                  {isUpi && refund.customer_upi && (
                    <div className="flex items-center gap-2 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                      <span className="font-mono text-xs font-bold text-blue-700">
                        {refund.customer_upi}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(refund.customer_upi || "");
                          setCopiedId(refund.id);
                          setTimeout(() => setCopiedId(null), 2000);
                        }}
                        className="text-[10px] bg-blue-600 hover:bg-blue-700 text-white px-2 py-0.5 rounded font-semibold"
                      >
                        {copiedId === refund.id ? "✓ Copied" : "📋 Copy"}
                      </button>
                    </div>
                  )}

                  {/* UTR / Bank Reference Manager */}
                  {isUpi && (
                    <div className="text-xs">
                      {editingUtrId === refund.id ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            placeholder="Enter bank UTR / Ref"
                            value={tempUtr}
                            onChange={(e) => setTempUtr(e.target.value)}
                            className="text-xs border border-slate-300 rounded px-2 py-1 outline-none font-mono"
                          />
                          <button
                            onClick={() => handleSaveUtr(refund.id)}
                            disabled={savingUtr}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] px-2.5 py-1 rounded font-semibold"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingUtrId(null)}
                            className="text-slate-400 hover:text-slate-600 px-1 font-bold"
                          >
                            ✕
                          </button>
                        </div>
                      ) : refund.transaction_ref ? (
                        <div className="flex items-center gap-1 text-[11px] font-mono text-slate-600">
                          <span>UTR: <strong className="text-slate-800">{refund.transaction_ref}</strong></span>
                          <button
                            onClick={() => {
                              setEditingUtrId(refund.id);
                              setTempUtr(refund.transaction_ref || "");
                            }}
                            className="text-blue-600 hover:underline text-[10px] ml-1"
                          >
                            Edit
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingUtrId(refund.id);
                            setTempUtr("");
                          }}
                          className="text-[11px] bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 px-2.5 py-1 rounded-md font-semibold transition"
                        >
                          + Add Bank UTR Ref
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
