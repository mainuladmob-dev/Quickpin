"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useUser } from "@/lib/auth/useUser";
import UserMenu from "@/components/UserMenu";

type CartItem = {
  id: string;
  quantity: number;
  product: {
    id: string;
    name_bn: string;
    name_en: string;
    price: number;
    stock: number;
    images: string[];
  } | null;
};

type Settings = {
  min_cart_units: string;
};

export default function CartPage() {
  const supabase = createClient();
  const router = useRouter();
  const { lang, t } = useLanguage();
  const { user, loading: userLoading } = useUser();

  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [minUnits, setMinUnits] = useState(10);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (userLoading) return;

      if (!user) {
        router.push("/home");
        return;
      }

      const [cartData, settingsData] = await Promise.all([
        supabase
          .from("cart")
          .select(
            "id, quantity, product:products(id, name_bn, name_en, price, stock, images)"
          )
          .eq("user_id", user.id),
        supabase
          .from("settings")
          .select("value")
          .eq("key", "min_cart_units")
          .maybeSingle(),
      ]);

      setItems((cartData.data as any) || []);
      if (settingsData.data?.value) {
        setMinUnits(parseInt(settingsData.data.value) || 10);
      }
      setLoading(false);
    };

    fetchData();
  }, [user, userLoading, router]);

  const fetchCart = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("cart")
      .select(
        "id, quantity, product:products(id, name_bn, name_en, price, stock, images)"
      )
      .eq("user_id", user.id);
    setItems((data as any) || []);
  };

  const updateQuantity = async (cartId: string, newQty: number, maxStock: number) => {
    if (newQty < 1) return;
    if (newQty > maxStock) {
      alert(
        lang === "bn"
          ? `স্টকে মাত্র ${maxStock} টি আছে`
          : `Only ${maxStock} available in stock`
      );
      return;
    }

    setUpdating(cartId);
    await supabase
      .from("cart")
      .update({ quantity: newQty })
      .eq("id", cartId);
    await fetchCart();
    setUpdating(null);
  };

  const removeItem = async (cartId: string) => {
    if (
      !confirm(
        lang === "bn"
          ? "কার্ট থেকে সরাতে চান?"
          : "Remove from cart?"
      )
    )
      return;
    setUpdating(cartId);
    await supabase.from("cart").delete().eq("id", cartId);
    await fetchCart();
    setUpdating(null);
  };

  const getName = (item: { name_bn: string; name_en: string }) =>
    lang === "bn" ? item.name_bn : item.name_en;

  const totalUnits = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce(
    (sum, item) =>
      sum + (item.product ? item.product.price * item.quantity : 0),
    0
  );
  const canCheckout = totalUnits >= minUnits;

  // ভাষা ফাইলে কী না থাকলেও ক্র্যাশ আটকানোর সেফটি টেক্সট
  const minUnitsMsg = (t("min_units_msg") || "").includes("{count}")
    ? t("min_units_msg").replace("{count}", String(totalUnits))
    : lang === "bn"
    ? `কমপক্ষে ${minUnits} ইউনিট কার্টে থাকতে হবে (বর্তমানে আছে ${totalUnits} টি)`
    : `Minimum ${minUnits} units required (currently ${totalUnits})`;

  if (loading || userLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
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
                className="bg-white rounded-xl p-4 flex gap-4 animate-pulse"
              >
                <div className="w-20 h-20 bg-gray-200 rounded-lg"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <Link href="/home" className="text-2xl font-bold text-blue-600">
            {t("app_name")}
          </Link>
          <UserMenu />
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">{t("cart")}</h1>

        {items.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center">
            <p className="text-6xl mb-4">🛒</p>
            <p className="text-gray-600 mb-6">{t("cart_empty")}</p>
            <Link
              href="/home"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium transition"
            >
              {lang === "bn" ? "কেনাকাটা শুরু করুন" : "Start Shopping"}
            </Link>
          </div>
        ) : (
          <>
            {/* Items */}
            <div className="space-y-3 mb-6">
              {items.map((item) => {
                if (!item.product) return null;
                const imageSrc =
                  Array.isArray(item.product.images) && item.product.images[0]
                    ? item.product.images[0]
                    : null;

                return (
                  <div
                    key={item.id}
                    className="bg-white rounded-xl p-3 flex gap-3 items-center"
                  >
                    {imageSrc ? (
                      <img
                        src={imageSrc}
                        alt={getName(item.product)}
                        className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-20 h-20 bg-gray-100 rounded-lg flex-shrink-0 flex items-center justify-center text-gray-400">
                        📦
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/product/${item.product.id}`}
                        className="text-sm font-medium text-gray-800 line-clamp-2 hover:text-blue-600"
                      >
                        {getName(item.product)}
                      </Link>
                      <p className="text-blue-600 font-bold text-sm mt-1">
                        ₹{item.product.price}
                      </p>

                      {/* Quantity controls */}
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={() =>
                            updateQuantity(
                              item.id,
                              item.quantity - 1,
                              item.product!.stock
                            )
                          }
                          disabled={updating === item.id || item.quantity <= 1}
                          className="w-7 h-7 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-40 font-bold text-sm"
                        >
                          −
                        </button>
                        <span className="w-8 text-center text-sm font-medium">
                          {updating === item.id ? "..." : item.quantity}
                        </span>
                        <button
                          onClick={() =>
                            updateQuantity(
                              item.id,
                              item.quantity + 1,
                              item.product!.stock
                            )
                          }
                          disabled={updating === item.id}
                          className="w-7 h-7 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-40 font-bold text-sm"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div className="text-right flex flex-col justify-between self-stretch">
                      <p className="font-bold text-gray-800 text-sm">
                        ₹{(item.product.price * item.quantity).toFixed(2)}
                      </p>
                      <button
                        onClick={() => removeItem(item.id)}
                        disabled={updating === item.id}
                        className="text-red-500 hover:text-red-700 text-xs mt-2"
                      >
                        🗑️ {t("delete")}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Summary */}
            <div className="bg-white rounded-2xl p-5 border border-gray-200">
              <div className="flex justify-between items-center mb-3 text-sm">
                <span className="text-gray-600">{t("subtotal")}</span>
                <span className="font-medium text-gray-800">
                  ₹{subtotal.toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between items-center mb-3 text-sm">
                <span className="text-gray-600">
                  {lang === "bn" ? "মোট ইউনিট" : "Total Units"}
                </span>
                <span
                  className={`font-bold ${
                    canCheckout ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {totalUnits} / {minUnits}
                </span>
              </div>

              <div className="border-t border-gray-200 pt-3 mb-4">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-gray-800">{t("total")}</span>
                  <span className="font-bold text-blue-600 text-xl">
                    ₹{subtotal.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Min units warning */}
              {!canCheckout && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded-lg mb-3">
                  {minUnitsMsg}
                </div>
              )}

              <button
                onClick={() => router.push("/checkout")}
                disabled={!canCheckout}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 rounded-xl transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {canCheckout
                  ? t("checkout")
                  : `${t("min_units_short") || (lang === "bn" ? "কমপক্ষে" : "Min units")} (${totalUnits}/${minUnits})`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
