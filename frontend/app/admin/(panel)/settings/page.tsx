"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

interface Setting {
  key: string;
  value: string;
  updated_at: string;
}

type FieldType = "text" | "number" | "textarea" | "toggle" | "percent";

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
  upi_qr_image: { label: "UPI QR Image URL", icon: "📸", type: "text" },
  enable_full_payment: { label: "Full Payment", icon: "💰", type: "toggle" },
  enable_partial_payment: { label: "Partial Payment", icon: "📊", type: "toggle" },
  partial_payment_percent: { label: "Default Partial %", icon: "％", type: "percent", hint: "Default partial payment percentage" },
  partial_min_percent: { label: "Min Partial %", icon: "⬇️", type: "percent" },
  partial_max_percent: { label: "Max Partial %", icon: "⬆️", type: "percent" },
  partial_payment_amount: { label: "Min Partial Amount (₹)", icon: "₹", type: "number" },

  // Delivery
  delivery_charge: { label: "Delivery Charge (₹)", icon: "🚚", type: "number" },
  enable_home_delivery: { label: "Home Delivery", icon: "🏠", type: "toggle" },
  enable_self_pickup: { label: "Self Pickup", icon: "🏬", type: "toggle" },

  // Cart
  min_cart_units: { label: "Min Cart Units", icon: "🛒", type: "number" },

  // System
  max_screenshot_attempts: { label: "Max Screenshot Attempts", icon: "📸", type: "number" },
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
    keys: ["website_name", "website_tagline_bn", "website_tagline_en", "pickup_address"],
  },
  {
    title: "Payment",
    icon: "💳",
    keys: [
      "upi_id",
      "upi_qr_image",
      "enable_full_payment",
      "enable_partial_payment",
      "partial_payment_percent",
      "partial_min_percent",
      "partial_max_percent",
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
  const [originalSettings, setOriginalSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [openSections, setOpenSections] = useState<string[]>([
    "Store Information",
    "Payment",
  ]);

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
        const { error } = await supabase
          .from("settings")
          .upsert(
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
      setMessage({
        type: "error",
        text: err.message || "Save failed",
      });
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

    // Toggle
    if (meta.type === "toggle") {
      const isOn = value === "true" || value === "1";
      return (
        <div
          key={key}
          className="flex items-center justify-between py-3 border-b border-gray-50 last:border-b-0"
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-base">{meta.icon}</span>
            <span className="text-sm font-medium text-gray-800">
              {meta.label}
            </span>
          </div>
          <button
            onClick={() => handleChange(key, isOn ? "false" : "true")}
            className={`relative w-12 h-6 rounded-full transition shrink-0 ${
              isOn ? "bg-green-500" : "bg-gray-300"
            }`}
          >
            <span
              className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                isOn ? "translate-x-6" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>
      );
    }

    // Textarea
    if (meta.type === "textarea") {
      return (
        <div key={key} className="py-3 border-b border-gray-50 last:border-b-0">
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
          {meta.hint && (
            <p className="text-xs text-gray-400 mt-1">{meta.hint}</p>
          )}
        </div>
      );
    }

    // Number / Percent / Text
    const inputType =
      meta.type === "number" || meta.type === "percent" ? "number" : "text";

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
        {meta.hint && (
          <p className="text-xs text-gray-400 mt-1">{meta.hint}</p>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4 pb-32">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">
          Configure your store
        </p>
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
                  className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 transition"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">{section.icon}</span>
                    <span className="text-base font-bold text-gray-900">
                      {section.title}
                    </span>
                    {changedCount > 0 && (
                      <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">
                        {changedCount} changed
                      </span>
                    )}
                  </div>
                  <span className="text-gray-400 text-sm">
                    {isOpen ? "▲" : "▼"}
                  </span>
                </button>

                {/* Section Content */}
                {isOpen && (
                  <div className="px-4 pb-2 border-t border-gray-100">
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
