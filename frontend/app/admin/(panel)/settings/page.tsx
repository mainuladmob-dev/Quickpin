"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

interface Setting {
  key: string;
  value: string;
  updated_at: string;
}

const SETTING_LABELS: Record<string, { label: string; icon: string; type: string }> = {
  store_name: { label: "Store Name", icon: "🏪", type: "text" },
  store_phone: { label: "Store Phone", icon: "📞", type: "tel" },
  store_email: { label: "Store Email", icon: "📧", type: "email" },
  store_address: { label: "Store Address", icon: "📍", type: "textarea" },
  delivery_charge: { label: "Delivery Charge (₹)", icon: "🚚", type: "number" },
  min_order_amount: { label: "Minimum Order (₹)", icon: "💰", type: "number" },
  free_delivery_above: { label: "Free Delivery Above (₹)", icon: "🎁", type: "number" },
  bkash_number: { label: "bKash Number", icon: "💳", type: "tel" },
  nagad_number: { label: "Nagad Number", icon: "💳", type: "tel" },
  upi_id: { label: "UPI ID", icon: "🔗", type: "text" },
  delivery_note: { label: "Delivery Note", icon: "📝", type: "textarea" },
};

export default function SettingsPage() {
  const supabase = useMemo(() => createClient(), []);

  const [settings, setSettings] = useState<Record<string, string>>({});
  const [originalSettings, setOriginalSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

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

  // Sort settings: known first, then unknown
  const sortedKeys = useMemo(() => {
    const known = Object.keys(SETTING_LABELS);
    const allKeys = Object.keys(settings);
    const knownKeys = allKeys.filter((k) => known.includes(k));
    const unknownKeys = allKeys.filter((k) => !known.includes(k));

    // Sort known by predefined order
    knownKeys.sort(
      (a, b) => known.indexOf(a) - known.indexOf(b)
    );

    return [...knownKeys, ...unknownKeys];
  }, [settings]);

  return (
    <div className="space-y-4 pb-32">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">
          Configure your store
        </p>
      </div>

      {/* Success/Error Message */}
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
      ) : sortedKeys.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <div className="text-6xl mb-4">⚙️</div>
          <h2 className="text-lg font-semibold text-gray-700 mb-1">
            No settings found
          </h2>
          <p className="text-sm text-gray-500">
            Supabase-এ settings table-এ data যোগ করুন
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedKeys.map((key) => {
            const meta = SETTING_LABELS[key] || {
              label: key.replace(/_/g, " "),
              icon: "🔧",
              type: "text",
            };

            const value = settings[key] || "";

            return (
              <div
                key={key}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-4"
              >
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-2">
                  <span>{meta.icon}</span>
                  <span>{meta.label}</span>
                </label>

                {meta.type === "textarea" ? (
                  <textarea
                    value={value}
                    onChange={(e) => handleChange(key, e.target.value)}
                    rows={3}
                    placeholder={meta.label}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                  />
                ) : (
                  <input
                    type={meta.type}
                    value={value}
                    onChange={(e) => handleChange(key, e.target.value)}
                    placeholder={meta.label}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                )}

                {settings[key] !== originalSettings[key] && (
                  <p className="text-xs text-amber-600 mt-1 font-medium">
                    ● Unsaved change
                  </p>
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
