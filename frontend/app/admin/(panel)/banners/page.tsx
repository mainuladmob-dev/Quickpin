"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Banner = {
  id: string;
  position: string;
  title: string | null;
  image_url: string;
  link_url: string | null;
  is_active: boolean;
  sort_order: number;
};

const POSITIONS = [
  { value: "header_top", label: "Header Top (নামের উপরে)" },
  { value: "footer_bottom", label: "Footer Bottom (নিচে)" },
];

export default function AdminBannersPage() {
  const supabase = createClient();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Banner | null>(null);
  const [form, setForm] = useState({
    position: "header_top",
    title: "",
    link_url: "",
    is_active: true,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [existingImage, setExistingImage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchBanners = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("banners")
      .select("*")
      .order("position")
      .order("sort_order");
    setBanners(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  const openAdd = () => {
    setEditing(null);
    setForm({ position: "header_top", title: "", link_url: "", is_active: true });
    setImageFile(null);
    setExistingImage(null);
    setError("");
    setShowForm(true);
  };

  const openEdit = (b: Banner) => {
    setEditing(b);
    setForm({
      position: b.position,
      title: b.title || "",
      link_url: b.link_url || "",
      is_active: b.is_active,
    });
    setImageFile(null);
    setExistingImage(b.image_url);
    setError("");
    setShowForm(true);
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    const ext = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("banners")
      .upload(fileName, file);
    if (upErr) {
      setError("Image upload failed: " + upErr.message);
      return null;
    }
    const { data } = supabase.storage.from("banners").getPublicUrl(fileName);
    return data.publicUrl;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!editing && !imageFile) {
      setError("Please select an image");
      return;
    }

    setSaving(true);

    let imageUrl = existingImage;
    if (imageFile) {
      const url = await uploadImage(imageFile);
      if (!url) {
        setSaving(false);
        return;
      }
      imageUrl = url;
    }

    if (!imageUrl) {
      setError("Image is required");
      setSaving(false);
      return;
    }

    const payload = {
      position: form.position,
      title: form.title.trim() || null,
      link_url: form.link_url.trim() || null,
      image_url: imageUrl,
      is_active: form.is_active,
    };

    let result;
    if (editing) {
      result = await supabase.from("banners").update(payload).eq("id", editing.id);
    } else {
      result = await supabase.from("banners").insert(payload);
    }

    if (result.error) {
      setError(result.error.message);
      setSaving(false);
      return;
    }

    setShowForm(false);
    setSaving(false);
    fetchBanners();
  };

  const toggleActive = async (b: Banner) => {
    await supabase.from("banners").update({ is_active: !b.is_active }).eq("id", b.id);
    fetchBanners();
  };

  const handleDelete = async (b: Banner) => {
    if (!confirm("Delete this banner?")) return;
    const { error } = await supabase.from("banners").delete().eq("id", b.id);
    if (error) {
      alert(error.message);
      return;
    }
    fetchBanners();
  };

  const getPositionLabel = (pos: string) => {
    return POSITIONS.find((p) => p.value === pos)?.label || pos;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Banners</h1>
        <button
          onClick={openAdd}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          + Add Banner
        </button>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : banners.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center text-gray-500">
          No banners yet. Click "Add Banner" to upload one.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {banners.map((b) => (
            <div key={b.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <img src={b.image_url} alt={b.title || ""} className="w-full h-40 object-cover" />
              <div className="p-4">
                <p className="text-xs text-gray-500 mb-1">{getPositionLabel(b.position)}</p>
                <p className="font-medium text-gray-800 text-sm mb-2">{b.title || "—"}</p>
                {b.link_url && (
                  <p className="text-xs text-blue-600 truncate mb-2">{b.link_url}</p>
                )}
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => toggleActive(b)}
                    className={`text-xs px-2 py-1 rounded-full font-medium ${
                      b.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {b.is_active ? "Active" : "Inactive"}
                  </button>
                  <div className="space-x-2">
                    <button onClick={() => openEdit(b)} className="text-blue-600 hover:underline text-xs">
                      Edit
                    </button>
                    <button onClick={() => handleDelete(b)} className="text-red-600 hover:underline text-xs">
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 my-8">
            <h2 className="text-lg font-bold mb-4">
              {editing ? "Edit Banner" : "Add Banner"}
            </h2>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
                <select
                  value={form.position}
                  onChange={(e) => setForm({ ...form, position: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                >
                  {POSITIONS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title (optional)</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Link URL (optional)</label>
                <input
                  type="url"
                  value={form.link_url}
                  onChange={(e) => setForm({ ...form, link_url: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Banner Image</label>
                {existingImage && !imageFile && (
                  <img src={existingImage} alt="" className="w-full h-32 object-cover rounded-lg mb-2" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                  className="w-full text-sm text-gray-700"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                />
                <label htmlFor="is_active" className="text-sm text-gray-700">
                  Active (visible on website)
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
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50"
                >
                  {saving ? "Saving..." : editing ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
                                            }
