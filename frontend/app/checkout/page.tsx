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
    weight: number | null;
  } | null;
};

type Address = {
  id: string;
  label: string;
  full_name: string;
  phone: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string;
  pincode: string;
  is_default: boolean;
};

export default function CheckoutPage() {
  const supabase = createClient();
  const router = useRouter();
  const { lang, t } = useLanguage();
  const { user, loading: userLoading } = useUser();

  const [items, setItems] = useState<CartItem[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);

  const [deliveryType, setDeliveryType] = useState<"self_pickup" | "home_delivery">(
    "home_delivery"
  );
  const [paymentType, setPaymentType] = useState<"full" | "partial">("full");

  const [settings, setSettings] = useState({
    delivery_charge: 50,
    partial_payment_percent: 30,
    min_cart_units: 10,
    enable_full_payment: true,
    enable_partial_payment: true,
    enable_self_pickup: true,
    enable_home_delivery: true,
    pickup_address: "",
  });

  useEffect(() => {
    const fetchData = async () => {
      if (userLoading) return;
      if (!user) {
        router.push("/home");
        return;
      }

      const [cartData, settingsData, addrData, profileData] = await Promise.all([
        supabase
          .from("cart")
          .select(
            "id, quantity, product:products(id, name_bn, name_en, price, weight)"
          )
          .eq("user_id", user.id),
        supabase.from("settings").select("key, value"),
        supabase
          .from("addresses")
          .select("*")
          .eq("user_id", user.id)
          .order("is_default", { ascending: false }),
        supabase
          .from("profiles")
          .select("default_address_id")
          .eq("id", user.id)
          .single(),
      ]);

      setItems((cartData.data as any) || []);

      // Parse settings
      const map: Record<string, string> = {};
      settingsData.data?.forEach((s: any) => (map[s.key] = s.value));
      setSettings({
        delivery_charge: parseInt(map.delivery_charge || "50"),
        partial_payment_percent: parseInt(map.partial_payment_percent || "30"),
        min_cart_units: parseInt(map.min_cart_units || "10"),
        enable_full_payment: map.enable_full_payment !== "false",
        enable_partial_payment: map.enable_partial_payment !== "false",
        enable_self_pickup: map.enable_self_pickup !== "false",
        enable_home_delivery: map.enable_home_delivery !== "false",
        pickup_address: map.pickup_address || "",
      });

      setAddresses(addrData.data || []);

      const defaultId =
        profileData.data?.default_address_id ||
        addrData.data?.find((a: Address) => a.is_default)?.id ||
        addrData.data?.[0]?.id ||
        "";

      setSelectedAddressId(defaultId);

      // Default delivery type
      if (map.enable_self_pickup === "false") setDeliveryType("home_delivery");
      else if (map.enable_home_delivery === "false") setDeliveryType("self_pickup");

      // Default payment type
      if (map.enable_partial_payment === "false") setPaymentType("full");
      else if (map.enable_full_payment === "false") setPaymentType("partial");

      setLoading(false);
    };

    fetchData();
  }, [user, userLoading, supabase, router]);

  const getName = (item: { name_bn: string; name_en: string }) =>
    lang === "bn" ? item.name_bn : item.name_en;

  const subtotal = items.reduce(
    (sum, item) => sum + (item.product ? item.product.price * item.quantity : 0),
    0
  );

  const deliveryCharge =
    deliveryType === "home_delivery" ? settings.delivery_charge : 0;

  const totalAmount = subtotal + deliveryCharge;

  const partialPercent = settings.partial_payment_percent;
  const partialAmount =
    paymentType === "partial"
      ? (totalAmount * partialPercent) / 100
      : totalAmount;

  const paidAmount = partialAmount;
  const remainingAmount = totalAmount - paidAmount;

  const selectedAddress = addresses.find((a) => a.id === selectedAddressId);

  const generateOrderNumber = () => {
    const now = new Date();
    const y = now.getFullYear().toString().slice(-2);
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    const rand = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, "0");
    return `QP${y}${m}${d}${rand}`;
  };

  const handlePlaceOrder = async () => {
    if (!user) return;

    if (deliveryType === "home_delivery" && !selectedAddress) {
      alert(
        lang === "bn"
          ? "ডেলিভারি ঠিকানা নির্বাচন করুন"
          : "Please select a delivery address"
      );
      return;
    }

    setPlacing(true);

    try {
      const orderNumber = generateOrderNumber();

      const addressSnapshot = selectedAddress
        ? {
            full_name: selectedAddress.full_name,
            phone: selectedAddress.phone,
            address_line1: selectedAddress.address_line1,
            address_line2: selectedAddress.address_line2,
            city: selectedAddress.city,
            state: selectedAddress.state,
            pincode: selectedAddress.pincode,
            country: "India",
          }
        : null;

      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .insert({
          order_number: orderNumber,
          user_id: user.id,
          delivery_type: deliveryType,
          payment_type: paymentType,
          subtotal,
          delivery_charge: deliveryCharge,
          total_amount: totalAmount,
          partial_payment_percent: paymentType === "partial" ? partialPercent : 0,
          partial_payment_amount: paymentType === "partial" ? partialAmount : 0,
          paid_amount: 0,
          remaining_amount: remainingAmount,
          payment_status: "pending",
          order_status: "pending",
          address_id: deliveryType === "home_delivery" ? selectedAddressId : null,
          delivery_address_snapshot: addressSnapshot,
          pickup_point: deliveryType === "self_pickup" ? settings.pickup_address : null,
        })
        .select()
        .single();

      if (orderError || !orderData) {
        throw new Error(orderError?.message || "Order creation failed");
      }

      // Insert order items
      const orderItems = items
        .filter((item) => item.product)
        .map((item) => ({
          order_id: orderData.id,
          product_id: item.product!.id,
          qty: item.quantity,
          price: item.product!.price,
        }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems);

      if (itemsError) {
        throw new Error(itemsError.message);
      }

      // Clear cart
      await supabase.from("cart").delete().eq("user_id", user.id);

      // Redirect to payment page
      router.push(`/payment/${orderData.id}`);
    } catch (err: any) {
      alert(err.message || "Something went wrong");
      setPlacing(false);
    }
  };

  if (loading || userLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading checkout...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <Link href="/cart" className="text-sm text-gray-600 hover:text-blue-600">
            ← {t("cart")}
          </Link>
          <UserMenu />
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">
          {lang === "bn" ? "চেকআউট" : "Checkout"}
        </h1>

        {/* Delivery Option */}
        <div className="bg-white rounded-2xl p-5 mb-4">
          <h2 className="font-semibold text-gray-800 mb-3">
            🚚 {t("delivery_option")}
          </h2>
          <div className="space-y-2">
            {settings.enable_home_delivery && (
              <label
                className={`flex items-center gap-3 p-3 border-2 rounded-xl cursor-pointer transition ${
                  deliveryType === "home_delivery"
                    ? "border-blue-600 bg-blue-50"
                    : "border-gray-200"
                }`}
              >
                <input
                  type="radio"
                  name="delivery"
                  checked={deliveryType === "home_delivery"}
                  onChange={() => setDeliveryType("home_delivery")}
                  className="accent-blue-600"
                />
                <div className="flex-1">
                  <p className="font-medium text-gray-800 text-sm">
                    {t("home_delivery")}
                  </p>
                  <p className="text-xs text-gray-500">
                    + ₹{settings.delivery_charge}
                  </p>
                </div>
              </label>
            )}

            {settings.enable_self_pickup && (
              <label
                className={`flex items-center gap-3 p-3 border-2 rounded-xl cursor-pointer transition ${
                  deliveryType === "self_pickup"
                    ? "border-blue-600 bg-blue-50"
                    : "border-gray-200"
                }`}
              >
                <input
                  type="radio"
                  name="delivery"
                  checked={deliveryType === "self_pickup"}
                  onChange={() => setDeliveryType("self_pickup")}
                  className="accent-blue-600"
                />
                <div className="flex-1">
                  <p className="font-medium text-gray-800 text-sm">
                    {t("self_pickup")}
                  </p>
                  <p className="text-xs text-green-600 font-medium">{t("free")}</p>
                </div>
              </label>
            )}
          </div>
        </div>

        {/* Address (only for home delivery) */}
        {deliveryType === "home_delivery" && (
          <div className="bg-white rounded-2xl p-5 mb-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-800">📍 {lang === "bn" ? "ডেলিভারি ঠিকানা" : "Delivery Address"}</h2>
              <Link
                href="/addresses"
                className="text-xs text-blue-600 hover:underline"
              >
                + {t("add_new_address")}
              </Link>
            </div>

            {addresses.length === 0 ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                {lang === "bn"
                  ? "কোনো ঠিকানা নেই। "
                  : "No address found. "}
                <Link href="/addresses" className="underline font-medium">
                  {t("add_new_address")}
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {addresses.map((addr) => (
                  <label
                    key={addr.id}
                    className={`flex gap-3 p-3 border-2 rounded-xl cursor-pointer transition ${
                      selectedAddressId === addr.id
                        ? "border-blue-600 bg-blue-50"
                        : "border-gray-200"
                    }`}
                  >
                    <input
                      type="radio"
                      name="address"
                      checked={selectedAddressId === addr.id}
                      onChange={() => setSelectedAddressId(addr.id)}
                      className="mt-1 accent-blue-600"
                    />
                    <div className="flex-1 text-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-gray-800">
                          {addr.full_name}
                        </p>
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                          {addr.label}
                        </span>
                        {addr.is_default && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                            Default
                          </span>
                        )}
                      </div>
                      <p className="text-gray-600 text-xs">
                        {addr.address_line1}
                        {addr.address_line2 ? `, ${addr.address_line2}` : ""}
                      </p>
                      <p className="text-gray-600 text-xs">
                        {addr.city}, {addr.state} - {addr.pincode}
                      </p>
                      <p className="text-gray-500 text-xs mt-1">📱 {addr.phone}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Self pickup info */}
        {deliveryType === "self_pickup" && settings.pickup_address && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-4">
            <p className="text-xs text-blue-600 font-medium mb-1">
              📍 {lang === "bn" ? "পিকআপ ঠিকানা" : "Pickup Address"}
            </p>
            <p className="text-sm text-gray-800">{settings.pickup_address}</p>
          </div>
        )}

        {/* Payment Type */}
        <div className="bg-white rounded-2xl p-5 mb-4">
          <h2 className="font-semibold text-gray-800 mb-3">
            💳 {t("payment_type")}
          </h2>
          <div className="space-y-2">
            {settings.enable_full_payment && (
              <label
                className={`flex items-center gap-3 p-3 border-2 rounded-xl cursor-pointer transition ${
                  paymentType === "full"
                    ? "border-blue-600 bg-blue-50"
                    : "border-gray-200"
                }`}
              >
                <input
                  type="radio"
                  name="payment"
                  checked={paymentType === "full"}
                  onChange={() => setPaymentType("full")}
                  className="accent-blue-600"
                />
                <div className="flex-1">
                  <p className="font-medium text-gray-800 text-sm">
                    {t("full_payment")}
                  </p>
                  <p className="text-xs text-gray-500">₹{totalAmount.toFixed(2)}</p>
                </div>
              </label>
            )}

            {settings.enable_partial_payment && (
              <label
                className={`flex items-center gap-3 p-3 border-2 rounded-xl cursor-pointer transition ${
                  paymentType === "partial"
                    ? "border-blue-600 bg-blue-50"
                    : "border-gray-200"
                }`}
              >
                <input
                  type="radio"
                  name="payment"
                  checked={paymentType === "partial"}
                  onChange={() => setPaymentType("partial")}
                  className="accent-blue-600"
                />
                <div className="flex-1">
                  <p className="font-medium text-gray-800 text-sm">
                    {t("partial_payment")} ({partialPercent}%)
                  </p>
                  <p className="text-xs text-gray-500">
                    {t("paid_now")}: ₹{partialAmount.toFixed(2)} • {t("pay_later")}: ₹
                    {remainingAmount.toFixed(2)}
                  </p>
                </div>
              </label>
            )}
          </div>
        </div>

        {/* Order Summary */}
        <div className="bg-white rounded-2xl p-5 mb-4">
          <h2 className="font-semibold text-gray-800 mb-3">
            📋 {lang === "bn" ? "সারসংক্ষেপ" : "Summary"}
          </h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">{t("subtotal")}</span>
              <span className="text-gray-800 font-medium">
                ₹{subtotal.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">{t("delivery_charge")}</span>
              <span className="text-gray-800 font-medium">
                ₹{deliveryCharge.toFixed(2)}
              </span>
            </div>
            <div className="border-t border-gray-200 pt-2 flex justify-between">
              <span className="font-bold text-gray-800">{t("total")}</span>
              <span className="font-bold text-blue-600 text-lg">
                ₹{totalAmount.toFixed(2)}
              </span>
            </div>
            {paymentType === "partial" && (
              <>
                <div className="flex justify-between text-green-700">
                  <span>{t("paid_now")}</span>
                  <span className="font-medium">₹{paidAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-orange-700">
                  <span>{t("pay_later")}</span>
                  <span className="font-medium">₹{remainingAmount.toFixed(2)}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Place Order button */}
        <button
          onClick={handlePlaceOrder}
          disabled={placing || items.length === 0}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 rounded-xl transition disabled:opacity-50"
        >
          {placing
            ? lang === "bn"
              ? "অর্ডার হচ্ছে..."
              : "Placing order..."
            : lang === "bn"
            ? "অর্ডার নিশ্চিত করুন →"
            : "Place Order →"}
        </button>
      </div>
    </div>
  );
        }
