"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LanguageSelectPage() {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const selectLanguage = (lang: "bn" | "en") => {
    setLoading(lang);
    localStorage.setItem("language", lang);
    document.cookie = `language=${lang}; path=/; max-age=31536000`;
    router.push("/home");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-white p-6">
      <div className="mb-12 text-center">
        <h1 className="text-5xl font-bold text-blue-600 mb-2">Quickpin</h1>
        <p className="text-gray-500 text-sm">Your favorite products, just one click</p>
      </div>

      <div className="w-full max-w-sm">
        <p className="text-center text-gray-700 mb-6 font-medium">
          ভাষা নির্বাচন করুন / Select Language
        </p>

        <button
          onClick={() => selectLanguage("bn")}
          disabled={loading !== null}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-xl mb-4 transition disabled:opacity-50"
        >
          {loading === "bn" ? "..." : "🇧🇩 বাংলা"}
        </button>

        <button
          onClick={() => selectLanguage("en")}
          disabled={loading !== null}
          className="w-full bg-white hover:bg-gray-50 text-gray-800 font-semibold py-4 px-6 rounded-xl border-2 border-gray-200 transition disabled:opacity-50"
        >
          {loading === "en" ? "..." : "🇬🇧 English"}
        </button>
      </div>

      <p className="mt-16 text-xs text-gray-400">© 2026 Quickpin</p>
    </div>
  );
}
