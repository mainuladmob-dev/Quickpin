"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useUser } from "@/lib/auth/useUser";
import UserMenu from "@/components/UserMenu";

type Product = {
  id: string;
  name_bn: string;
  name_en: string;
  description_bn: string | null;
  description_en: string | null;
  price: number;
  weight: number | null;
  stock: number;
  images: string[];
  category_id: string | null;
};

type Category = {
  id: string;
  name_bn: string;
  name_en: string;
  slug: string;
};

export default function ProductDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const supabase = createClient();
  const { lang, t } = useLanguage();
  const { user, signInWithGoogle } = useUser();

  const [product, setProduct] = useState<Product | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;

      const { data: prod } = await supabase
        .from("products")
        .select("*")
        .eq("id", id)
        .eq("is_active", true)
        .single();

      if (!prod) {
        setLoading(false);
        return;
      }

      setProduct(prod);

      if (prod.category_id) {
        const { data: cat } = await supabase
          .from("categories")
          .select("id, name_bn, name_en, slug")
          .eq("id", prod.category_id)
          .single();
        setCategory(cat || null);
      }

      setLoading(false);
    };

    fetchData();
  }, [id, supabase]);

  const getName = (item: { name_bn: string; name_en: string }) =>
    lang === "bn" ? item.name_bn : item.name_en;

  const getDescription = (item: Product) =>
    lang === "bn" ? item.description_bn : item.description_en;

  const handleAddToCart = async () => {
    if (!product) return;

    // Force Google Sign In if not logged in
    if (!user) {
      setMessage("Sign in required...");
      await signInWithGoogle();
      return;
    }

    if (product.stock === 0) {
      setMessage(lang === "bn" ? "স্টক নেই" : "Out of stock");
      return;
    }

    setAdding(true);
    setMessage("");

    // Check if product already in cart
    const { data: existing } = await supabase
      .from("cart")
      .select("id, quantity")
      .eq("user_id", user.id)
      .eq("product_id", product.id)
      .maybeSingle();

    let error;

    if (existing) {
      // Update quantity
      const newQty = existing.quantity + quantity;
      const result = await supabase
        .from("cart")
        .update({ quantity: newQty })
        .eq("id", existing.id);
      error = result.error;
    } else {
      // Insert new
      const result = await supabase.from("cart").insert({
        user_id: user.id,
        product_id: product.id,
        quantity: quantity,
      });
      error = result.error;
    }

    setAdding(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage(
      lang === "bn"
        ? "✅ কার্টে যোগ হয়েছে"
        : "✅ Added to cart"
    );

    setTimeout(() => {
      router.push("/cart");
    }, 800);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm sticky top-0 z-10">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
            <Link href="/home" className="text-2xl font-bold text-blue-600">
              {t("app_name")}
            </Link>
            <UserMenu />
          </div>
        </header>
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="aspect-square bg-gray-200 rounded-xl animate-pulse"></div>
            <div>
              <div className="h-8 bg-gray-200 rounded mb-3 animate-pulse"></div>
              <div className="h-6 bg-gray-200 rounded w-1/3 mb-6 animate-pulse"></div>
              <div className="h-24 bg-gray-200 rounded animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-6xl mb-4">🔍</p>
          <p className="text-gray-600 mb-4">Product not found</p>
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

  const hasImages = product.images && product.images.length > 0;
  const currentImage = hasImages ? product.images[activeImage] : null;
  const inStock = product.stock > 0;

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

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-4 flex-wrap">
          <Link href="/home" className="hover:text-blue-600">
            {t("home")}
          </Link>
          {category && (
            <>
              <span>/</span>
              <Link
                href={`/category/${category.slug}`}
                className="hover:text-blue-600"
              >
                {getName(category)}
              </Link>
            </>
          )}
          <span>/</span>
          <span className="text-gray-800 font-medium truncate">
            {getName(product)}
          </span>
        </nav>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Images */}
          <div>
            <div className="aspect-square bg-white rounded-2xl overflow-hidden mb-3 border border-gray-200">
              {currentImage ? (
                <img
                  src={currentImage}
                  alt={getName(product)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300 text-6xl">
                  📦
                </div>
              )}
            </div>

            {hasImages && product.images.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {product.images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImage(i)}
                    className={`aspect-square rounded-lg overflow-hidden border-2 transition ${
                      activeImage === i
                        ? "border-blue-600"
                        : "border-transparent"
                    }`}
                  >
                    <img
                      src={img}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-3">
              {getName(product)}
            </h1>

            <p className="text-3xl font-bold text-blue-600 mb-4">
              ₹{product.price}
            </p>

            {product.weight && (
              <p className="text-sm text-gray-500 mb-4">
                {t("weight")}: {product.weight} kg
              </p>
            )}

            {/* Stock badge */}
            <div className="mb-6">
              {inStock ? (
                <span className="inline-block bg-green-100 text-green-700 text-xs font-medium px-3 py-1 rounded-full">
                  ✅ {lang === "bn" ? "স্টকে আছে" : "In Stock"} ({product.stock})
                </span>
              ) : (
                <span className="inline-block bg-red-100 text-red-700 text-xs font-medium px-3 py-1 rounded-full">
                  ❌ {t("out_of_stock")}
                </span>
              )}
            </div>

            {/* Description */}
            {getDescription(product) && (
              <div className="mb-6">
                <h2 className="text-sm font-semibold text-gray-700 mb-2">
                  {t("description")}
                </h2>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {getDescription(product)}
                </p>
              </div>
            )}

            {/* Quantity + Add to cart */}
            {inStock && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t("quantity")}
                </label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-10 h-10 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-lg font-bold"
                  >
                    −
                  </button>
                  <span className="w-12 text-center font-medium text-gray-800">
                    {quantity}
                  </span>
                  <button
                    onClick={() =>
                      setQuantity(Math.min(product.stock, quantity + 1))
                    }
                    className="w-10 h-10 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-lg font-bold"
                  >
                    +
                  </button>
                </div>
              </div>
            )}

            <button
              onClick={handleAddToCart}
              disabled={adding || !inStock}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {adding
                ? lang === "bn"
                  ? "যোগ হচ্ছে..."
                  : "Adding..."
                : !inStock
                ? t("out_of_stock")
                : t("add_to_cart")}
            </button>

            {message && (
              <p className="text-center text-sm mt-3 text-gray-700">
                {message}
              </p>
            )}

            {/* Info note */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mt-6 text-xs text-blue-800">
              💡 {lang === "bn"
                ? "কমপক্ষে ১০ ইউনিট কার্টে থাকলে checkout করা যাবে।"
                : "Minimum 10 units required in cart to checkout."}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
