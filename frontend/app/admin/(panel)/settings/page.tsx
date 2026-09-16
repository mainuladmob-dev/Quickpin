"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Setting = { key: string; value: string };

const SETTING_LABELS: Record<string, string> = {
  website_name: "Website Name",
  website_tagline_bn: "Tagline (বাংলা)",
  website_tagline_en: "Tagline (English)",
  min_cart_units: "Minimum Cart Units (checkout এর জন্য)",
  delivery_charge: "Delivery Charge (₹)",
  partial_payment_amount: "Partial Payment Amount (₹) — customer এখন যত টাকা দেবে",
  max_screenshot_attempts: "Max Screenshot Attempts",
  upi_id: "UPI ID",
  pickup_address: "Pickup Address",
  webhook_secret: "Webhook Secret",
};

const TOGGLE_KEYS = [
  "enable_full_payment",
  "enable_partial_payment",
  "enable_self_pickup",
  "enable_home_delivery",
];

export default function AdminSettingsPage() {
  const supabase = createClient();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase.from("settings").select("*");
      const map: Record<string, string> = {};
      (data as Setting[] | null)?.forEach((s) => {
        map[s.key] = s.value;
      });

      // Migrate old partial_payment_percent if exists but no amount
      if (map.partial_payment_percent && !map.partial_payment_amount) {
        map.partial_payment_amount = "100";
      }

      setSettings(map);
      setLoading(false);
    };
    fetchSettings();
  }, [supabase]);

  const handleChange = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage("");

    const updates = Object.entries(settings).map(([key, value]) => ({
      key,
      value,
      updated_at: new Date().toISOString(),
    }));

    for (const u of updates) {
      await supabase.from("settings").upsert(u);
    }

    setSaving(false);
    setMessage("Settings saved successfully ✅");
    setTimeout(() => setMessage(""), 3000);
  };

  if (loading) return <p className="text-gray-500">Loading...</p>;

  const textKeys = Object.keys(SETTING_LABELS).filter(
    (k) => !TOGGLE_KEYS.includes(k)
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Settings</h1>
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {message && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-4 text-sm">
          {message}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="text-base font-semibold text-gray-800 mb-4">
          General Settings
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {textKeys.map((key) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {SETTING_LABELS[key]}
              </label>
              <input
                type={
                  key.includes("amount") ||
                  key.includes("units") ||
                  key.includes("charge") ||
                  key.includes("attempts")
                    ? "number"
                    : "text"
                }
                value={settings[key] || ""}
                onChange={(e) => handleChange(key, e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 text-sm"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="text-base font-semibold text-gray-800 mb-4">
          Enable / Disable Options
        </h2>
        <div className="space-y-3">
          {TOGGLE_KEYS.map((key) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-sm text-gray-700">
                {key
                  .replace("enable_", "")
                  .replace(/_/g, " ")
                  .replace(/\b\w/g, (c) => c.toUpperCase())}
              </span>
              <button
                onClick={() =>
                  handleChange(
                    key,
                    settings[key] === "true" ? "false" : "true"
                  )
                }
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                  settings[key] === "true" ? "bg-blue-600" : "bg-gray-300"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                    settings[key] === "true" ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
        💡 <strong>Tip:</strong> Partial Payment Amount হলো fixed টাকা —
        customer এত টাকা advance দেবে, বাকিটা delivery এর সময়।
        <br />
        উদাহরণ: Total ₹1000, Partial Amount ₹300 → এখন ₹300, পরে ₹700
      </div>
    </div>
  );
}
