"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Order = {
  id: string;
  order_number: string;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  payment_method: string | null;
  payment_status: string;
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

  const fetchOrders = async () => {
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

    const { data } = await query;
    const orderList = (data as Order[]) || [];
    setOrders(orderList);

    // Fetch profiles separately
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
  };

  useEffect(() => {
    fetchOrders();
  }, [filter]);

  const handleApprove = async (order: Order) => {
    if (!confirm(`Approve payment for order ${order.order_number}?`)) return;
    setProcessing(true);

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
      })
      .eq("id", order.id);

    setProcessing(false);
    if (error) {
      alert(error.message);
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

    const newAttempts = (rejecting.screenshot_attempts || 0) + 1;
    const maxAttempts = 3;

    const updateData: any = {
      payment_status: "pending",
      screenshot_status: "rejected",
      rejection_reason: rejectReason.trim(),
      screenshot_attempts: newAttempts,
    };

    if (newAttempts >= maxAttempts) {
      updateData.order_status = "spam";
      updateData.status_changed_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from("orders")
      .update(updateData)
      .eq("id", rejecting.id);

    setProcessing(false);
    if (error) {
      alert(error.message);
      return;
    }
    setRejecting(null);
    setRejectReason("");
    fetchOrders();
  };

  // ✅ FIXED: Use Signed URL for private bucket
  const handleViewScreenshot = async (order: Order) => {
    if (!order.payment_screenshot_url) return;

    // If it's already a full URL (old data), use directly
    if (order.payment_screenshot_url.startsWith("http")) {
      setViewingImage(order.payment_screenshot_url);
      return;
    }

    setImageLoading(true);

    // Generate signed URL (valid for 1 hour)
    const { data, error } = await supabase.storage
      .from("payment-screenshots")
      .createSignedUrl(order.payment_screenshot_url, 3600);

    setImageLoading(false);

    if (error || !data) {
      alert("Screenshot load failed: " + (error?.message || "Unknown error"));
      return;
    }

    setViewingImage(data.signedUrl);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-4">
        Payment Verification
      </h1>

      <div className="flex gap-2 mb-4">
        {(["pending", "success", "all"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-sm rounded-lg font-medium capitalize ${
              filter === f
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center text-gray-500">
          No {filter} payments found.
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((o) => {
            const profile = o.user_id ? profiles[o.user_id] : null;
            return (
              <div
                key={o.id}
                className="bg-white rounded-xl border border-gray-200 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex-1 min-w-[200px]">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-bold text-gray-800">{o.order_number}</p>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          o.payment_status === "success"
                            ? "bg-green-100 text-green-700"
                            : o.payment_status === "pending"
                            ? "bg-yellow-100 text-yellow-700"
                            : o.payment_status === "failed"
                            ? "bg-red-100 text-red-700"
                            : "bg-purple-100 text-purple-700"
                        }`}
                      >
                        {o.payment_status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      {profile?.name || "—"} • {profile?.email || ""}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(o.created_at).toLocaleString("en-IN")}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-800">
                      ₹{o.total_amount}
                    </p>
                    <p className="text-xs text-gray-500">
                      Paid: ₹{o.paid_amount} • Due: ₹{o.remaining_amount}
                    </p>
                    {o.payment_method && (
                      <p className="text-xs text-gray-400 mt-1">
                        Method: {o.payment_method}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">
                      UPI Transaction ID
                    </p>
                    <p className="text-sm font-medium text-gray-800">
                      {o.upi_transaction_id || "—"}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">
                      Screenshot Status
                    </p>
                    <p className="text-sm font-medium text-gray-800 capitalize">
                      {o.screenshot_status}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">
                      Screenshot Attempts
                    </p>
                    <p className="text-sm font-medium text-gray-800">
                      {o.screenshot_attempts || 0} / 3
                    </p>
                  </div>
                </div>

                {o.payment_screenshot_url && (
                  <div className="mt-3">
                    <p className="text-xs text-gray-500 mb-2">
                      Customer Payment Screenshot
                    </p>
                    <button
                      onClick={() => handleViewScreenshot(o)}
                      disabled={imageLoading}
                      className="text-blue-600 hover:underline text-sm font-medium disabled:opacity-50"
                    >
                      {imageLoading ? "Loading..." : "📸 View Screenshot"}
                    </button>
                  </div>
                )}

                {o.rejection_reason && (
                  <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-2">
                    <p className="text-xs text-red-700">
                      <strong>Last rejection:</strong> {o.rejection_reason}
                    </p>
                  </div>
                )}

                {o.payment_status === "pending" && (
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => handleApprove(o)}
                      disabled={processing}
                      className="bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-2 rounded-lg font-medium disabled:opacity-50"
                    >
                      ✅ Approve Payment
                    </button>
                    <button
                      onClick={() => {
                        setRejecting(o);
                        setRejectReason("");
                      }}
                      disabled={processing}
                      className="bg-red-50 hover:bg-red-100 text-red-700 text-sm px-4 py-2 rounded-lg font-medium disabled:opacity-50"
                    >
                      ❌ Reject
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {rejecting && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold mb-1">Reject Payment</h2>
            <p className="text-sm text-gray-500 mb-4">
              Order #{rejecting.order_number}
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rejection Reason *
                </label>
                <textarea
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. Blurry screenshot, amount mismatch..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-800">
                ⚠️ Customer কে আবার screenshot দিতে বলা হবে। এটা attempt #
                {(rejecting.screenshot_attempts || 0) + 1} হবে। 3 attempts এর পর
                order স্বয়ংক্রিয়ভাবে Spam এ যাবে।
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setRejecting(null)}
                  className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={submitReject}
                  disabled={processing}
                  className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium disabled:opacity-50"
                >
                  {processing ? "Rejecting..." : "Confirm Reject"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {viewingImage && (
        <div
          onClick={() => setViewingImage(null)}
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
        >
          <div className="max-w-full max-h-full">
            <img
              src={viewingImage}
              alt="Payment screenshot"
              className="max-w-full max-h-[85vh] object-contain rounded-lg"
            />
            <p className="text-white text-center text-xs mt-3">
              Tap anywhere to close
            </p>
          </div>
        </div>
      )}
    </div>
  );
                  }
