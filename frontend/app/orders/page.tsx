"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useUser } from "@/lib/auth/useUser";
import UserMenu from "@/components/UserMenu";

type OrderItem = {
  id?: string;
  name?: string;
  product_name?: string;
  title?: string;
  quantity?: number;
  qty?: number;
  count?: number;
  price?: number;
  unit_price?: number;
  image?: string;
  [key: string]: any;
};

type Order = {
  id: string;
  order_number: string;
  delivery_type: string;
  payment_type: string;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  partial_payment_amount: number;
  payment_status: string;
  order_status: string;
  refund_reason: string | null;
  refund_amount: number | null;
  created_at: string;
  items?: any;
  order_items?: any;
  [key: string]: any;
};

const STATUS_LABELS: Record<
  string,
  { bn: string; en: string; color: string }
> = {
  pending: {
    bn: "অপেক্ষমাণ",
    en: "Pending",
    color: "bg-yellow-100 text-yellow-700",
  },
  current: {
    bn: "চলমান",
    en: "Current",
    color: "bg-green-100 text-green-700",
  },
  out_for_delivery: {
    bn: "ডেলিভারির পথে",
    en: "Out for Delivery",
    color: "bg-blue-100 text-blue-700",
  },
  delivered: {
    bn: "ডেলিভার হয়েছে",
    en: "Delivered",
    color: "bg-emerald-100 text-emerald-700",
  },
  refund: {
    bn: "ফেরত",
    en: "Refund",
    color: "bg-purple-100 text-purple-700",
  },
  spam: {
    bn: "বাতিল",
    en: "Spam",
    color: "bg-red-100 text-red-700",
  },
};

export default function MyOrdersPage() {
  const supabase = createClient();
  const { lang, t } = useLanguage();
  const { user, loading: userLoading } = useUser();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      if (userLoading) return;
      if (!user) {
        setLoading(false);
        return;
      }

      let fetchedOrders: any[] = [];

      // ১. প্রথমে সব কলাম সহ ফেচ করার চেষ্টা করবে
      const { data: allData, error: allError } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (!allError && allData) {
        fetchedOrders = allData;
      } else {
        // ২. যদি রিলেশন না থাকে, তবে orders টেবিলের সমস্ত ডেটা সরাসরি আনবে
        const { data: fallbackData, error: fallbackError } = await supabase
          .from("orders")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (!fallbackError && fallbackData) {
          fetchedOrders = fallbackData;
        } else {
          // ৩. নিরাপদ ব্যাকআপ: আপনার পুরোনো অরিজিনাল কুয়েরি
          const { data: originalData } = await supabase
            .from("orders")
            .select(
              "id, order_number, delivery_type, payment_type, total_amount, paid_amount, remaining_amount, partial_payment_amount, payment_status, order_status, refund_reason, refund_amount, created_at"
            )
            .eq("user_id", user.id)
            .order("created_at", { ascending: false });

          fetchedOrders = originalData || [];
        }
      }

      setOrders(fetchedOrders as Order[]);
      setLoading(false);
    };

    fetchOrders();
  }, [user, userLoading, supabase]);

  const getStatusInfo = (status: string) => {
    const info = STATUS_LABELS[status] || {
      bn: status,
      en: status,
      color: "bg-gray-100 text-gray-700",
    };
    return {
      label: lang === "bn" ? info.bn : info.en,
      color: info.color,
    };
  };

  if (loading || userLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm">
          <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
            <Link href="/home" className="text-2xl font-bold text-blue-600">
              {t("app_name")}
            </Link>
            <UserMenu />
          </div>
        </header>
        <div className="max-w-3xl mx-auto px-4 py-8">
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-xl p-4 animate-pulse space-y-2"
              >
                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm">
          <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
            <Link href="/home" className="text-2xl font-bold text-blue-600">
              {t("app_name")}
            </Link>
            <UserMenu />
          </div>
        </header>
        <div className="max-w-3xl mx-auto px-4 py-12 text-center">
          <p className="text-6xl mb-4">🔐</p>
          <p className="text-gray-600 mb-6">
            {lang === "bn"
              ? "অর্ডার দেখতে সাইন ইন করুন"
              : "Sign in to view your orders"}
          </p>
          <Link
            href="/home"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium transition"
          >
            {t("sign_in")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <Link href="/home" className="text-2xl font-bold text-blue-600">
            {t("app_name")}
          </Link>
          <UserMenu />
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">
          {t("my_orders")}
        </h1>

        {orders.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center">
            <p className="text-6xl mb-4">📦</p>
            <p className="text-gray-600 mb-6">
              {lang === "bn" ? "এখনো কোনো অর্ডার নেই" : "No orders yet"}
            </p>
            <Link
              href="/home"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium transition"
            >
              {lang === "bn" ? "কেনাকাটা শুরু করুন" : "Start Shopping"}
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((o) => {
              const status = getStatusInfo(o.order_status);

              const remainingAmount = (
                o.total_amount - (o.paid_amount || 0)
              ).toFixed(2);

              const isPartialAdvancePaid =
                o.payment_type === "partial" && (o.paid_amount || 0) > 0;

              // প্রোডাক্ট আইটেম বের করার নিরাপদ লজিক
              let orderItems: any[] = [];
              if (Array.isArray(o.items)) {
                orderItems = o.items;
              } else if (Array.isArray(o.order_items)) {
                orderItems = o.order_items;
              } else if (typeof o.items === "string") {
                try {
                  orderItems = JSON.parse(o.items);
                } catch {
                  orderItems = [];
                }
              }

              return (
                <div
                  key={o.id}
                  className="bg-white rounded-xl p-4 border border-gray-200"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <p className="font-bold text-gray-800">
                        {o.order_number}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {new Date(o.created_at).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <span
                      className={`text-xs px-3 py-1 rounded-full font-medium ${status.color}`}
                    >
                      {status.label}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
                    <div>
                      <p className="text-xs text-gray-500">
                        {lang === "bn" ? "ডেলিভারি" : "Delivery"}
                      </p>
                      <p className="font-medium text-gray-800">
                        {o.delivery_type === "self_pickup"
                          ? t("self_pickup")
                          : t("home_delivery")}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">
                        {lang === "bn" ? "পেমেন্ট" : "Payment"}
                      </p>
                      <p className="font-medium text-gray-800">
                        {o.payment_type === "full"
                          ? t("full_payment")
                          : t("partial_payment")}
                      </p>
                    </div>
                  </div>

                  {/* অর্ডার করা প্রোডাক্টের তালিকা */}
                  {orderItems.length > 0 && (
                    <div className="border-t border-b border-gray-100 py-3 mb-3 space-y-2">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        {lang === "bn" ? "অর্ডার করা আইটেম" : "Ordered Items"}
                      </p>
                      <div className="space-y-1.5">
                        {orderItems.map((item: any, idx: number) => {
                          const itemName =
                            item.name ||
                            item.product_name ||
                            item.title ||
                            item.product?.name ||
                            item.product?.title ||
                            "Item";
                          const itemQty =
                            item.quantity || item.qty || item.count || 1;
                          const itemPrice = item.price || item.unit_price || 0;

                          return (
                            <div
                              key={item.id || idx}
                              className="flex items-center justify-between text-sm"
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-gray-800 font-medium">
                                  {itemName}
                                </span>
                                <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                                  ×{itemQty}
                                </span>
                              </div>
                              <span className="text-gray-700 font-medium">
                                ₹{(itemPrice * itemQty).toFixed(2)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="bg-gray-50 rounded-lg p-3 mb-3">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">{t("total")}</span>
                      <span className="font-bold text-gray-800">
                        ₹{o.total_amount}
                      </span>
                    </div>
                    {o.payment_type === "partial" && (
                      <>
                        <div className="flex justify-between text-xs">
                          <span className="text-green-700">Advance</span>
                          <span className="font-medium text-green-700">
                            ₹{o.partial_payment_amount}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-orange-700">COD</span>
                          <span className="font-medium text-orange-700">
                            ₹
                            {(
                              o.total_amount - o.partial_payment_amount
                            ).toFixed(2)}
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  {o.order_status === "refund" && o.refund_reason && (
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-2 mb-3 text-xs">
                      <p className="text-purple-800">
                        <strong>
                          {lang === "bn" ? "ফেরত কারণ" : "Refund Reason"}:
                        </strong>{" "}
                        {o.refund_reason}
                      </p>
                      {o.refund_amount && (
                        <p className="text-purple-800 mt-0.5">
                          <strong>
                            {lang === "bn" ? "পরিমাণ" : "Amount"}:
                          </strong>{" "}
                          ₹{o.refund_amount}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Payment Button / COD Info */}
                  {(o.paid_amount || 0) < o.total_amount && (
                    <>
                      {isPartialAdvancePaid ? (
                        <button
                          disabled
                          className="block w-full text-center bg-gray-300 text-gray-600 font-semibold py-3 rounded-lg text-sm cursor-not-allowed"
                        >
                          {lang === "bn"
                            ? `💵 বাকি ₹${remainingAmount} Cash on Delivery তে পরিশোধ করুন`
                            : `💵 Remaining ₹${remainingAmount} to be paid via Cash on Delivery`}
                        </button>
                      ) : (
                        <Link
                          href={`/payment/${o.id}`}
                          className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg text-sm transition"
                        >
                          {o.payment_type === "full"
                            ? lang === "bn"
                              ? "সম্পূর্ণ পেমেন্ট করুন"
                              : "Complete Payment"
                            : lang === "bn"
                            ? "Advance পরিশোধ করুন"
                            : "Pay Advance"}
                        </Link>
                      )}
                    </>
                  )}

                  {/* Fully paid indicator */}
                  {(o.paid_amount || 0) >= o.total_amount &&
                    o.payment_status === "success" && (
                      <div className="block w-full text-center bg-green-50 border border-green-200 text-green-700 font-medium py-2.5 rounded-lg text-sm">
                        {lang === "bn" ? "✅ পরিশোধিত" : "✅ Paid"}
                      </div>
                    )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
    }
            
