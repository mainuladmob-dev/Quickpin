"use client";

export default function ProductsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Products</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage your product catalog
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
        <div className="text-6xl mb-4">🛍️</div>
        <h2 className="text-xl font-semibold text-gray-700 mb-2">
          Products Coming Soon
        </h2>
        <p className="text-gray-500 text-sm">
          Add, edit, and manage products here
        </p>
      </div>
    </div>
  );
}
