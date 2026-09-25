"use client";

export default function AdminsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admins</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage admin accounts
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
        <div className="text-6xl mb-4">👤</div>
        <h2 className="text-xl font-semibold text-gray-700 mb-2">
          Admins Coming Soon
        </h2>
        <p className="text-gray-500 text-sm">
          Add and manage admin accounts here
        </p>
      </div>
    </div>
  );
}
