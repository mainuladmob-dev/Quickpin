"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

interface Admin {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  role: string;
  avatar_url: string | null;
  created_at: string;
}

export default function AdminsPage() {
  const supabase = useMemo(() => createClient(), []);

  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<Admin | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    role: "staff",
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  const fetchAdmins = useCallback(async () => {
    setLoading(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();
    setCurrentUserId(session?.user?.id || null);

    const { data, error } = await supabase
      .from("profiles")
      .select("id, name, email, phone, role, avatar_url, created_at")
      .in("role", ["admin", "super_admin", "staff"])
      .order("created_at", { ascending: true });

    if (error) {
      console.error(error);
    } else {
      setAdmins((data as Admin[]) || []);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    } catch (err) {
      console.error(err);
    }
  };

  const openEditModal = (admin: Admin) => {
    setEditingAdmin(admin);
    setFormData({
      name: admin.name || "",
      phone: admin.phone || "",
      role: admin.role,
    });
    setError("");
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!editingAdmin) return;

    setSaving(true);
    setError("");

    const payload = {
      name: formData.name.trim() || null,
      phone: formData.phone.trim() || null,
      role: formData.role,
    };

    try {
      const { error } = await supabase
        .from("profiles")
        .update(payload)
        .eq("id", editingAdmin.id);

      if (error) throw error;

      setShowModal(false);
      await fetchAdmins();
    } catch (err: any) {
      setError(err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (admin: Admin) => {
    if (admin.id === currentUserId) {
      alert("নিজেকে remove করা যাবে না");
      return;
    }

    if (admin.role === "super_admin") {
      alert("Super Admin-কে remove করা যাবে না");
      return;
    }

    if (
      !confirm(
        `"${admin.name || admin.email}" এর admin access remove করবেন?\n\nCustomer হয়ে যাবে।`
      )
    ) {
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({ role: "customer" })
      .eq("id", admin.id);

    if (error) {
      alert("Failed: " + error.message);
      return;
    }
    await fetchAdmins();
  };

  const getRoleBadge = (role: string) => {
    const map: Record<string, { label: string; class: string }> = {
      super_admin: {
        label: "👑 Super Admin",
        class: "bg-purple-50 text-purple-700",
      },
      admin: {
        label: "🛡️ Admin",
        class: "bg-blue-50 text-blue-700",
      },
      staff: {
        label: "👤 Staff",
        class: "bg-green-50 text-green-700",
      },
    };
    return map[role] || { label: role, class: "bg-gray-100 text-gray-600" };
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admins</h1>
        <p className="text-sm text-gray-500 mt-1">
          {admins.length} admin account{admins.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
        <p className="text-xs text-blue-700">
          💡 নতুন admin যোগ করতে: Supabase-এ user create করে তার role
          <strong> "admin"</strong> set করুন।
        </p>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
        </div>
      ) : admins.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <div className="text-6xl mb-4">👤</div>
          <h2 className="text-lg font-semibold text-gray-700 mb-1">
            No admins found
          </h2>
        </div>
      ) : (
        <div className="space-y-2">
          {admins.map((admin) => {
            const badge = getRoleBadge(admin.role);
            const initial = (admin.name || admin.email || "?")
              .charAt(0)
              .toUpperCase();
            const isSelf = admin.id === currentUserId;

            return (
              <div
                key={admin.id}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-3"
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg shrink-0">
                    {admin.avatar_url ? (
                      <img
                        src={admin.avatar_url}
                        alt={admin.name || "Admin"}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      initial
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Name + Self badge */}
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-gray-900 truncate">
                        {admin.name || "Unknown"}
                      </p>
                      {isSelf && (
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
                          You
                        </span>
                      )}
                    </div>

                    {/* Email */}
                    {admin.email && (
                      <button
                        onClick={() =>
                          copyToClipboard(admin.email!, `email-${admin.id}`)
                        }
                        className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 mt-0.5"
                      >
                        <span className="truncate">{admin.email}</span>
                        <span>
                          {copied === `email-${admin.id}` ? "✅" : "📋"}
                        </span>
                      </button>
                    )}

                    {/* Phone */}
                    {admin.phone && (
                      <button
                        onClick={() =>
                          copyToClipboard(admin.phone!, `phone-${admin.id}`)
                        }
                        className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 mt-0.5 ml-2"
                      >
                        <span>📞 {admin.phone}</span>
                        <span>
                          {copied === `phone-${admin.id}` ? "✅" : "📋"}
                        </span>
                      </button>
                    )}

                    {/* Role Badge */}
                    <div className="mt-2">
                      <span
                        className={`text-xs font-semibold px-2 py-1 rounded-lg ${badge.class}`}
                      >
                        {badge.label}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                  <button
                    onClick={() => openEditModal(admin)}
                    className="flex-1 text-xs bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 py-2 rounded-lg font-medium transition"
                  >
                    ✏️ Edit
                  </button>
                  {!isSelf && admin.role !== "super_admin" && (
                    <button
                      onClick={() => handleRemove(admin)}
                      className="text-xs bg-red-50 hover:bg-red-100 text-red-600 px-3 py-2 rounded-lg font-medium transition"
                    >
                      🗑️ Remove
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && editingAdmin && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">
                ✏️ Edit Admin
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500 text-xl"
              >
                ×
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-500 mb-0.5">Email</p>
                <p className="text-sm font-medium text-gray-800">
                  {editingAdmin.email}
                </p>
              </div>

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
                  placeholder="Admin name"
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
                  Role
                </label>
                <select
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({ ...formData, role: e.target.value })
                  }
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  disabled={editingAdmin.role === "super_admin"}
                >
                  <option value="staff">👤 Staff</option>
                  <option value="admin">🛡️ Admin</option>
                  <option value="super_admin">👑 Super Admin</option>
                </select>
                {editingAdmin.role === "super_admin" && (
                  <p className="text-xs text-gray-400 mt-1">
                    Super Admin role change করা যাবে না
                  </p>
                )}
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">
                  {error}
                </div>
              )}
            </div>

            <div className="p-5 border-t border-gray-100 flex gap-2">
              <button
                onClick={() => setShowModal(false)}
                disabled={saving}
                className="flex-1 py-3 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-3 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition disabled:opacity-50"
              >
                {saving ? "Saving..." : "✅ Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
                }
