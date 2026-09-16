"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import UserMenu from "@/components/UserMenu";
import ProductCard from "@/components/ProductCard";

type Product = {
  id: string;
  name_bn: string;
  name_en: string;
  price: number;
  stock: number;
  images: string[];
};

type Category = {
  id: string;
  name_bn: string;
  name_en: string;
  slug: string;
};

export default function CategoryPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;
  const supabase = createClient();
  const { lang, t } = useLanguage();

  const [category, setCategory] = useState<Category | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!slug) return;

      const { data: cat } = await supabase
        .from("categories")
        .select("*")
        .eq("slug", slug)
        .eq("is_active", true)
        .single();

      if (!cat) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setCategory(cat);

      const { data: prods } = await supabase
        .from("products")
        .select("id, name_bn, name_en, price, stock, images")
        .eq("category_id", cat.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      setProducts(prods || []);
      setLoading(false);
    };

    fetchData();
  }, [slug, supabase]);

  const getName = (item: { name_bn: string; name_en: string }) =>
    lang === "bn" ? item.name_bn : item.name_en;

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
          <div className="h-6 w-40 bg-gray-200 rounded animate-pulse mb-6"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl p-3 animate-pulse">
                <div className="aspect-square bg-gray-200 rounded-lg mb-3"></div>
                <div className="h-3 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !category) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-6xl mb-4">🔍</p>
          <p className="text-gray-600 mb-4">Category not found</p>
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

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <Link href="/home" className="text-2xl font-bold text-blue-600">
            {t("app_name")}
          </Link>
          <UserMenu />
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <Link href="/home" className="hover:text-blue-600">
            {t("home")}
          </Link>
          <span>/</span>
          <span className="text-gray-800 font-medium">{getName(category)}</span>
        </nav>

        <button
          onClick={() => router.back()}
          className="text-sm text-gray-600 hover:text-blue-600 mb-4"
        >
          ← {lang === "bn" ? "পিছনে" : "Back"}
        </button>

        <h1 className="text-2xl font-bold text-gray-800 mb-6">
          {getName(category)}
        </h1>

        {products.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center text-gray-500">
            <p className="text-4xl mb-3">📦</p>
            <p>{t("no_products")}</p>
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
  );
            }
