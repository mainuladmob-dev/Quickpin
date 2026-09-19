"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/auth/useUser";

export default function FloatingCartButton() {
  const router = useRouter();
  const supabase = createClient();
  const { user, loading } = useUser();

  const [count, setCount] = useState(0);
  const [total, setTotal] = useState(0);
  const [visible, setVisible] = useState(false);

  const fetchCart = useCallback(async () => {
    if (!user) {
      setCount(0);
      setTotal(0);
      setVisible(false);
      return;
    }

    const { data, error } = await supabase
      .from("cart")
      .select("quantity, product:products(price)")
      .eq("user_id", user.id);

    if (error || !data) {
      setVisible(false);
      return;
    }

    const totalQty = data.reduce(
      (sum, item) => sum + (item.quantity || 0),
      0
    );

    const totalPrice = data.reduce((sum, item) => {
      const product = Array.isArray(item.product)
        ? item.product[0]
        : item.product;
      const price = product?.price || 0;
      return sum + (item.quantity || 0) * price;
    }, 0);

    setCount(totalQty);
    setTotal(totalPrice);
    setVisible(totalQty > 0);
  }, [user, supabase]);

  useEffect(() => {
    if (loading) return;
    fetchCart();

    const handler = () => fetchCart();
    window.addEventListener("cart-updated", handler);
    return () => window.removeEventListener("cart-updated", handler);
  }, [fetchCart, loading]);

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-6 md:bottom-6 md:w-80">
      <button
        onClick={() => router.push("/cart")}
        className="w-full flex items-center justify-between bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white rounded-2xl shadow-2xl px-5 py-3.5 transition-all"
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <span className="text-2xl">🛒</span>
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center">
              {count}
            </span>
          </div>
          <div className="text-left">
            <p className="text-[10px] uppercase tracking-wide opacity-90 leading-tight">
              Cart Total
            </p>
            <p className="font-bold text-base leading-tight">
              ₹{total.toFixed(2)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 text-sm font-semibold">
          Checkout <span>→</span>
        </div>
      </button>
    </div>
  );
}
