"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useUser } from "@/lib/auth/useUser";
import UserMenu from "@/components/UserMenu";
import QRCode from "qrcode";

type Order = {
  id: string;
  order_number: string;
  user_id: string | null;
  delivery_type: string;
  payment_type: string;
  total_amount: number;
  partial_payment_amount: number;
  paid_amount: number;
  remaining_amount: number;
  payment_status: string;
  screenshot_attempts: number;
  screenshot_status: string;
  rejection_reason: string | null;
};

export default function PaymentPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params?.orderId as string;
  const supabase = createClient();
  const { lang, t } = useLanguage();
  const { user, loading: userLoading } = useUser();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [upiId, setUpiId] = useState("");
  const [manualQrUrl, setManualQrUrl] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [showManualQr, setShowManualQr] = useState(false);
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      if (userLoading) return;
      if (!user) {
        router.push("/home");
        return;
      }

      const [orderData, settingsData] = await Promise.all([
        supabase.from("orders").select("*").eq("id", orderId).single(),
        supabase
          .from("settings")
          .select("key, value")
          .in("key", ["upi_id", "upi_qr_image"]),
      ]);

      if (!orderData.data) {
        setLoading(false);
        return;
      }

      setOrder(orderData.data);

      const map: Record<string, string> = {};
      settingsData.data?.forEach((s: any) => (map[s.key] = s.value));

      const upi = map.upi_id || "shop@upi";
      setUpiId(upi);
      setManualQrUrl(map.upi_qr_image || "");

      const amountToPay =
        orderData.data.payment_type === "partial"
          ? orderData.data.partial_payment_amount
          : orderData.data.total_amount;

      const upiLink = `upi://pay?pa=${upi}&pn=Quickpin&am=${amountToPay.toFixed(
        2
      )}&tn=Order ${orderData.data.order_number}&cu=INR`;

      try {
        const qr = await QRCode.toDataURL(upiLink, { width: 300, margin: 2 });
        setQrDataUrl(qr);
      } catch (err) {
        console.error("QR failed:", err);
        setShowManualQr(true);
      }

      setLoading(false);
    };

    fetchData();
  }, [orderId, user, userLoading, supabase, router]);

  const alreadyPaid = order?.paid_amount || 0;
const totalAmount = order?.total_amount || 0;

const amountToPay =
  order?.payment_type === "partial"
    ? alreadyPaid > 0
      ? totalAmount - alreadyPaid    // ✅ COD (advance paid হলে)
      : order?.partial_payment_amount || 0    // ✅ Advance (এখনো paid হয়নি)
    : totalAmount - alreadyPaid;

  const handlePayNow = () => {
    if (!order) return;
    const link = `upi://pay?pa=${upiId}&pn=Quickpin&am=${amountToPay.toFixed(
      2
    )}&tn=Order ${order.order_number}&cu=INR`;
    window.location.href = link;
  };

  const uploadScreenshot = async (file: File): Promise<string | null> => {
    const ext = file.name.split(".").pop();
    const fileName = `${order?.order_number}-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("payment-screenshots")
      .upload(fileName, file);
    if (upErr) {
      setError("Upload failed: " + upErr.message);
      return null;
    }
    return fileName;
  };

  const handleSubmitScreenshot = async () => {
    if (!order || !screenshot) {
      setError(
        lang === "bn" ? "স্ক্রিনশট নির্বাচন করুন" : "Please select a screenshot"
      );
      return;
    }

    setUploading(true);
    setError("");

    const fileName = await uploadScreenshot(screenshot);
    if (!fileName) {
      setUploading(false);
      return;
    }

    const newAttempts = (order.screenshot_attempts || 0) + 1;

    const { error: updateErr } = await supabase
      .from("orders")
      .update({
        payment_method: "qr_screenshot",
        payment_screenshot_url: fileName,
        screenshot_status: "pending",
        screenshot_attempts: newAttempts,
        rejection_reason: null,
      })
      .eq("id", order.id);

    setUploading(false);

    if (updateErr) {
      setError(updateErr.message);
      return;
    }

    setMessage(
      lang === "bn" ? "✅ স্ক্রিনশট জমা হয়েছে" : "✅ Screenshot submitted"
    );

    setTimeout(() => router.push("/orders"), 2000);
  };

  if (loading || userLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-6xl mb-4">🔍</p>
          <p className="text-gray-600 mb-4">Order not found</p>
          <Link href="/home" className="text-blue-600 hover:underline text-sm">
            ← Back
          </Link>
        </div>
      </div>
    );
  }

  if (order.paid_amount >= order.total_amount) {
    const isPartial = order.payment_type === "partial";
    const codAmount = order.total_amount - order.partial_payment_amount;

    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
            <Link href="/home" className="text-2xl font-bold text-blue-600">
              Quickpin
            </Link>
            <UserMenu />
          </div>
        </header>
        <div className="max-w-2xl mx-auto px-4 py-12 text-center">
          <p className="text-6xl mb-4">🎉</p>
          <h1 className="text-2xl font-bold text-green-600 mb-2">
            {isPartial
              ? lang === "bn"
                ? "Advance পেয়েছি!"
                : "Advance Received!"
              : t("payment_success")}
          </h1>
          <p className="text-gray-600 mb-2">
            {lang === "bn" ? "অর্ডার নম্বর" : "Order"}:{" "}
            <strong>{order.order_number}</strong>
          </p>

          {isPartial && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 my-6">
              <p className="text-xs text-orange-700 mb-1 font-medium">
                Advance
              </p>
              <p className="text-lg font-bold text-green-600 mb-3">
                ₹{order.partial_payment_amount.toFixed(2)} ✅
              </p>

              <div className="border-t border-orange-200 pt-3">
                <p className="text-xs text-orange-700 mb-1 font-medium">
                  COD (ডেলিভারিতে দিতে হবে)
                </p>
                <p className="text-2xl font-bold text-orange-600">
                  ₹{codAmount.toFixed(2)}
                </p>
              </div>
            </div>
          )}

          <Link
            href="/orders"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium"
          >
            {t("my_orders")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <Link href="/orders" className="text-sm text-gray-600">
            ← {t("my_orders")}
          </Link>
          <UserMenu />
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Amount Header */}
        <div className="text-center mb-6">
          <p className="text-sm text-gray-500 mb-1">
            {lang === "bn" ? "অর্ডার নম্বর" : "Order Number"}
          </p>
          <p className="text-lg font-bold text-gray-800 mb-4">
            {order.order_number}
          </p>
          <p className="text-sm text-gray-500 mb-1">
            {lang === "bn" ? "পরিশোধ করতে হবে" : "Amount to pay"}
          </p>
          <p className="text-4xl font-bold text-blue-600">
            ₹{amountToPay.toFixed(2)}
          </p>
          {order.payment_type === "partial" && (
            <p className="text-xs text-gray-500 mt-2">
              {lang === "bn"
                ? `মোট ₹${order.total_amount} এর মধ্যে advance`
                : `Advance of total ₹${order.total_amount}`}
            </p>
          )}
        </div>

        {/* Rejection Warning */}
        {order.rejection_reason && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-sm text-red-700">
            <p className="font-medium mb-1">⚠️ Previous screenshot rejected</p>
            <p className="text-xs">{order.rejection_reason}</p>
          </div>
        )}

        {/* Payment Card */}
        <div className="bg-white rounded-2xl p-5 mb-4">
          <div className="flex flex-col md:flex-row gap-5 items-center">
            {/* Left: UPI App */}
            <div className="flex-1 w-full">
              <button
                onClick={handlePayNow}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 rounded-xl transition mb-3 flex items-center justify-center gap-2"
              >
                <span className="text-lg">📲</span>
                <span>
                  {lang === "bn"
                    ? "UPI App দিয়ে পেমেন্ট"
                    : "Pay with UPI App"}
                </span>
              </button>

              <p className="text-xs text-gray-500 text-center mb-2">
                {lang === "bn" ? "যেকোনো UPI অ্যাপ" : "Any UPI App"}
              </p>

              <div className="flex gap-2 justify-center">
                <div className="w-11 h-11 rounded-lg bg-purple-50 border border-purple-200 flex items-center justify-center text-[10px] font-bold text-purple-700">
                  PhonePe
                </div>
                <div className="w-11 h-11 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-[10px] font-bold text-blue-700">
                  Paytm
                </div>
                <div className="w-11 h-11 rounded-lg bg-green-50 border border-green-200 flex items-center justify-center text-[10px] font-bold text-green-700">
                  GPay
                </div>
                <div className="w-11 h-11 rounded-lg bg-orange-50 border border-orange-200 flex items-center justify-center text-[10px] font-bold text-orange-700">
                  BHIM
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="flex md:flex-col items-center gap-2 w-full md:w-auto">
              <div className="flex-1 md:flex-none md:w-px md:h-10 h-px bg-gray-200"></div>
              <span className="text-xs text-gray-400 font-medium">OR</span>
              <div className="flex-1 md:flex-none md:w-px md:h-10 h-px bg-gray-200"></div>
            </div>

            {/* Right: QR */}
            <div className="flex-1 w-full text-center">
              <p className="text-xs text-gray-500 mb-2">
                {lang === "bn" ? "QR স্ক্যান করুন" : "Scan QR Code"}
              </p>
              {(qrDataUrl || manualQrUrl) && (
                <div className="bg-white p-2 rounded-xl inline-block border border-gray-200">
                  <img
                    src={showManualQr && manualQrUrl ? manualQrUrl : qrDataUrl}
                    alt="QR Code"
                    className="w-32 h-32 md:w-36 md:h-36 object-contain"
                  />
                </div>
              )}
            </div>
          </div>

          {/* UPI ID + Toggle */}
          <div className="mt-4 pt-4 border-t border-gray-100 text-center">
            <div className="bg-gray-50 rounded-lg p-2 mb-3 inline-block text-xs">
              <span className="text-gray-500">UPI: </span>
              <span className="font-mono text-gray-800">{upiId}</span>
            </div>

            {qrDataUrl && manualQrUrl && (
              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => setShowManualQr(false)}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium ${
                    !showManualQr
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  Auto QR
                </button>
                <button
                  onClick={() => setShowManualQr(true)}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium ${
                    showManualQr
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  Backup QR
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Screenshot Upload */}
        {order.screenshot_status === "pending" ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 mb-4 text-sm text-yellow-800 text-center">
            ⏳{" "}
            {lang === "bn"
              ? "আপনার স্ক্রিনশট যাচাই করা হচ্ছে"
              : "Your screenshot is being verified"}
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-6 mb-4">
            <h2 className="font-semibold text-gray-800 mb-2">
              📸{" "}
              {lang === "bn"
                ? "পেমেন্টের প্রমাণ (ঐচ্ছিক)"
                : "Payment Proof (optional)"}
            </h2>
            <p className="text-xs text-gray-500 mb-4">
              {lang === "bn"
                ? "Auto verify না হলে, স্ক্রিনশট দিন"
                : "If not auto-verified, upload screenshot"}
            </p>

            <input
              type="file"
              accept="image/*"
              onChange={(e) => setScreenshot(e.target.files?.[0] || null)}
              className="w-full text-sm text-gray-700 mb-3"
            />
            {screenshot && (
              <p className="text-xs text-green-600 mb-3">✓ {screenshot.name}</p>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {message && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3 text-sm text-green-700">
                {message}
              </div>
            )}

            <button
              onClick={handleSubmitScreenshot}
              disabled={uploading || !screenshot}
              className="w-full bg-gray-800 hover:bg-gray-900 text-white font-medium py-3 rounded-xl transition disabled:opacity-50"
            >
              {uploading
                ? lang === "bn"
                  ? "আপলোড হচ্ছে..."
                  : "Uploading..."
                : lang === "bn"
                ? "স্ক্রিনশট জমা দিন"
                : "Submit Screenshot"}
            </button>
          </div>
        )}

        {/* Summary */}
        <div className="bg-white rounded-2xl p-5 text-sm">
          <h3 className="font-semibold text-gray-800 mb-3">📋 Summary</h3>
          <div className="space-y-2 text-gray-600">
            <div className="flex justify-between">
              <span>Delivery</span>
              <span className="font-medium">
                {order.delivery_type === "self_pickup"
                  ? t("self_pickup")
                  : t("home_delivery")}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Payment Type</span>
              <span className="font-medium">
                {order.payment_type === "full"
                  ? t("full_payment")
                  : t("partial_payment")}
              </span>
            </div>
            <div className="flex justify-between border-t border-gray-200 pt-2 mt-2">
              <span className="font-bold text-gray-800">Total</span>
              <span className="font-bold text-blue-600">
                ₹{order.total_amount}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
