"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useUser } from "@/lib/auth/useUser";
import UserMenu from "@/components/UserMenu";

type Address = {
  id: string;
  label: string;
  full_name: string;
  phone: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string;
  pincode: string;
  country: string;
  is_default: boolean;
};

const emptyForm = {
  label: "Home",
  full_name: "",
  phone: "",
  address_line1: "",
  address_line2: "",
  city: "",
  state: "",
  pincode: "",
  is_default: false,
};

export default function AddressesPage() {
  const supabase = createClient();
  const { lang, t } = useLanguage();
  const { user, loading: userLoading, refreshProfile } = useUser();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Address | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchAddresses = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("addresses")
      .select("*")
      .eq("user_id", user.id)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });
    setAddresses(data || []);
    setLoading(false);
  };

  useEffect(() => {
    if (userLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    fetchAddresses();
  }, [user, userLoading]);

  const openAdd = () => {
    setEditing(null);
    // যদি আগে থেকে কোনো ঠিকানা না থাকে, তবে প্রথমটি স্বয়ংক্রিয়ভাবে ডিফল্ট হবে
    setForm({
      ...emptyForm,
      is_default: addresses.length === 0,
    });
    setError("");
    setShowForm(true);
  };

  const openEdit = (addr: Address) => {
    setEditing(addr);
    setForm({
      label: addr.label,
      full_name: addr.full_name,
      phone: addr.phone,
      address_line1: addr.address_line1,
      address_line2: addr.address_line2 || "",
      city: addr.city,
      state: addr.state,
      pincode: addr.pincode,
      is_default: addr.is_default,
    });
    setError("");
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError("");
    setSaving(true);

    // ভ্যালিডেশন
    if (
      !form.full_name.trim() ||
      !form.phone.trim() ||
      !form.address_line1.trim() ||
      !form.city.trim() ||
      !form.state.trim() ||
      !form.pincode.trim()
    ) {
      setError(
        lang === "bn" ? "সব ঘর পূরণ করুন" : "Please fill all required fields"
      );
      setSaving(false);
      return;
    }

    if (!/^\d{6}$/.test(form.pincode.trim())) {
      setError(
        lang === "bn" ? "পিনকোড ৬ সংখ্যার হতে হবে" : "Pincode must be 6 digits"
      );
      setSaving(false);
      return;
    }

    // প্রথম ঠিকানা হলে স্বয়ংক্রিয়ভাবে ডিফল্ট করা
    const shouldBeDefault = addresses.length === 0 ? true : form.is_default;

    const payload = {
      user_id: user.id,
      label: form.label.trim() || "Home",
      full_name: form.full_name.trim(),
      phone: form.phone.trim(),
      address_line1: form.address_line1.trim(),
      address_line2: form.address_line2.trim() || null,
      city: form.city.trim(),
      state: form.state.trim(),
      pincode: form.pincode.trim(),
      country: "India",
      is_default: shouldBeDefault,
    };

    // যদি ডিফল্ট হিসেবে সেট করা হয়, তবে বাকি ঠিকানাগুলোর ডিফল্ট ফ্ল্যাগ ফলস করা
    if (shouldBeDefault) {
      await supabase
        .from("addresses")
        .update({ is_default: false })
        .eq("user_id", user.id);
    }

    let result;
    if (editing) {
      result = await supabase
        .from("addresses")
        .update(payload)
        .eq("id", editing.id)
        .select()
        .single();
    } else {
      result = await supabase
        .from("addresses")
        .insert(payload)
        .select()
        .single();
    }

    if (result.error) {
      setError(result.error.message);
      setSaving(false);
      return;
    }

    // প্রোফাইলে ডিফল্ট অ্যাড্রেস আইডি সিঙ্ক করা
    if (shouldBeDefault && result.data) {
      await supabase
        .from("profiles")
        .update({ default_address_id: result.data.id })
        .eq("id", user.id);
      await refreshProfile();
    }

    setShowForm(false);
    setSaving(false);
    fetchAddresses();
  };

  const handleDelete = async (addr: Address) => {
    if (
      !confirm(
        lang === "bn" ? "ঠিকানা মুছতে চান?" : "Delete this address?"
      )
    )
      return;

    await supabase.from("addresses").delete().eq("id", addr.id);

    // ডিফল্ট ঠিকানা মুছে ফেলা হলে অবশিষ্টগুলোর একটিকে নতুন ডিফল্ট বানানো বা প্রোফাইল ক্লিয়ার করা
    if (addr.is_default) {
      const remaining = addresses.filter((a) => a.id !== addr.id);
      if (remaining.length > 0) {
        const nextDefault = remaining[0];
        await supabase
          .from("addresses")
          .update({ is_default: true })
          .eq("id", nextDefault.id);

        await supabase
          .from("profiles")
          .update({ default_address_id: nextDefault.id })
          .eq("id", user!.id);
      } else {
        await supabase
          .from("profiles")
          .update({ default_address_id: null })
          .eq("id", user!.id);
      }
      await refreshProfile();
    }

    fetchAddresses();
  };

  const setAsDefault = async (addr: Address) => {
    if (!user) return;

    await supabase
      .from("addresses")
      .update({ is_default: false })
      .eq("user_id", user.id);

    await supabase
      .from("addresses")
      .update({ is_default: true })
      .eq("id", addr.id);

    await supabase
      .from("profiles")
      .update({ default_address_id: addr.id })
      .eq("id", user.id);

    await refreshProfile();
    fetchAddresses();
  };

  if (loading || userLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
            <Link href="/home" className="text-2xl font-bold text-blue-600">
              {t("app_name")}
            </Link>
            <UserMenu />
          </div>
        </header>
        <div className="max-w-2xl mx-auto px-4 py-8">
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-6xl mb-4">🔐</p>
          <p className="text-gray-600 mb-6">
            {lang === "bn"
              ? "ঠিকানা দেখতে সাইন ইন করুন"
              : "Sign in to view addresses"}
          </p>
          <Link
            href="/home"
            className="text-blue-600 hover:underline font-medium"
          >
            ← Back
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <Link href="/home" className="text-2xl font-bold text-blue-600">
            {t("app_name")}
          </Link>
          <UserMenu />
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">
            {t("my_addresses")}
          </h1>
          <button
            onClick={openAdd}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
          >
            + {t("add_new_address")}
          </button>
        </div>

        {addresses.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center">
            <p className="text-6xl mb-4">📍</p>
            <p className="text-gray-600 mb-6">
              {lang === "bn" ? "এখনো কোনো ঠিকানা নেই" : "No addresses yet"}
            </p>
            <button
              onClick={openAdd}
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium transition"
            >
              + {t("add_new_address")}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {addresses.map((addr) => (
              <div
                key={addr.id}
                className={`bg-white rounded-xl p-4 border-2 transition ${
                  addr.is_default ? "border-blue-600" : "border-gray-200"
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-medium">
                      {addr.label}
                    </span>
                    {addr.is_default && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-medium">
                        ⭐ Default
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2 text-xs">
                    <button
                      onClick={() => openEdit(addr)}
                      className="text-blue-600 hover:underline"
                    >
                      {t("edit")}
                    </button>
                    <button
                      onClick={() => handleDelete(addr)}
                      className="text-red-600 hover:underline"
                    >
                      {t("delete")}
                    </button>
                  </div>
                </div>

                <p className="font-medium text-gray-800 text-sm mb-1">
                  {addr.full_name}
                </p>
                <p className="text-sm text-gray-600">
                  {addr.address_line1}
                  {addr.address_line2 ? `, ${addr.address_line2}` : ""}
                </p>
                <p className="text-sm text-gray-600">
                  {addr.city}, {addr.state} - {addr.pincode}
                </p>
                <p className="text-sm text-gray-500 mt-1">📱 {addr.phone}</p>

                {!addr.is_default && (
                  <button
                    onClick={() => setAsDefault(addr)}
                    className="mt-3 text-xs text-blue-600 hover:underline font-medium"
                  >
                    ⭐ {lang === "bn" ? "ডিফল্ট করুন" : "Set as Default"}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 my-8">
            <h2 className="text-lg font-bold mb-4">
              {editing ? t("edit") : t("add_new_address")}
            </h2>

            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {lang === "bn" ? "ধরন" : "Type"}
                </label>
                <select
                  value={form.label}
                  onChange={(e) => setForm({ ...form, label: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                >
                  <option value="Home">
                    {lang === "bn" ? "বাসা" : "Home"}
                  </option>
                  <option value="Office">
                    {lang === "bn" ? "অফিস" : "Office"}
                  </option>
                  <option value="Other">
                    {lang === "bn" ? "অন্য" : "Other"}
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("full_name")} *
                </label>
                <input
                  type="text"
                  required
                  value={form.full_name}
                  onChange={(e) =>
                    setForm({ ...form, full_name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("phone")} *
                </label>
                <input
                  type="tel"
                  required
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+91 98xxxxxxxx"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {lang === "bn" ? "ঠিকানা লাইন ১" : "Address Line 1"} *
                </label>
                <input
                  type="text"
                  required
                  value={form.address_line1}
                  onChange={(e) =>
                    setForm({ ...form, address_line1: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {lang === "bn" ? "ঠিকানা লাইন ২" : "Address Line 2"}
                </label>
                <input
                  type="text"
                  value={form.address_line2}
                  onChange={(e) =>
                    setForm({ ...form, address_line2: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("city")} *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("state")} *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.state}
                    onChange={(e) => setForm({ ...form, state: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("pincode")} *
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  pattern="\d{6}"
                  value={form.pincode}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      pincode: e.target.value.replace(/\D/g, ""),
                    })
                  }
                  placeholder="6 digits"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="default"
                  checked={form.is_default}
                  onChange={(e) =>
                    setForm({ ...form, is_default: e.target.checked })
                  }
                />
                <label htmlFor="default" className="text-sm text-gray-700">
                  {lang === "bn"
                    ? "ডিফল্ট ঠিকানা হিসেবে সেট করুন"
                    : "Set as default address"}
                </label>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">
                  {error}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50"
                >
                  {saving ? "Saving..." : t("save")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
        }
                    
