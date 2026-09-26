"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

interface Category {
  id: string;
  name_en: string;
  name_bn: string;
  slug: string | null;
  image: string | null;
  is_active: boolean;
  created_at: string;
}

export default function CategoriesPage() {
  const supabase = useMemo(() => createClient(), []);

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const [formData, setFormData] = useState({
    name_en: "",
    name_bn: "",
    slug: "",
    is_active: true,
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("categories")
      .select("id, name_en, name_bn, slug, image, is_active, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
    } else {
      setCategories((data as Category[]) || []);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const openAddModal = () => {
    setEditingCategory(null);
    setFormData({ name_en: "", name_bn: "", slug: "", is_active: true });
    setError("");
    setShowModal(true);
  };

  const openEditModal = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name_en: category.name_en || "",
      name_bn: category.name_bn || "",
      slug: category.slug || "",
      is_active: category.is_active,
    });
    setError("");
    setShowModal(true);
  };

  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  };

  const handleSave = async () => {
    if (!formData.name_en.trim()) {
      setError("English name required");
      return;
    }
    if (!formData.name_bn.trim()) {
      setError("Bengali name required");
      return;
    }

    setSaving(true);
    setError("");

    const slug =
      formData.slug.trim() || generateSlug(formData.name_en);

    const payload = {
      name_en: formData.name_en.trim(),
      name_bn: formData.name_bn.trim(),
      slug,
      is_active: formData.is_active,
    };

    try {
      if (editingCategory) {
        const { error } = await supabase
          .from("categories")
          .update(payload)
          .eq("id", editingCategory.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("categories").insert(payload);
        if (error) throw error;
      }

      setShowModal(false);
      await fetchCategories();
    } catch (err: any) {
      setError(err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (category: Category) => {
    if (!confirm(`Delete "${category.name_en}"?`)) return;

    const { error } = await supabase
      .from("categories")
      .delete()
      .eq("id", category.id);

    if (error) {
      alert("Delete failed: " + error.message);
      return;
    }
    await fetchCategories();
  };

  const toggleActive = async (category: Category) => {
    const { error } = await supabase
      .from("categories")
      .update({ is_active: !category.is_active })
      .eq("id", category.id);

    if (error) {
      alert("Update failed: " + error.message);
      return;
    }
    await fetchCategories();
  };

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return categories;
    const q = searchQuery.toLowerCase();
    return categories.filter(
      (c) =>
        c.name_en?.toLowerCase().includes(q) ||
        c.name_bn?.toLowerCase().includes(q)
    );
  }, [categories, searchQuery]);

  return (
    <div className="space-y-4 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
          <p className="text-sm text-gray-500 mt-1">
            {categories.length} total categories
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition shadow-sm"
        >
          ➕ Add
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl p-2 shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 px-2">
          <span className="text-lg">🔍</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search categories..."
            className="flex-1 py-2 text-sm bg-transparent outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <div className="text-6xl mb-4">📂</div>
          <h2 className="text-lg font-semibold text-gray-700 mb-1">
            No categories found
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            {searchQuery ? "No matching categories" : "Add your first category"}
          </p>
          {!searchQuery && (
            <button
              onClick={openAddModal}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition"
            >
              ➕ Add Category
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((category) => (
            <div
              key={category.id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 flex items-center gap-3"
            >
              {/* Image */}
              <div className="w-14 h-14 rounded-lg bg-gray-100 flex items-center justify-center text-2xl shrink-0 overflow-hidden">
                {category.image ? (
                  <img
                    src={category.image}
                    alt={category.name_en}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  "📂"
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {category.name_en}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {category.name_bn}
                </p>
                {category.slug && (
                  <p className="text-xs text-gray-400 mt-0.5 font-mono">
                    /{category.slug}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-1 shrink-0">
                <button
                  onClick={() => openEditModal(category)}
                  className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-600 px-2.5 py-1 rounded-lg font-medium transition"
                >
                  ✏️ Edit
                </button>
                <button
                  onClick={() => toggleActive(category)}
                  className={`text-xs px-2.5 py-1 rounded-lg font-medium transition ${
                    category.is_active
                      ? "bg-green-50 hover:bg-green-100 text-green-600"
                      : "bg-gray-100 hover:bg-gray-200 text-gray-600"
                  }`}
                >
                  {category.is_active ? "✅ Active" : "⏸️ Off"}
                </button>
                <button
                  onClick={() => handleDelete(category)}
                  className="text-xs bg-red-50 hover:bg-red-100 text-red-600 px-2.5 py-1 rounded-lg font-medium transition"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
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
                {editingCategory ? "✏️ Edit Category" : "➕ Add Category"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500 text-xl"
              >
                ×
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  English Name *
                </label>
                <input
                  type="text"
                  value={formData.name_en}
                  onChange={(e) =>
                    setFormData({ ...formData, name_en: e.target.value })
                  }
                  placeholder="Vegetables"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bengali Name *
                </label>
                <input
                  type="text"
                  value={formData.name_bn}
                  onChange={(e) =>
                    setFormData({ ...formData, name_bn: e.target.value })
                  }
                  placeholder="সবজি"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Slug (optional)
                </label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) =>
                    setFormData({ ...formData, slug: e.target.value })
                  }
                  placeholder="vegetables"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                />
                <p className="text-xs text-gray-400 mt-1">
                  খালি রাখলে auto-generate হবে
                </p>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) =>
                    setFormData({ ...formData, is_active: e.target.checked })
                  }
                  className="w-4 h-4 rounded border-gray-300 text-blue-600"
                />
                <span className="text-sm text-gray-700">
                  Active (Customer-দের দেখাবে)
                </span>
              </label>

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
