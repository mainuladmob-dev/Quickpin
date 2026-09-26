"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

interface Setting {
  key: string;
  value: string;
  updated_at: string;
}

type FieldType = "text" | "number" | "textarea" | "toggle" | "image";

interface FieldMeta {
  label: string;
  icon: string;
  type: FieldType;
  hint?: string;
}

const SETTING_FIELDS: Record<string, FieldMeta> = {
  // Store Info
  website_name: { label: "Website Name", icon: "🏪", type: "text" },
  website_tagline_bn: { label: "Tagline (বাংলা)", icon: "📝", type: "text" },
  website_tagline_en: { label: "Tagline (English)", icon: "📝", type: "text" },
  pickup_address: { label: "Pickup Address", icon: "📍", type: "textarea" },

  // Payment
  upi_id: { label: "UPI ID", icon: "💳", type: "text" },
  upi_qr_image: { label: "UPI QR Code", icon: "📸", type: "image" },
  enable_full_payment: { label: "Full Payment", icon: "💰", type: "toggle" },
  enable_partial_payment: {
    label: "Advance Payment",
    icon: "📊",
    type: "toggle",
  },
  partial_payment_amount: {
    label: "Advance Amount (₹)",
    icon: "₹",
    type: "number",
    hint: "Fixed advance amount",
  },

  // Delivery
  delivery_charge: { label: "Delivery Charge (₹)", icon: "🚚", type: "number" },
  enable_home_delivery: { label: "Home Delivery", icon: "🏠", type: "toggle" },
  enable_self_pickup: { label: "Self Pickup", icon: "🏬", type: "toggle" },

  // Cart
  min_cart_units: { label: "Min Cart Units", icon: "🛒", type: "number" },

  // System
  max_screenshot_attempts: {
    label: "Max Screenshot Attempts",
    icon: "📸",
    type: "number",
  },
  webhook_secret: { label: "Webhook Secret", icon: "🔐", type: "text" },
};

interface Section {
  title: string;
  icon: string;
  keys: string[];
}

const SECTIONS: Section[] = [
  {
    title: "Store Information",
    icon: "🏪",
    keys: [
      "website_name",
      "website_tagline_bn",
      "website_tagline_en",
      "pickup_address",
    ],
  },
  {
    title: "Total Payment",
    icon: "💳",
    keys: [
      "upi_id",
      "upi_qr_image",
      "enable_full_payment",
      "enable_partial_payment",
      "partial_payment_amount",
    ],
  },
  {
    title: "Delivery",
    icon: "🚚",
    keys: ["delivery_charge", "enable_home_delivery", "enable_self_pickup"],
  },
  {
    title: "Cart",
    icon: "🛒",
    keys: ["min_cart_units"],
  },
  {
    title: "System",
    icon: "⚙️",
    keys: ["max_screenshot_attempts", "webhook_secret"],
  },
];

export default function SettingsPage() {
  const supabase = useMemo(() => createClient(), []);

  const [settings, setSettings] = useState<Record<string, string>>({});
  const [originalSettings, setOriginalSettings] = useState<
    Record<string, string>
  >({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Default-এ সব collapsed
  const [openSections, setOpenSections] = useState<string[]>([]);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("settings")
      .select("key, value, updated_at");

    if (error) {
      console.error(error);
    } else {
      const map: Record<string, string> = {};
      (data || []).forEach((s: Setting) => {
        map[s.key] = s.value || "";
      });
      setSettings(map);
      setOriginalSettings(map);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const hasChanges = useMemo(() => {
    return Object.keys(settings).some(
      (key) => settings[key] !== originalSettings[key]
    );
  }, [settings, originalSettings]);

  const handleChange = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setMessage(null);
  };

  const toggleSection = (title: string) => {
    setOpenSections((prev) =>
      prev.includes(title)
        ? prev.filter((t) => t !== title)
        : [...prev, title]
    );
  };

  const handleImageUpload = async (key: string, file?: File) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setMessage({ type: "error", text: "শুধু image file upload করুন" });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: "error", text: "File size 5MB এর কম হতে হবে" });
      return;
    }

    setUploading(true);
    setMessage(null);

    try {
      const ext = file.name.split(".").pop() || "png";
      const fileName = `${key}-${Date.now()}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from("banners")
        .upload(fileName, file, { upsert: true, cacheControl: "3600" });

      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage
        .from("banners")
        .getPublicUrl(fileName);

      handleChange(key, urlData.publicUrl);
      setMessage({ type: "success", text: "✅ Image uploaded" });
    } catch (err: any) {
      console.error(err);
      setMessage({ type: "error", text: err.message || "Upload failed" });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const changedKeys = Object.keys(settings).filter(
        (key) => settings[key] !== originalSettings[key]
      );

      if (changedKeys.length === 0) {
        setMessage({ type: "success", text: "কোনো পরিবর্তন নেই" });
        setSaving(false);
        return;
      }

      for (const key of changedKeys) {
        const { error } = await supabase.from("settings").upsert(
          {
            key,
            value: settings[key],
            updated_at: new Date().toISOString(),
          },
          { onConflict: "key" }
        );

        if (error) throw error;
      }

      setOriginalSettings({ ...settings });
      setMessage({
        type: "success",
        text: `✅ ${changedKeys.length}টা setting save হয়েছে`,
      });
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Save failed" });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (!confirm("সব পরিবর্তন বাতিল করবেন?")) return;
    setSettings({ ...originalSettings });
    setMessage(null);
  };

  const renderField = (key: string) => {
    const meta = SETTING_FIELDS[key] || {
      label: key.replace(/_/g, " "),
      icon: "🔧",
      type: "text" as FieldType,
    };

    const value = settings[key] || "";

    // ============ TOGGLE ============
    if (meta.type === "toggle") {
      const isOn = value === "true" || value === "1";
      return (
        <div
          key={key}
          className="flex items-center justify-between py-3.5 border-b border-gray-50 last:border-b-0"
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-base">{meta.icon}</span>
            <span className="text-sm font-medium text-gray-800">
              {meta.label}
            </span>
          </div>

          <button
            onClick={() => handleChange(key, isOn ? "false" : "true")}
            className={`relative w-14 h-7 rounded-full transition-colors duration-200 shrink-0 shadow-inner ${
              isOn ? "bg-blue-600" : "bg-gray-300"
            }`}
            aria-checked={isOn}
            role="switch"
          >
            <span
              className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-md transition-all duration-200 ${
                isOn
                  ? "translate-x-[30px] ring-2 ring-blue-700"
                  : "translate-x-0.5 ring-2 ring-gray-400"
              }`}
            />
          </button>
        </div>
      );
    }

    // ============ IMAGE UPLOAD ============
    if (meta.type === "image") {
      return (
        <div
          key={key}
          className="py-3 border-b border-gray-50 last:border-b-0"
        >
          <label className="flex items-center gap-2 text-sm font-medium text-gray-800 mb-3">
            <span>{meta.icon}</span>
            <span>{meta.label}</span>
          </label>

          {value ? (
            <div className="space-y-2">
              <div className="bg-gray-50 rounded-xl p-3 flex items-center justify-center">
                <img
                  src={value}
                  alt="QR Code"
                  className="w-40 h-40 object-contain rounded-lg"
                />
              </div>
              <label className="inline-block cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(key, e.target.files?.[0])}
                  className="hidden"
                  disabled={uploading}
                />
                <span className="inline-flex items-center gap-2 text-xs bg-blue-50 hover:bg-blue-100 text-blue-600 font-semibold px-3 py-2 rounded-lg transition">
                  {uploading ? "⏳ Uploading..." : "🔄 Change QR Code"}
                </span>
              </label>
            </div>
          ) : (
            <label className="block cursor-pointer">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleImageUpload(key, e.target.files?.[0])}
                className="hidden"
                disabled={uploading}
              />
              <div className="border-2 border-dashed border-gray-300 hover:border-blue-400 rounded-xl p-6 text-center transition">
                <p className="text-3xl mb-2">📤</p>
                <p className="text-sm font-semibold text-gray-700">
                  {uploading ? "Uploading..." : "Tap to Upload QR Code"}
                </p>
                <p className="text-xs text-gray-400 mt-1">PNG, JPG (Max 5MB)</p>
              </div>
            </label>
          )}

          {meta.hint && (
            <p className="text-xs text-gray-400 mt-2">{meta.hint}</p>
          )}
        </div>
      );
    }

    // ============ TEXTAREA ============
    if (meta.type === "textarea") {
      return (
        <div
          key={key}
          className="py-3 border-b border-gray-50 last:border-b-0"
        >
          <label className="flex items-center gap-2 text-sm font-medium text-gray-800 mb-2">
            <span>{meta.icon}</span>
            <span>{meta.label}</span>
          </label>
          <textarea
            value={value}
            onChange={(e) => handleChange(key, e.target.value)}
            rows={3}
            placeholder={meta.label}
            className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none"
          />
          {meta.hint && <p className="text-xs text-gray-400 mt-1">{meta.hint}</p>}
        </div>
      );
    }

    // ============ NUMBER / TEXT ============
    const inputType = meta.type === "number" ? "number" : "text";

    return (
      <div key={key} className="py-3 border-b border-gray-50 last:border-b-0">
        <label className="flex items-center gap-2 text-sm font-medium text-gray-800 mb-2">
          <span>{meta.icon}</span>
          <span>{meta.label}</span>
        </label>
        <input
          type={inputType}
          value={value}
          onChange={(e) => handleChange(key, e.target.value)}
          placeholder={meta.label}
          className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
        />
        {meta.hint && <p className="text-xs text-gray-400 mt-1">{meta.hint}</p>}
      </div>
    );
  };

  return (
    <div className="space-y-4 pb-32">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Configure your store</p>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`rounded-xl px-4 py-3 text-sm font-medium ${
            message.type === "success"
              ? "bg-green-50 border border-green-200 text-green-700"
              : "bg-red-50 border border-red-200 text-red-700"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="space-y-3">
          {SECTIONS.map((section) => {
            const availableKeys = section.keys.filter(
              (k) => settings[k] !== undefined
            );

            if (availableKeys.length === 0) return null;

            const isOpen = openSections.includes(section.title);
            const changedCount = availableKeys.filter(
              (k) => settings[k] !== originalSettings[k]
            ).length;

            return (
              <div
                key={section.title}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
              >
                {/* Section Header */}
                <button
                  onClick={() => toggleSection(section.title)}
                  className="w-full flex items-center justify-between px-4 py-4 hover:bg-gray-50 transition"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{section.icon}</span>
                    <span className="text-base font-bold text-gray-900">
                      {section.title}
                    </span>
                    {changedCount > 0 && (
                      <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">
                        {changedCount} changed
                      </span>
                    )}
                  </div>
                  <span className="text-gray-400 text-xl">
                    {isOpen ? "▲" : "▼"}
                  </span>
                </button>

                {/* Section Content */}
                {isOpen && (
                  <div className="px-4 pb-3 border-t border-gray-100">
                    {availableKeys.map((key) => renderField(key))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Sticky Save Bar */}
      {hasChanges && (
        <div className="fixed bottom-0 left-0 right-0 md:left-64 z-40 bg-white border-t border-gray-200 shadow-2xl">
          <div className="px-4 py-3 flex items-center gap-2">
            <button
              onClick={handleReset}
              disabled={saving}
              className="flex-1 py-3 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition disabled:opacity-50"
            >
              Reset
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-[2] py-3 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition disabled:opacity-50"
            >
              {saving ? "Saving..." : "✅ Save Changes"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
            }
