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
  paid_amount: number;
  remaining_amount: number;
  partial_payment_amount: number;
  payment_status: string;
  screenshot_attempts: number;
  screenshot_status: string;
  rejection_reason: string | null;
  upi_transaction_id: string | null;
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
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [method, setMethod] = useState<"upi_now" | "qr_screenshot">("upi_now");
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

      const [orderData, upiSetting] = await Promise.all([
        supabase
          .from("orders")
          .select("*")
          .eq("id", orderId)
          .single(),
        supabase
          .from("settings")
          .select("value")
          .eq("key", "upi_id")
          .single(),
      ]);

      if (!orderData.data) {
        setLoading(false);
        return;
      }

      setOrder(orderData.data);
      const upi = upiSetting.data?.value || "shop@upi";
      setUpiId(upi);

      // Generate UPI deep link QR
      const amountToPay =
        orderData.data.payment_type === "partial"
          ? orderData.data.partial_payment_amount
          : orderData.data.total_amount;

      const upiLink = `upi://pay?pa=${upi}&pn=Quickpin&am=${amountToPay.toFixed(
        2
      )}&tn=Order ${orderData.data.order_number}&cu=INR`;

      try {
        const qr = await QRCode.toDataURL(upiLink, {
          width: 300,
          margin: 2,
        });
        setQrDataUrl(qr);
      } catch (err) {
        console.error("QR generation failed:", err);
      }

      setLoading(false);
    };

    fetchData();
  }, [orderId, user, userLoading, supabase, router]);

  const amountToPay =
    order?.payment_type === "partial"
      ? order?.partial_payment_amount || 0
      : order?.total_amount || 0;

  const getUpiLink = () => {
    if (!order) return "";
    return `upi://pay?pa=${upiId}&pn=Quickpin&am=${amountToPay.toFixed(
      2
    )}&tn=Order ${order.order_number}&cu=INR`;
  };

  const handlePayNow = () => {
    const link = getUpiLink();
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

    // Private bucket — return the path (not public URL)
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
      lang === "bn"
        ? "✅ স্ক্রিনশট জমা হয়েছে। অ্যাডমিন যাচাই করবে।"
        : "✅ Screenshot submitted. Admin will verify."
    );

    setTimeout(() => {
      router.push("/orders");
    }, 2000);
  };

  if (loading || userLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading payment...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-6xl mb-4">🔍</p>
          <p className="text-gray-600 mb-4">Order not found</p>
          <Link
            href="/home"
            className="text-blue-600 hover:underline text-sm font-medium"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    );
  }

  // Already paid — show success
  if (order.payment_status === "success") {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
            <Link href="/home" className="text-2xl font-bold text-blue-600">
              {t("app_name")}
            </Link>
            <UserMenu />
          </div>
        </header>
        <div className="max-w-2xl mx-auto px-4 py-12 text-center">
          <p className="text-6xl mb-4">🎉</p>
          <h1 className="text-2xl font-bold text-green-600 mb-2">
            {t("payment_success")}
          </h1>
          <p className="text-gray-600 mb-2">
            {lang === "bn" ? "অর্ডার নম্বর" : "Order Number"}:{" "}
            <strong>{order.order_number}</strong>
          </p>
          <p className="text-gray-600 mb-8">
            {lang === "bn"
              ? "আপনার অর্ডার প্রসেসিং শুরু হয়েছে।"
              : "Your order is being processed."}
          </p>
          <Link
            href="/orders"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium transition"
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
          <Link
            href="/orders"
            className="text-sm text-gray-600 hover:text-blue-600"
          >
            ← {t("my_orders")}
          </Link>
          <UserMenu />
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Header info */}
        <div className="text-center mb-6">
          <p className="text-sm text-gray-500 mb-1">
            {lang === "bn" ? "অর্ডার নম্বর" : "Order Number"}
          </p>
          <p className="text-xl font-bold text-gray-800 mb-4">
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
                ? `মোট ₹${order.total_amount} এর মধ্যে ${Math.round(
                    (amountToPay / order.total_amount) * 100
                  )}% এখন`
                : `${Math.round(
                    (amountToPay / order.total_amount) * 100
                  )}% of total ₹${order.total_amount} now`}
            </p>
          )}
        </div>

        {/* Rejection warning (if any) */}
        {order.rejection_reason && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-sm text-red-700">
            <p className="font-medium mb-1">
              ⚠️{" "}
              {lang === "bn"
                ? "আগের স্ক্রিনশট প্রত্যাখ্যাত হয়েছে"
                : "Previous screenshot rejected"}
            </p>
            <p className="text-xs">{order.rejection_reason}</p>
          </div>
        )}

        {/* Method tabs */}
        <div className="bg-white rounded-2xl p-1 mb-4 flex">
          <button
            onClick={() => setMethod("upi_now")}
            className={`flex-1 py-3 text-sm font-medium rounded-xl transition ${
              method === "upi_now"
                ? "bg-blue-600 text-white"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            💳 {t("pay_now")}
          </button>
          <button
            onClick={() => setMethod("qr_screenshot")}
            className={`flex-1 py-3 text-sm font-medium rounded-xl transition ${
              method === "qr_screenshot"
                ? "bg-blue-600 text-white"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            📱 QR / Screenshot
          </button>
        </div>

        {/* UPI Pay Now */}
        {method === "upi_now" && (
          <div className="bg-white rounded-2xl p-6 mb-4 text-center">
            <p className="text-5xl mb-4">📲</p>
            <h2 className="font-semibold text-gray-800 mb-2">
              {lang === "bn"
                ? "UPI অ্যাপ দিয়ে পেমেন্ট করুন"
                : "Pay with UPI App"}
            </h2>
            <p className="text-xs text-gray-500 mb-6">
              {lang === "bn"
                ? "নিচের বাটনে ক্লিক করলে আপনার UPI অ্যাপ খুলবে"
                : "Click below to open your UPI app"}
            </p>

            <button
              onClick={handlePayNow}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 rounded-xl transition mb-3"
            >
              {lang === "bn"
                ? "UPI অ্যাপ খুলুন"
                : "Open UPI App"}
            </button>

            <p className="text-xs text-gray-400">
              {lang === "bn"
                ? "পেমেন্ট শেষ হলে অটো যাচাই হবে"
                : "Payment auto-verifies after completion"}
            </p>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-4 text-xs text-yellow-800 text-left">
              💡{" "}
              {lang === "bn"
                ? "পেমেন্ট সফল না হলে, QR/Screenshot tab থেকে verify করুন"
                : "If payment doesn't auto-verify, use QR/Screenshot tab"}
            </div>
          </div>
        )}

        {/* QR + Screenshot */}
        {method === "qr_screenshot" && (
          <>
            <div className="bg-white rounded-2xl p-6 mb-4 text-center">
              <h2 className="font-semibold text-gray-800 mb-2">
                {t("qr_code")}
              </h2>
              <p className="text-xs text-gray-500 mb-4">
                {lang === "bn"
                  ? "নিচের QR স্ক্যান করে UPI অ্যাপ দিয়ে payment করুন"
                  : "Scan QR below with UPI app to pay"}
              </p>

              {qrDataUrl && (
                <div className="bg-white p-3 rounded-xl inline-block border border-gray-200 mb-4">
                  <img
                    src={qrDataUrl}
                    alt="UPI QR Code"
                    className="w-64 h-64"
                  />
                </div>
              )}

              <div className="bg-gray-50 rounded-lg p-3 mb-4 text-sm">
                <p className="text-xs text-gray-500 mb-1">UPI ID</p>
                <p className="font-mono text-gray-800">{upiId}</p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800 text-left">
                💡{" "}
                {lang === "bn"
                  ? "Payment শেষে স্ক্রিনশট নিয়ে নিচে আপলোড করুন। অটো verify হলে স্ক্রিনশট লাগবে না।"
                  : "After payment, upload screenshot below. If auto-verified, no screenshot needed."}
              </div>
            </div>

            {/* Screenshot upload */}
            <div className="bg-white rounded-2xl p-6 mb-4">
              <h2 className="font-semibold text-gray-800 mb-3">
                📸 {t("upload_screenshot")}
              </h2>

              {order.screenshot_status === "pending" ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                  ⏳{" "}
                  {lang === "bn"
                    ? "আপনার স্ক্রিনশট যাচাই করা হচ্ছে"
                    : "Your screenshot is being verified"}
                </div>
              ) : (
                <>
                  <div className="mb-4">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) =>
                        setScreenshot(e.target.files?.[0] || null)
                      }
                      className="w-full text-sm text-gray-700"
                    />
                    {screenshot && (
                      <p className="text-xs text-green-600 mt-2">
                        ✓ {screenshot.name}
                      </p>
                    )}
                  </div>

                  {order.screenshot_attempts > 0 && (
                    <p className="text-xs text-gray-500 mb-3">
                      {lang === "bn"
                        ? `চেষ্টা: ${order.screenshot_attempts}/3`
                        : `Attempts: ${order.screenshot_attempts}/3`}
                    </p>
                  )}

                  <button
                    onClick={handleSubmitScreenshot}
                    disabled={uploading || !screenshot}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-50"
                  >
                    {uploading
                      ? lang === "bn"
                        ? "আপলোড হচ্ছে..."
                        : "Uploading..."
                      : lang === "bn"
                      ? "স্ক্রিনশট জমা দিন"
                      : "Submit Screenshot"}
                  </button>
                </>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              {message && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-3 text-sm text-green-700">
                  {message}
                </div>
              )}
            </div>
          </>
        )}

        {/* Order summary */}
        <div className="bg-white rounded-2xl p-5 text-sm">
          <h3 className="font-semibold text-gray-800 mb-3">
            📋 {lang === "bn" ? "সারসংক্ষেপ" : "Summary"}
          </h3>
          <div className="space-y-2 text-gray-600">
            <div className="flex justify-between">
              <span>{lang === "bn" ? "ডেলিভারি" : "Delivery"}</span>
              <span className="font-medium">
                {order.delivery_type === "self_pickup"
                  ? t("self_pickup")
                  : t("home_delivery")}
              </span>
            </div>
            <div className="flex justify-between">
              <span>{lang === "bn" ? "পেমেন্ট ধরন" : "Payment Type"}</span>
              <span className="font-medium">
                {order.payment_type === "full"
                  ? t("full_payment")
                  : t("partial_payment")}
              </span>
            </div>
            <div className="flex justify-between border-t border-gray-200 pt-2">
              <span className="font-bold text-gray-800">{t("total")}</span>
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
