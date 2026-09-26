"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

interface ProfileData {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  role: string;
  avatar_url: string | null;
  language_pref: string | null;
  created_at: string;
}

export default function ProfilePage() {
  const supabase = useMemo(() => createClient(), []);

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
  });

  const [passwordData, setPasswordData] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("id, name, email, phone, role, avatar_url, language_pref, created_at")
      .eq("id", user.id)
      .single();

    if (error) {
      console.error(error);
    } else if (data) {
      const p = data as ProfileData;
      setProfile(p);
      setFormData({
        name: p.name || "",
        phone: p.phone || "",
      });
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleSaveProfile = async () => {
    if (!profile) return;

    setSaving(true);
    setMessage(null);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          name: formData.name.trim() || null,
          phone: formData.phone.trim() || null,
        })
        .eq("id", profile.id);

      if (error) throw error;

      setProfile({
        ...profile,
        name: formData.name.trim() || null,
        phone: formData.phone.trim() || null,
      });

      setMessage({ type: "success", text: "✅ Profile updated" });
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Update failed" });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    setPasswordMessage(null);

    if (passwordData.newPassword.length < 6) {
      setPasswordMessage({
        type: "error",
        text: "Password কমপক্ষে ৬ অক্ষরের হতে হবে",
      });
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordMessage({
        type: "error",
        text: "Password মিলছে না",
      });
      return;
    }

    setChangingPassword(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword,
      });

      if (error) throw error;

      setPasswordData({ newPassword: "", confirmPassword: "" });
      setPasswordMessage({
        type: "success",
        text: "✅ Password পরিবর্তন হয়েছে",
      });
    } catch (err: any) {
      setPasswordMessage({
        type: "error",
        text: err.message || "Password change failed",
      });
    } finally {
      setChangingPassword(false);
    }
  };

  const getRoleBadge = (role: string) => {
    const map: Record<string, { label: string; class: string }> = {
      super_admin: {
        label: "👑 Super Admin",
        class: "bg-purple-50 text-purple-700 border-purple-200",
      },
      admin: {
        label: "🛡️ Admin",
        class: "bg-blue-50 text-blue-700 border-blue-200",
      },
      staff: {
        label: "👤 Staff",
        class: "bg-green-50 text-green-700 border-green-200",
      },
    };
    return map[role] || { label: role, class: "bg-gray-100 text-gray-600 border-gray-200" };
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
        <div className="text-6xl mb-4">🔑</div>
        <h2 className="text-lg font-semibold text-gray-700 mb-1">
          Profile not found
        </h2>
      </div>
    );
  }

  const badge = getRoleBadge(profile.role);
  const initial = (profile.name || profile.email || "?").charAt(0).toUpperCase();

  return (
    <div className="space-y-4 pb-20 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage your account
        </p>
      </div>

      {/* Profile Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-2xl shrink-0 overflow-hidden">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.name || "Profile"}
                className="w-full h-full object-cover"
              />
            ) : (
              initial
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold text-gray-900 truncate">
              {profile.name || "Unnamed Admin"}
            </h2>
            <p className="text-sm text-gray-500 truncate">{profile.email}</p>
            <div className="mt-2">
              <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-lg border ${badge.class}`}>
                {badge.label}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Member Since</p>
            <p className="text-sm font-semibold text-gray-700">
              {formatDate(profile.created_at)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Language</p>
            <p className="text-sm font-semibold text-gray-700">
              {profile.language_pref === "bn" ? "🇧🇩 বাংলা" : "🇬🇧 English"}
            </p>
          </div>
        </div>
      </div>

      {/* Edit Profile Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <h3 className="text-base font-bold text-gray-900 mb-4">
          ✏️ Edit Profile
        </h3>

        {message && (
          <div
            className={`mb-4 rounded-xl px-3 py-2.5 text-sm font-medium ${
              message.type === "success"
                ? "bg-green-50 border border-green-200 text-green-700"
                : "bg-red-50 border border-red-200 text-red-700"
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="Your name"
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
              placeholder="01712345678"
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={profile.email || ""}
              disabled
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 text-gray-500 cursor-not-allowed"
            />
            <p className="text-xs text-gray-400 mt-1">
              Email পরিবর্তন করা যাবে না
            </p>
          </div>

          <button
            onClick={handleSaveProfile}
            disabled={saving}
            className="w-full py-3 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition disabled:opacity-50"
          >
            {saving ? "Saving..." : "✅ Save Profile"}
          </button>
        </div>
      </div>

      {/* Change Password Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <h3 className="text-base font-bold text-gray-900 mb-4">
          🔒 Change Password
        </h3>

        {passwordMessage && (
          <div
            className={`mb-4 rounded-xl px-3 py-2.5 text-sm font-medium ${
              passwordMessage.type === "success"
                ? "bg-green-50 border border-green-200 text-green-700"
                : "bg-red-50 border border-red-200 text-red-700"
            }`}
          >
            {passwordMessage.text}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              New Password
            </label>
            <input
              type="password"
              value={passwordData.newPassword}
              onChange={(e) =>
                setPasswordData({
                  ...passwordData,
                  newPassword: e.target.value,
                })
              }
              placeholder="••••••••"
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirm Password
            </label>
            <input
              type="password"
              value={passwordData.confirmPassword}
              onChange={(e) =>
                setPasswordData({
                  ...passwordData,
                  confirmPassword: e.target.value,
                })
              }
              placeholder="••••••••"
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <button
            onClick={handleChangePassword}
            disabled={
              changingPassword ||
              !passwordData.newPassword ||
              !passwordData.confirmPassword
            }
            className="w-full py-3 text-sm font-semibold text-white bg-amber-500 hover:bg-amber-600 rounded-xl transition disabled:opacity-50"
          >
            {changingPassword ? "Changing..." : "🔒 Change Password"}
          </button>
        </div>
      </div>
    </div>
  );
        }
