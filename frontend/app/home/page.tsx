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
        {/* Categories */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800">
              {t("categories")}
            </h2>
          </div>

          {loading ? (
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl p-3 animate-pulse">
                  <div className="w-12 h-12 bg-gray-200 rounded-full mx-auto mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          ) : categories.length === 0 ? (
            <div className="bg-white rounded-xl p-6 text-center text-gray-500 text-sm">
              No categories yet
            </div>
          ) : (
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/category/${cat.slug}`}
                  className="bg-white rounded-xl p-3 shadow-sm hover:shadow-md transition flex flex-col items-center"
                >
                  {cat.image ? (
                    <img
                      src={cat.image}
                      alt={getName(cat)}
                      className="w-12 h-12 rounded-full object-cover mb-2"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-blue-100 rounded-full mb-2 flex items-center justify-center text-blue-600 font-bold text-lg">
                      {getName(cat).charAt(0).toUpperCase()}
                    </div>
                  )}
                  <p className="text-xs text-gray-700 text-center line-clamp-2 font-medium">
                    {getName(cat)}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Products */}
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
          ) : products.length === 0 ? (
            <div className="bg-white rounded-xl p-6 text-center text-gray-500 text-sm">
              No products yet
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {products.map((p) => (
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
