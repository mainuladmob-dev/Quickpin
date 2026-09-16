"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Admin = {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  created_at: string;
};

export default function AdminManagementPage() {
  const supabase = createClient();
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  // Reset password state
  const [resetTarget, setResetTarget] = useState<Admin | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetError, setResetError] = useState("");
  const [resetSaving, setResetSaving] = useState(false);

  const fetchAdmins = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("id, name, email, role, created_at")
      .in("role", ["admin", "super_admin"])
      .order("created_at", { ascending: false });
    setAdmins(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchAdmins();
  }, [supabase]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);

    if (!form.name.trim() || !form.email.trim() || !form.password) {
      setError("All fields required");
      setSaving(false);
      return;
    }

    if (form.password.length < 6) {
      setError("Password must be at least 6 characters");
      setSaving(false);
      return;
    }

    const email = form.email.trim().toLowerCase();

    const { data: existing } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("email", email)
      .maybeSingle();

    if (existing) {
      if (existing.role === "super_admin") {
        setError("This user is already a Super Admin");
        setSaving(false);
        return;
      }
      const { error: roleError } = await supabase
        .from("profiles")
        .update({ role: "admin", name: form.name.trim() })
        .eq("id", existing.id);

      if (roleError) {
        setError("Failed: " + roleError.message);
        setSaving(false);
        return;
      }

      setSuccess(`✅ "${form.name}" আবার admin হয়েছে`);
      setForm({ name: "", email: "", password: "" });
      setShowForm(false);
      setSaving(false);
      fetchAdmins();
      setTimeout(() => setSuccess(""), 4000);
      return;
    }

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password: form.password,
      options: { data: { full_name: form.name.trim() } },
    });

    if (authError) {
      setError(authError.message);
      setSaving(false);
      return;
    }

    if (!authData.user) {
      setError("User creation failed");
      setSaving(false);
      return;
    }

    const { error: roleError } = await supabase
      .from("profiles")
      .update({ role: "admin", name: form.name.trim() })
      .eq("id", authData.user.id);

    if (roleError) {
      setError("Role update failed: " + roleError.message);
      setSaving(false);
      return;
    }

    setSuccess(`✅ "${form.name}" admin হয়েছে`);
    setForm({ name: "", email: "", password: "" });
    setShowForm(false);
    setSaving(false);
    fetchAdmins();
    setTimeout(() => setSuccess(""), 4000);
  };

  const handleRemove = async (admin: Admin) => {
    if (admin.role === "super_admin") {
      alert("Super Admin কে remove করা যাবে না");
      return;
    }

    if (!confirm(`Remove "${admin.name || admin.email}"?`)) return;

    const { error } = await supabase
      .from("profiles")
      .update({ role: "customer" })
      .eq("id", admin.id);

    if (error) {
      alert("Remove failed: " + error.message);
      return;
    }

    setSuccess(`✅ "${admin.name || admin.email}" remove হয়েছে`);
    fetchAdmins();
    setTimeout(() => setSuccess(""), 3000);
  };

  const openReset = (admin: Admin) => {
    setResetTarget(admin);
    setNewPassword("");
    setResetError("");
  };

  const handleResetPassword = async () => {
    if (!resetTarget) return;
    setResetError("");

    if (!newPassword || newPassword.length < 6) {
      setResetError("Password must be at least 6 characters");
      return;
    }

    setResetSaving(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setResetError("Not authenticated");
        setResetSaving(false);
        return;
      }

      const res = await fetch(
        "https://uewgqsfptqbkytfyoqzi.supabase.co/functions/v1/reset-admin-password",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            userId: resetTarget.id,
            newPassword: newPassword,
          }),
        }
      );

      const result = await res.json();

      setResetSaving(false);

      if (!res.ok || !result.success) {
        setResetError(result.error || "Failed to reset password");
        return;
      }

      setSuccess(`✅ "${resetTarget.name || resetTarget.email}" এর password reset হয়েছে`);
      setResetTarget(null);
      setNewPassword("");
      setTimeout(() => setSuccess(""), 4000);
    } catch (err: any) {
      setResetError(err.message || "Network error");
      setResetSaving(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Admins</h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          + Add Admin
        </button>
      </div>

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-4 text-sm">
          {success}
        </div>
      )}

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : admins.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center text-gray-500">
          No admins yet
        </div>
      ) : (
        <div className="space-y-3">
          {admins.map((a) => (
            <div
              key={a.id}
              className="bg-white rounded-xl p-4 border border-gray-200"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 text-sm truncate">
                    {a.name || "—"}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{a.email}</p>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded-full font-medium flex-shrink-0 ${
                    a.role === "super_admin"
                      ? "bg-purple-100 text-purple-700"
                      : "bg-blue-100 text-blue-700"
                  }`}
                >
                  {a.role === "super_admin" ? "Super Admin" : "Admin"}
                </span>
              </div>

              {a.role !== "super_admin" && (
                <div className="mt-3 pt-3 border-t border-gray-100 flex gap-2">
                  <button
                    onClick={() => openReset(a)}
                    className="flex-1 text-blue-600 hover:bg-blue-50 border border-blue-200 rounded-lg py-2 text-xs font-medium transition"
                  >
                    🔑 Reset Password
                  </button>
                  <button
                    onClick={() => handleRemove(a)}
                    className="flex-1 text-red-600 hover:bg-red-50 border border-red-200 rounded-lg py-2 text-xs font-medium transition"
                  >
                    🗑️ Remove
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Admin Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold mb-4">Add New Admin</h2>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  type="text"
                  required
                  minLength={6}
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  placeholder="min 6 characters"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
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
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50"
                >
                  {saving ? "Creating..." : "Create Admin"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold mb-1">Reset Password</h2>
            <p className="text-sm text-gray-500 mb-4">
              {resetTarget.name || resetTarget.email}
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Password *
                </label>
                <input
                  type="text"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="min 6 characters"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
                <p className="text-xs text-gray-500 mt-1">
                  এই password টা admin কে জানিয়ে দাও
                </p>
              </div>

              {resetError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">
                  {resetError}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResetTarget(null)}
                  className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleResetPassword}
                  disabled={resetSaving}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50"
                >
                  {resetSaving ? "Resetting..." : "Reset Password"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
