"use client";

export default function BannersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Banners</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage homepage banners
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
        <div className="text-6xl mb-4">🖼️</div>
        <h2 className="text-xl font-semibold text-gray-700 mb-2">
          Banners Coming Soon
        </h2>
        <p className="text-gray-500 text-sm">
          Upload and manage banners here
        </p>
      </div>
    </div>
  );
}
