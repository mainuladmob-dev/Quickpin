"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

interface Product {
  id: string;
  name_en: string;
  name_bn: string;
  price: number;
  weight: number;
  stock: number;
  is_active: boolean;
  category_id: string | null;
  images: string[] | null;
  categories?: { name_en: string } | null;
}

export default function ProductsPage() {
  const supabase = useMemo(() => createClient(), []);

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterActive, setFilterActive] = useState<"all" | "active" | "inactive">(
    "all"
  );

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [formData, setFormData] = useState({
    name_en: "",
    name_bn: "",
    price: "",
    weight: "",
    stock: "",
    is_active: true,
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("products")
      .select("id, name_en, name_bn, price, weight, stock, is_active, category_id, images")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
    } else {
      setProducts((data as Product[]) || []);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const openAddModal = () => {
    setEditingProduct(null);
    setFormData({
      name_en: "",
      name_bn: "",
      price: "",
      weight: "",
      stock: "",
      is_active: true,
    });
    setError("");
    setShowModal(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name_en: product.name_en || "",
      name_bn: product.name_bn || "",
      price: String(product.price || ""),
      weight: String(product.weight || ""),
      stock: String(product.stock || ""),
      is_active: product.is_active,
    });
    setError("");
    setShowModal(true);
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
    if (!formData.price || Number(formData.price) <= 0) {
      setError("Valid price required");
      return;
    }

    setSaving(true);
    setError("");

    const payload = {
      name_en: formData.name_en.trim(),
      name_bn: formData.name_bn.trim(),
      price: Number(formData.price),
      weight: Number(formData.weight) || 0,
      stock: Number(formData.stock) || 0,
      is_active: formData.is_active,
    };

    try {
      if (editingProduct) {
        const { error } = await supabase
          .from("products")
          .update(payload)
          .eq("id", editingProduct.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("products").insert(payload);
        if (error) throw error;
      }

      setShowModal(false);
      await fetchProducts();
    } catch (err: any) {
      setError(err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (product: Product) => {
    if (!confirm(`Delete "${product.name_en}"?`)) return;

    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", product.id);

    if (error) {
      alert("Delete failed: " + error.message);
      return;
    }
    await fetchProducts();
  };

  const toggleActive = async (product: Product) => {
    const { error } = await supabase
      .from("products")
      .update({ is_active: !product.is_active })
      .eq("id", product.id);

    if (error) {
      alert("Update failed: " + error.message);
      return;
    }
    await fetchProducts();
  };

  const filteredProducts = useMemo(() => {
    let result = products;

    if (filterActive === "active") {
      result = result.filter((p) => p.is_active);
    } else if (filterActive === "inactive") {
      result = result.filter((p) => !p.is_active);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name_en?.toLowerCase().includes(q) ||
          p.name_bn?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [products, filterActive, searchQuery]);

  return (
    <div className="space-y-4 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="text-sm text-gray-500 mt-1">
            {products.length} total products
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
            placeholder="Search products..."
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

      {/* Filter */}
      <div className="flex items-center gap-2 bg-white rounded-xl p-1 shadow-sm border border-gray-100">
        {(["all", "active", "inactive"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilterActive(f)}
            className={`flex-1 px-3 py-2 text-xs font-medium rounded-lg capitalize transition ${
              filterActive === f
                ? "bg-blue-600 text-white"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <div className="text-6xl mb-4">🛍️</div>
          <h2 className="text-lg font-semibold text-gray-700 mb-1">
            No products found
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            {searchQuery ? "No matching products" : "Add your first product"}
          </p>
          {!searchQuery && (
            <button
              onClick={openAddModal}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition"
            >
              ➕ Add Product
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 flex items-center gap-3"
            >
              {/* Image */}
              <div className="w-14 h-14 rounded-lg bg-gray-100 flex items-center justify-center text-2xl shrink-0 overflow-hidden">
                {product.images && product.images[0] ? (
                  <img
                    src={product.images[0]}
                    alt={product.name_en}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  "🛍️"
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {product.name_en}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {product.name_bn}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm font-bold text-blue-600">
                    ₹{product.price}
                  </span>
                  <span className="text-xs text-gray-400">•</span>
                  <span className="text-xs text-gray-500">
                    {product.weight}kg
                  </span>
                  <span className="text-xs text-gray-400">•</span>
                  <span
                    className={`text-xs font-medium ${
                      product.stock === 0
                        ? "text-red-600"
                        : product.stock < 10
                        ? "text-amber-600"
                        : "text-green-600"
                    }`}
                  >
                    Stock: {product.stock}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-1 shrink-0">
                <button
                  onClick={() => openEditModal(product)}
                  className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-600 px-2.5 py-1 rounded-lg font-medium transition"
                >
                  ✏️ Edit
                </button>
                <button
                  onClick={() => toggleActive(product)}
                  className={`text-xs px-2.5 py-1 rounded-lg font-medium transition ${
                    product.is_active
                      ? "bg-green-50 hover:bg-green-100 text-green-600"
                      : "bg-gray-100 hover:bg-gray-200 text-gray-600"
                  }`}
                >
                  {product.is_active ? "✅ Active" : "⏸️ Off"}
                </button>
                <button
                  onClick={() => handleDelete(product)}
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
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">
                {editingProduct ? "✏️ Edit Product" : "➕ Add Product"}
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
                  placeholder="Potato"
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
                  placeholder="আলু"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Price (₹) *
                  </label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) =>
                      setFormData({ ...formData, price: e.target.value })
                    }
                    placeholder="50"
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Weight (kg)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.weight}
                    onChange={(e) =>
                      setFormData({ ...formData, weight: e.target.value })
                    }
                    placeholder="1"
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Stock
                </label>
                <input
                  type="number"
                  value={formData.stock}
                  onChange={(e) =>
                    setFormData({ ...formData, stock: e.target.value })
                  }
                  placeholder="100"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                />
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
