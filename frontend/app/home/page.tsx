"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import UserMenu from "@/components/UserMenu";
import ProductCard from "@/components/ProductCard";
import FloatingCartButton from "@/components/FloatingCartButton";

type Category = {
  id: string;
  name_bn: string;
  name_en: string;
  slug: string;
  image: string | null;
};

type Product = {
  id: string;
  name_bn: string;
  name_en: string;
  price: number;
  stock: number;
  images: string[];
  category_id: string | null;
};

type Banner = {
  id: string;
  image_url: string;
  link_url: string | null;
  title: string | null;
};

export default function HomePage() {
  const supabase = createClient();
  const { lang, setLang, t } = useLanguage();

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [topBanner, setTopBanner] = useState<Banner | null>(null);
  const [footerBanner, setFooterBanner] = useState<Banner | null>(null);
  const [loading, setLoading] = useState(true);
  
  // ✅ নতুন: ক্লিক করা ক্যাটাগরি ট্র্যাক করার জন্য স্টেট
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const [cats, prods, banners] = await Promise.all([
        supabase
          .from("categories")
          .select("*")
          .eq("is_active", true)
          .order("name_en"),
        supabase
          .from("products")
          .select("id, name_bn, name_en, price, stock, images, category_id")
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(12),
        supabase.from("banners").select("*").eq("is_active", true),
      ]);

      setCategories(cats.data || []);
      setProducts(prods.data || []);

      const top = banners.data?.find((b) => b.position === "header_top");
      const footer = banners.data?.find((b) => b.position === "footer_bottom");
      setTopBanner(top || null);
      setFooterBanner(footer || null);

      setLoading(false);
    };

    fetchData();
  }, [supabase]);

  const toggleLanguage = () => {
    setLang(lang === "bn" ? "en" : "bn");
  };

  const getName = (item: { name_bn: string; name_en: string }) =>
    lang === "bn" ? item.name_bn : item.name_en;

  // ✅ নতুন: ক্যাটাগরি অনুযায়ী প্রোডাক্ট ফিল্টার করার লজিক
  const filteredProducts = activeCategory
    ? products.filter((p) => p.category_id === activeCategory)
    : products;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Banner */}
      {topBanner && (
        <Link href={topBanner.link_url || "#"}>
          <img
            src={topBanner.image_url}
            alt={topBanner.title || "Banner"}
            className="w-full h-32 md:h-48 object-cover"
          />
        </Link>
      )}

      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <Link href="/home">
            <h1 className="text-2xl font-bold text-blue-600">
              {t("app_name")}
            </h1>
          </Link>

          <div className="flex items-center gap-3">
            <button
              onClick={toggleLanguage}
              className="text-sm text-gray-600 hover:text-blue-600 px-3 py-1 border border-gray-300 rounded-lg"
            >
              🌐 {lang === "bn" ? "English" : "বাংলা"}
            </button>
            <UserMenu />
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6">
        
        {/* ✅ Categories: নতুন stylish টেক্সট-ট্যাব ডিজাইন */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800">
              {t("categories")}
            </h2>
          </div>

          {loading ? (
            /* লোডিং এর সময় ছোট ট্যাবের অ্যানিমেশন */
            <div className="flex gap-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-10 w-24 bg-gray-200 rounded-full animate-pulse"></div>
              ))}
            </div>
          ) : categories.length === 0 ? (
            <div className="bg-white rounded-xl p-4 text-center text-gray-500 text-sm">
              No categories yet
            </div>
          ) : (
            /* হরাইজন্টাল স্ক্রলিং ট্যাব (কোনো ছবি বা লোগো নেই) */
            <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-hide">
              
              {/* 'All' বা 'সব' বাটন */}
              <button
                onClick={() => setActiveCategory(null)}
                className={`px-5 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap shadow-sm transition-all duration-200 ${
                  activeCategory === null
                    ? "bg-blue-600 text-white shadow-blue-200"
                    : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
                }`}
              >
                {lang === "bn" ? "সব" : "All"}
              </button>

              {/* ডাটাবেস থেকে আসা ক্যাটাগরিগুলো */}
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)} // ক্লিক করলে ফিল্টার ও হাইলাইট হবে
                  className={`px-5 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap shadow-sm transition-all duration-200 ${
                    activeCategory === cat.id
                      ? "bg-blue-600 text-white shadow-blue-200" // একটিভ থাকলে নীল হবে
                      : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50" // নিষ্ক্রিয় থাকলে সাদা হবে
                  }`}
                >
                  {getName(cat)}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ✅ Products: ফিল্টার করা প্রোডাক্ট দেখানো */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            {t("products")}
          </h2>

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl p-4 animate-pulse">
                  <div className="aspect-square bg-gray-200 rounded-lg mb-3"></div>
                  <div className="h-3 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="bg-white rounded-xl p-6 text-center text-gray-500 text-sm">
              No products found in this category
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {filteredProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer Banner */}
      {footerBanner && (
        <div className="max-w-6xl mx-auto px-4 mb-6">
          <Link href={footerBanner.link_url || "#"}>
            <img
              src={footerBanner.image_url}
              alt={footerBanner.title || "Banner"}
              className="w-full rounded-xl object-cover"
            />
          </Link>
        </div>
      )}

      <footer className="text-center py-6 text-xs text-gray-400">
        {t("copyright")}
      </footer>

      {/* ✅ Floating Cart Button */}
      <FloatingCartButton />
    </div>
  );
}
