/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

type Order = {
  id: string;
  order_number: string;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  payment_method: string | null;
  payment_status: string;
  payment_type: "full" | "partial";
  partial_payment_amount: number;
  upi_transaction_id: string | null;
  payment_screenshot_url: string | null;
  screenshot_status: string;
  screenshot_attempts: number;
  rejection_reason: string | null;
  order_status: string;
  created_at: string;
  user_id: string | null;
};

export default function AdminPaymentsPage() {
  const supabase = createClient();
  const [orders, setOrders] = useState<Order[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "success" | "all">("pending");
  const [rejecting, setRejecting] = useState<Order | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [processing, setProcessing] = useState(false);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (filter === "pending") {
      query = query.eq("payment_status", "pending");
    } else if (filter === "success") {
      query = query.eq("payment_status", "success");
    }

    const { data, error } = await query;
    if (error) {
      console.error("Error fetching orders:", error.message);
      setLoading(false);
      return;
    }

    const orderList = (data as Order[]) || [];
    setOrders(orderList);

    const userIds = [
      ...new Set(orderList.map((o) => o.user_id).filter(Boolean)),
    ] as string[];

    if (userIds.length > 0) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, name, email")
        .in("id", userIds);

      const map: Record<string, any> = {};
      (profileData || []).forEach((p: any) => {
        map[p.id] = p;
      });
      setProfiles(map);
    }

    setLoading(false);
  }, [filter, supabase]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleApprove = async (order: Order) => {
    if (!confirm(`Approve payment for order #${order.order_number}?`)) return;
    setProcessing(true);

    const total = Number(order.total_amount || 0);
    const partial = Number(order.partial_payment_amount || 0);
    const paidAmount = order.payment_type === "partial" ? partial : total;

    const { error } = await supabase
      .from("orders")
      .update({
        payment_status: "success",
        payment_verified_by: "admin",
        payment_verified_at: new Date().toISOString(),
        screenshot_status: "approved",
        order_status: "current",
        status_changed_at: new Date().toISOString(),
        rejection_reason: null,
        paid_amount: paidAmount,
        remaining_amount: Math.max(0, total - paidAmount),
      })
      .eq("id", order.id);

    setProcessing(false);
    if (error) {
      alert("Approval failed: " + error.message);
      return;
    }
    fetchOrders();
  };

  const submitReject = async () => {
    if (!rejecting) return;
    if (!rejectReason.trim()) {
      alert("Please enter rejection reason");
      return;
    }
    setProcessing(true);

    const newAttempts = Number(rejecting.screenshot_attempts || 0) + 1;
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
      .eq("id", rejecting.id);

    setProcessing(false);
    if (error) {
      alert("Rejection failed: " + error.message);
      return;
    }
    setRejecting(null);
    setRejectReason("");
    fetchOrders();
  };

  const handleViewScreenshot = async (order: Order) => {
    if (!order.payment_screenshot_url) return;

    if (order.payment_screenshot_url.startsWith("http")) {
      setViewingImage(order.payment_screenshot_url);
      return;
    }

    setImageLoading(true);

    const sanitizedPath = order.payment_screenshot_url
      .replace(/^payment-screenshots\//, "")
      .replace(/^\/+/, "");

    const { data, error } = await supabase.storage
      .from("payment-screenshots")
      .createSignedUrl(sanitizedPath, 3600);

    setImageLoading(false);

    if (error || !data) {
      alert("Screenshot load failed: " + (error?.message || "File not found"));
      return;
    }

    setViewingImage(data.signedUrl);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-800">
            Payment Verification
          </h1>
          <p className="text-xs text-slate-500">
            Audit UPI screenshots and verify customer advance/full payments
          </p>
        </div>
      </div>

      <div className="flex gap-1.5">
        {(["pending", "success", "all"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-xs rounded-lg font-semibold capitalize transition ${
              filter === f
                ? "bg-blue-600 text-white shadow-xs"
                : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            {f === "pending" ? "Pending Verification" : f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="bg-white rounded-xl p-8 text-center text-slate-500 border border-slate-200">
          <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-xs">Loading payment orders...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center text-slate-500 border border-slate-200 text-xs">
          No {filter} payments found.
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => {
            const profile = o.user_id ? profiles[o.user_id] : null;
            const total = Number(o.total_amount || 0);
            const partial = Number(o.partial_payment_amount || 0);
            const paid = Number(o.paid_amount || 0);
            const remaining = Number(o.remaining_amount || 0);
            const codAmount = Math.max(0, total - partial);

            return (
              <div
                key={o.id}
                className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex-1 min-w-[200px]">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-bold text-slate-900 text-sm">
                        #{o.order_number}
                      </p>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider border ${
                          o.payment_status === "success"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : o.payment_status === "pending"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : o.payment_status === "failed"
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : "bg-purple-50 text-purple-700 border-purple-200"
                        }`}
                      >
                        {o.payment_status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">
                      👤 {profile?.name || "Customer"} {profile?.email ? `• ${profile.email}` : ""}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {new Date(o.created_at).toLocaleString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-base font-bold text-slate-900">
                      ₹{total.toFixed(2)}
                    </p>
                    <p className="text-xs text-slate-600 mt-0.5">
                      {o.payment_type === "partial" ? (
                        <>
                          <span className="font-semibold text-emerald-700">Advance: ₹{partial.toFixed(2)}</span>
                          {" • "}
                          <span className="font-semibold text-amber-700">COD: ₹{codAmount.toFixed(2)}</span>
                        </>
                      ) : (
                        <>
                          Paid: ₹{paid.toFixed(2)} • Due: ₹{remaining.toFixed(2)}
                        </>
                      )}
                    </p>
                    {o.payment_method && (
                      <p className="text-[11px] text-slate-400 mt-0.5 uppercase tracking-wide font-medium">
                        Method: {o.payment_method}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-3 text-xs">
                  <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100">
                    <p className="text-[11px] text-slate-500 mb-0.5 font-medium">
                      UPI Transaction ID / Ref
                    </p>
                    <p className="font-mono font-semibold text-slate-800 truncate">
                      {o.upi_transaction_id || "Not Provided"}
                    </p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100">
                    <p className="text-[11px] text-slate-500 mb-0.5 font-medium">
                      Screenshot Audit
                    </p>
                    <p className="font-semibold text-slate-800 capitalize">
                      {o.screenshot_status}
                    </p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100">
                    <p className="text-[11px] text-slate-500 mb-0.5 font-medium">
                      Submission Attempts
                    </p>
                    <p className="font-semibold text-slate-800">
                      {o.screenshot_attempts || 0} / 3 Attempts
                    </p>
                  </div>
                </div>

                {o.payment_screenshot_url && (
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      onClick={() => handleViewScreenshot(o)}
                      disabled={imageLoading}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 flex items-center gap-1.5 transition disabled:opacity-50"
                    >
                      <span>📸</span>
                      <span>{imageLoading ? "Opening Image..." : "View Payment Proof"}</span>
                    </button>
                  </div>
                )}

                {o.rejection_reason && (
                  <div className="mt-3 bg-rose-50 border border-rose-200 rounded-lg p-2.5">
                    <p className="text-xs text-rose-700">
                      <strong>Audit Note (Rejected):</strong> {o.rejection_reason}
                    </p>
                  </div>
                )}

                {o.payment_status === "pending" && (
                  <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
                    <button
                      onClick={() => handleApprove(o)}
                      disabled={processing}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-lg disabled:opacity-50 transition shadow-xs"
                    >
                      ✓ Approve Payment
                    </button>
                    <button
                      onClick={() => {
                        setRejecting(o);
                        setRejectReason("");
                      }}
                      disabled={processing}
                      className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold px-4 py-2 rounded-lg disabled:opacity-50 transition"
                    >
                      ✕ Reject Screenshot
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Reject Modal */}
      {rejecting && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Reject Payment Proof
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Order #{rejecting.order_number}
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Rejection Reason *
              </label>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Unclear screenshot, UTR not matching statement..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 text-xs"
              />
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
              ⚠️ Attempt count will become{" "}
              <strong>{(Number(rejecting.screenshot_attempts || 0)) + 1} of 3</strong>.
              After 3 failed attempts, order status will automatically shift to <strong>Spam</strong>.
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setRejecting(null)}
                className="flex-1 py-2 text-xs font-semibold border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={submitReject}
                disabled={processing}
                className="flex-1 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg disabled:opacity-50 transition shadow-xs"
              >
                {processing ? "Rejecting..." : "Confirm Reject"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Proof Preview */}
      {viewingImage && (
        <div
          onClick={() => setViewingImage(null)}
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="max-w-full max-h-full flex flex-col items-center">
            <img
              src={viewingImage}
              alt="Payment screenshot"
              className="max-w-full max-h-[80vh] object-contain rounded-xl shadow-2xl border border-white/10"
            />
            <p className="text-white/80 text-xs mt-3 bg-black/60 px-3 py-1 rounded-full">
              Click anywhere to close
            </p>
          </div>
        </div>
      )}
    </div>
  );
      }
      
