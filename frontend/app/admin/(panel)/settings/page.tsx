/* eslint-disable @next/next/no-img-element */
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
  const [errorMessage, setErrorMessage] = useState("");

  // QR upload state
  const [qrFile, setQrFile] = useState<File | null>(null);
  const [qrPreview, setQrPreview] = useState("");
  const [qrUploading, setQrUploading] = useState(false);
  const [qrMessage, setQrMessage] = useState("");
  const [qrError, setQrError] = useState("");

  useEffect(() => {
    const fetchSettings = async () => {
      const { data, error } = await supabase.from("settings").select("*");
      if (error) {
        console.error("Fetch settings error:", error.message);
      }
      const map: Record<string, string> = {};
      (data as Setting[] | null)?.forEach((s) => {
        map[s.key] = s.value;
      });
      setSettings(map);
      setLoading(false);
    };
    fetchSettings();
  }, []); // Fix: Empty dependency to prevent infinite loops

  const handleChange = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage("");
    setErrorMessage("");

    const updates = Object.entries(settings)
      .filter(([key]) => key !== "upi_qr_image") // QR separately handled
      .map(([key, value]) => ({
        key,
        value: String(value ?? ""),
      }));

    let hasError = false;
    for (const u of updates) {
      const { error } = await supabase
        .from("settings")
        .upsert({ key: u.key, value: u.value }, { onConflict: "key" });

      if (error) {
        hasError = true;
        setErrorMessage("Save error: " + error.message);
        break;
      }
    }

    setSaving(false);
    if (!hasError) {
      setMessage("Settings saved successfully ✅");
      setTimeout(() => setMessage(""), 3000);
    }
  };

  // QR file select
  const handleQrFileChange = (f: File | null) => {
    setQrFile(f);
    setQrError("");
    if (f) {
      const url = URL.createObjectURL(f);
      setQrPreview(url);
    } else {
      setQrPreview("");
    }
  };

  // QR upload
  const uploadQr = async () => {
    if (!qrFile) {
      setQrError("Please select an image first");
      return;
    }
    setQrUploading(true);
    setQrError("");
    setQrMessage("");

    const ext = qrFile.name.split(".").pop();
    const fileName = `upi-qr-${Date.now()}.${ext}`;

    const { error: upErr } = await supabase.storage
      .from("banners")
      .upload(fileName, qrFile);

    if (upErr) {
      setQrError("Upload failed: " + upErr.message);
      setQrUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("banners")
      .getPublicUrl(fileName);

    const publicUrl = urlData.publicUrl;

    const { error: saveErr } = await supabase
      .from("settings")
      .upsert({ key: "upi_qr_image", value: publicUrl }, { onConflict: "key" });

    if (saveErr) {
      setQrError("Save failed: " + saveErr.message);
      setQrUploading(false);
      return;
    }

    setSettings((prev) => ({ ...prev, upi_qr_image: publicUrl }));
    setQrFile(null);
    setQrPreview("");
    setQrMessage("✅ QR image uploaded");
    setQrUploading(false);
    setTimeout(() => setQrMessage(""), 3000);
  };

  const removeQr = async () => {
    if (!confirm("Remove QR image?")) return;
    await supabase
      .from("settings")
      .upsert({ key: "upi_qr_image", value: "" }, { onConflict: "key" });

    setSettings((prev) => ({ ...prev, upi_qr_image: "" }));
    setQrMessage("QR removed");
    setTimeout(() => setQrMessage(""), 3000);
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-500 text-sm">
        Loading settings...
      </div>
    );
  }

  const textKeys = Object.keys(SETTING_LABELS).filter(
    (k) => !TOGGLE_KEYS.includes(k)
  );

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Admin Settings</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure system rules, charges, and payment options
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-xs font-semibold shadow-xs disabled:opacity-50 transition"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {message && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-2.5 rounded-xl text-xs font-medium">
          {message}
        </div>
      )}

      {errorMessage && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-2.5 rounded-xl text-xs font-medium">
          {errorMessage}
        </div>
      )}

      {/* UPI Section */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
        <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          💳 UPI Payment Configuration
        </h2>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Store UPI ID *
          </label>
          <input
            type="text"
            value={settings.upi_id || ""}
            onChange={(e) => handleChange("upi_id", e.target.value)}
            placeholder="example@okaxis"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 text-xs font-mono"
          />
          <p className="text-[11px] text-slate-400 mt-1">
            Customers will pay directly to this UPI ID.
          </p>
        </div>

        {/* QR upload */}
        <div className="pt-3 border-t border-slate-100">
          <label className="block text-xs font-bold text-slate-700 mb-2">
            Fallback QR Code Image (Optional)
          </label>

          {settings.upi_qr_image ? (
            <div className="flex flex-col items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl p-4 w-fit">
              <img
                src={settings.upi_qr_image}
                alt="Backup QR"
                className="w-36 h-36 object-contain rounded-lg bg-white p-1 border border-slate-200"
              />
              <button
                onClick={removeQr}
                className="text-rose-600 hover:underline text-xs font-semibold"
              >
                🗑️ Remove QR
              </button>
            </div>
          ) : (
            <div className="text-center py-5 text-slate-400 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-xs">
              No fallback QR image uploaded yet
            </div>
          )}

          <div className="mt-3 space-y-2">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleQrFileChange(e.target.files?.[0] || null)}
              className="text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
            />

            {qrPreview && (
              <div className="mt-2 bg-slate-50 border border-slate-200 rounded-lg p-2 w-fit">
                <img
                  src={qrPreview}
                  alt="Preview"
                  className="w-28 h-28 object-contain"
                />
              </div>
            )}

            {qrError && (
              <div className="bg-rose-50 text-rose-700 text-xs px-3 py-1.5 rounded-lg border border-rose-200">
                {qrError}
              </div>
            )}

            {qrMessage && (
              <div className="bg-emerald-50 text-emerald-700 text-xs px-3 py-1.5 rounded-lg border border-emerald-200">
                {qrMessage}
              </div>
            )}

            <button
              onClick={uploadQr}
              disabled={qrUploading || !qrFile}
              className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold px-4 py-2 rounded-lg disabled:opacity-50 transition"
            >
              {qrUploading ? "Uploading..." : "Upload New QR"}
            </button>
          </div>
        </div>
      </div>

      {/* General Settings */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
        <h2 className="text-sm font-bold text-slate-800">
          ⚙️ Operational Parameters
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {textKeys.map((key) => (
            <div key={key}>
              <label className="block text-xs font-bold text-slate-700 mb-1">
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
                className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 text-xs"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Toggles */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
        <h2 className="text-sm font-bold text-slate-800">
          🔘 Payment & Delivery Modes
        </h2>
        <div className="space-y-3">
          {TOGGLE_KEYS.map((key) => {
            const isEnabled = settings[key] === "true";
            return (
              <div
                key={key}
                className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-100"
              >
                <span className="text-xs font-semibold text-slate-700">
                  {key
                    .replace("enable_", "")
                    .replace(/_/g, " ")
                    .replace(/\b\w/g, (c) => c.toUpperCase())}
                </span>
                <button
                  type="button"
                  onClick={() => handleChange(key, isEnabled ? "false" : "true")}
                  className={`relative inline-flex h-5 w-10 items-center rounded-full transition ${
                    isEnabled ? "bg-emerald-600" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition ${
                      isEnabled ? "translate-x-5" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
      }
