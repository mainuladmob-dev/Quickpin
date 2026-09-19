"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useUser } from "@/lib/auth/useUser";

type Product = {
  id: string;
  name_bn: string;
  name_en: string;
  price: number;
  stock?: number;
  images: string[];
};

export default function ProductCard({ product }: { product: Product }) {
  const router = useRouter();
  const supabase = createClient();
  const { lang, t } = useLanguage();
  const { user, signInWithGoogle } = useUser();
  const [adding, setAdding] = useState(false);

  const name = lang === "bn" ? product.name_bn : product.name_en;
  const inStock = product.stock === undefined || product.stock > 0;

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!inStock) return;

    // Force Google Sign In
    if (!user) {
      await signInWithGoogle();
      return;
    }

    setAdding(true);

    // Check if product already in cart
    const { data: existing } = await supabase
      .from("cart")
      .select("id, quantity")
      .eq("user_id", user.id)
      .eq("product_id", product.id)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("cart")
        .update({ quantity: existing.quantity + 1 })
        .eq("id", existing.id);
    } else {
      await supabase.from("cart").insert({
        user_id: user.id,
        product_id: product.id,
        quantity: 1,
      });
    }

    setAdding(false);
    // ✅ components/ProductCard.tsx

const handleAddToCart = async () => {
  // 1. Login check
  if (!user) {
    // Google sign-in force
    await signInWithGoogle();
    return;
  }

  // 2. Cart এ add (existing logic)
  const { data: existing } = await supabase
    .from("cart")
    .select("id, quantity")
    .eq("user_id", user.id)
    .eq("product_id", product.id)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("cart")
      .update({ quantity: existing.quantity + 1 })
      .eq("id", existing.id);
  } else {
    await supabase.from("cart").insert({
      user_id: user.id,
      product_id: product.id,
      quantity: 1,
    });
  }

  // 3. ✅ Toast show (redirect না!)
  setAdded(true);
  setTimeout(() => setAdded(false), 1500);

  // 4. ✅ Floating button কে notify করো
  window.dispatchEvent(new Event("cart-updated"));
  };

  return (
    <div className="bg-white rounded-xl p-3 shadow-sm hover:shadow-md transition flex flex-col">
      <Link href={`/product/${product.id}`} className="flex-1">
        {product.images && product.images[0] ? (
          <img
            src={product.images[0]}
            alt={name}
            className="aspect-square w-full object-cover rounded-lg mb-3"
          />
        ) : (
          <div className="aspect-square bg-gray-100 rounded-lg mb-3"></div>
        )}
        <p className="text-sm font-medium text-gray-800 line-clamp-2 mb-1">
          {name}
        </p>
      </Link>

      <div className="flex items-center justify-between mt-1 mb-3">
        <p className="text-blue-600 font-bold">₹{product.price}</p>
        {!inStock && (
          <span className="text-xs text-red-500">{t("out_of_stock")}</span>
        )}
      </div>

      <button
  onClick={handleAddToCart}
  className={`w-full py-2.5 rounded-lg font-medium transition ${
    added
      ? "bg-green-500 text-white"
      : "bg-blue-600 hover:bg-blue-700 text-white"
  }`}
>
  {added ? "✓ Added" : "Add to Cart"}
</button>
        
        {adding
          ? "..."
          : inStock
          ? t("add_to_cart")
          : t("out_of_stock")}
      </button>
    </div>
  );
}
