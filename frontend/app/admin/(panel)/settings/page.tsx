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

  // QR upload state
  const [qrFile, setQrFile] = useState<File | null>(null);
  const [qrPreview, setQrPreview] = useState("");
  const [qrUploading, setQrUploading] = useState(false);
  const [qrMessage, setQrMessage] = useState("");
  const [qrError, setQrError] = useState("");

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase.from("settings").select("*");
      const map: Record<string, string> = {};
      (data as Setting[] | null)?.forEach((s) => {
        map[s.key] = s.value;
      });
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

    const updates = Object.entries(settings)
      .filter(([key]) => key !== "upi_qr_image") // QR separately handled
      .map(([key, value]) => ({
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

    const { error: saveErr } = await supabase.from("settings").upsert({
      key: "upi_qr_image",
      value: publicUrl,
      updated_at: new Date().toISOString(),
    });

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
    await supabase.from("settings").upsert({
      key: "upi_qr_image",
      value: "",
      updated_at: new Date().toISOString(),
    });
    setSettings((prev) => ({ ...prev, upi_qr_image: "" }));
    setQrMessage("QR removed");
    setTimeout(() => setQrMessage(""), 3000);
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

      {/* UPI Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="text-base font-semibold text-gray-800 mb-4">
          💳 UPI Payment
        </h2>

        {/* UPI ID */}
        <div className="mb-5">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            UPI ID *
          </label>
          <input
            type="text"
            value={settings.upi_id || ""}
            onChange={(e) => handleChange("upi_id", e.target.value)}
            placeholder="yourname@ybl"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 text-sm"
          />
          <p className="text-xs text-gray-500 mt-1">
            Customer এখানে payment পাঠাবে
          </p>
        </div>

        {/* QR upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Backup QR Image (optional)
          </label>

          {settings.upi_qr_image ? (
            <div className="flex flex-col items-center gap-3 bg-gray-50 rounded-lg p-4">
              <img
                src={settings.upi_qr_image}
                alt="Backup QR"
                className="w-40 h-40 object-contain border border-gray-200 rounded-lg bg-white p-2"
              />
              <button
                onClick={removeQr}
                className="text-red-600 hover:underline text-sm"
              >
                🗑️ Remove QR
              </button>
            </div>
          ) : (
            <div className="text-center py-6 text-gray-400 bg-gray-50 rounded-lg text-sm">
              No backup QR uploaded
            </div>
          )}

          <div className="mt-4">
            <input
              type="file"
              accept="image/*"
              onChange={(e) =>
                handleQrFileChange(e.target.files?.[0] || null)
              }
              className="w-full text-sm text-gray-700"
            />

            {qrPreview && (
              <div className="mt-3 bg-gray-50 rounded-lg p-3 flex justify-center">
                <img
                  src={qrPreview}
                  alt="Preview"
                  className="w-32 h-32 object-contain"
                />
              </div>
            )}

            {qrError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg mt-3">
                {qrError}
              </div>
            )}

            {qrMessage && (
              <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-3 py-2 rounded-lg mt-3">
                {qrMessage}
              </div>
            )}

            <button
              onClick={uploadQr}
              disabled={qrUploading || !qrFile}
              className="w-full mt-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2.5 rounded-lg disabled:opacity-50"
            >
              {qrUploading ? "Uploading..." : "Upload QR"}
            </button>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4 text-xs text-blue-800">
            💡 <strong>কীভাবে কাজ করে:</strong> Payment page এ auto-generated QR
            (amount সহ) সবসময় দেখানো হবে। এই Backup QR টা শুধু তখনই দেখানো
            হবে যদি auto QR fail করে।
          </div>
        </div>
      </div>

      {/* Other settings */}
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

      {/* Toggles */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
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
    </div>
  );
      }
