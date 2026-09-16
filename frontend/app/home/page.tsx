"use client";

import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const { lang, setLang, t } = useLanguage();
  const router = useRouter();

  const toggleLanguage = () => {
    const newLang = lang === "bn" ? "en" : "bn";
    setLang(newLang);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-blue-600">
            {t("app_name")}
          </h1>
          <button
            onClick={toggleLanguage}
            className="text-sm text-gray-600 hover:text-blue-600 px-3 py-1 border border-gray-300 rounded-lg"
          >
            🌐 {lang === "bn" ? "English" : "বাংলা"}
          </button>
        </div>
      </header>

      {/* Top Banner placeholder */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="bg-blue-100 rounded-xl p-6 text-center text-blue-600 border-2 border-dashed border-blue-300">
          🖼️ Top Banner
        </div>
      </div>

      {/* Categories placeholder */}
      <div className="max-w-6xl mx-auto px-4 py-4">
        <h2 className="text-xl font-bold mb-4">{t("categories")}</h2>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="bg-white rounded-xl p-3 shadow-sm flex flex-col items-center"
            >
              <div className="w-12 h-12 bg-gray-100 rounded-full mb-2"></div>
              <p className="text-xs text-gray-600">Category {i}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Products placeholder */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <h2 className="text-xl font-bold mb-4">{t("products")}</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-xl p-4 shadow-sm">
              <div className="aspect-square bg-gray-100 rounded-lg mb-3"></div>
              <p className="text-sm font-medium">Product {i}</p>
              <p className="text-blue-600 font-bold">₹0.00</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Banner placeholder */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="bg-gray-100 rounded-xl p-6 text-center text-gray-500 border-2 border-dashed border-gray-300">
          🖼️ Footer Banner
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center py-6 text-xs text-gray-400">
        {t("copyright")}
      </footer>
    </div>
  );
}
