"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

interface Banner {
  id: string;
  title: string | null;
  image_url: string;
  link_url: string | null;
  position: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export default function BannersPage() {
  const supabase = useMemo(() => createClient(), []);

  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    image_url: "",
    link_url: "",
    position: "home_top",
    sort_order: "0",
    is_active: true,
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const fetchBanners = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("banners")
      .select("id, title, image_url, link_url, position, sort_order, is_active, created_at")
      .order("sort_order", { ascending: true });

    if (error) {
      console.error(error);
    } else {
      setBanners((data as Banner[]) || []);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchBanners();
  }, [fetchBanners]);

  const openAddModal = () => {
    setEditingBanner(null);
    setFormData({
      title: "",
      image_url: "",
      link_url: "",
      position: "home_top",
      sort_order: "0",
      is_active: true,
    });
    setImagePreview(null);
    setError("");
    setShowModal(true);
  };

  const openEditModal = (banner: Banner) => {
    setEditingBanner(banner);
    setFormData({
      title: banner.title || "",
      image_url: banner.image_url,
      link_url: banner.link_url || "",
      position: banner.position || "home_top",
      sort_order: String(banner.sort_order),
      is_active: banner.is_active,
    });
    setImagePreview(banner.image_url);
    setError("");
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.image_url.trim()) {
      setError("Image URL required");
      return;
    }

    setSaving(true);
    setError("");

    const payload = {
      title: formData.title.trim() || null,
      image_url: formData.image_url.trim(),
      link_url: formData.link_url.trim() || null,
      position: formData.position,
      sort_order: Number(formData.sort_order) || 0,
      is_active: formData.is_active,
    };

    try {
      if (editingBanner) {
        const { error } = await supabase
          .from("banners")
          .update(payload)
          .eq("id", editingBanner.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("banners").insert(payload);
        if (error) throw error;
      }

      setShowModal(false);
      await fetchBanners();
    } catch (err: any) {
      setError(err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (banner: Banner) => {
    if (!confirm(`Delete this banner?`)) return;

    const { error } = await supabase
      .from("banners")
      .delete()
      .eq("id", banner.id);

    if (error) {
      alert("Delete failed: " + error.message);
      return;
    }
    await fetchBanners();
  };

  const toggleActive = async (banner: Banner) => {
    const { error } = await supabase
      .from("banners")
      .update({ is_active: !banner.is_active })
      .eq("id", banner.id);

    if (error) {
      alert("Update failed: " + error.message);
      return;
    }
    await fetchBanners();
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Banners</h1>
          <p className="text-sm text-gray-500 mt-1">
            {banners.length} total banners
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition shadow-sm"
        >
          ➕ Add
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
        </div>
      ) : banners.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <div className="text-6xl mb-4">🖼️</div>
          <h2 className="text-lg font-semibold text-gray-700 mb-1">
            No banners yet
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            Add your first banner
          </p>
          <button
            onClick={openAddModal}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition"
          >
            ➕ Add Banner
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {banners.map((banner) => (
            <div
              key={banner.id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
            >
              {/* Image */}
              <div className="w-full h-32 bg-gray-100 flex items-center justify-center overflow-hidden">
                {banner.image_url ? (
                  <img
                    src={banner.image_url}
                    alt={banner.title || "Banner"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-4xl">🖼️</span>
                )}
              </div>

              {/* Info + Actions */}
              <div className="p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {banner.title || "Untitled Banner"}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Position: {banner.position} • Order: {banner.sort_order}
                    </p>
                    {banner.link_url && (
                      <p className="text-xs text-blue-500 truncate mt-0.5">
                        🔗 {banner.link_url}
                      </p>
                    )}
                  </div>
                  <span
                    className={`text-xs font-semibold px-2 py-1 rounded-lg whitespace-nowrap ${
                      banner.is_active
                        ? "bg-green-50 text-green-600"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {banner.is_active ? "✅ Active" : "⏸️ Off"}
                  </span>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => openEditModal(banner)}
                    className="flex-1 text-xs bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 py-2 rounded-lg font-medium transition"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => toggleActive(banner)}
                    className="flex-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg font-medium transition"
                  >
                    {banner.is_active ? "⏸️ Disable" : "▶️ Enable"}
                  </button>
                  <button
                    onClick={() => handleDelete(banner)}
                    className="text-xs bg-red-50 hover:bg-red-100 text-red-600 px-3 py-2 rounded-lg font-medium transition"
                  >
                    🗑️
                  </button>
                </div>
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
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white">
              <h2 className="text-lg font-bold text-gray-900">
                {editingBanner ? "✏️ Edit Banner" : "➕ Add Banner"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500 text-xl"
              >
                ×
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Image URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Image URL *
                </label>
                <input
                  type="url"
                  value={formData.image_url}
                  onChange={(e) => {
                    setFormData({ ...formData, image_url: e.target.value });
                    setImagePreview(e.target.value);
                  }}
                  placeholder="https://example.com/image.jpg"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {/* Image Preview */}
              {imagePreview && (
                <div className="w-full h-32 bg-gray-100 rounded-xl overflow-hidden">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    onError={() => setImagePreview(null)}
                  />
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="Summer Sale"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {/* Link URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Link URL
                </label>
                <input
                  type="url"
                  value={formData.link_url}
                  onChange={(e) =>
                    setFormData({ ...formData, link_url: e.target.value })
                  }
                  placeholder="https://quickpin.vercel.app/products"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {/* Position + Sort Order */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Position
                  </label>
                  <select
                    value={formData.position}
                    onChange={(e) =>
                      setFormData({ ...formData, position: e.target.value })
                    }
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="home_top">Home Top</option>
                    <option value="home_middle">Home Middle</option>
                    <option value="home_bottom">Home Bottom</option>
                    <option value="category">Category</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sort Order
                  </label>
                  <input
                    type="number"
                    value={formData.sort_order}
                    onChange={(e) =>
                      setFormData({ ...formData, sort_order: e.target.value })
                    }
                    placeholder="0"
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              {/* Active */}
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

            <div className="p-5 border-t border-gray-100 flex gap-2 sticky bottom-0 bg-white">
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
