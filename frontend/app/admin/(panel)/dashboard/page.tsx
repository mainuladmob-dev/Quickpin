"use client";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          Overview of your store
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
        <div className="text-6xl mb-4">📊</div>
        <h2 className="text-xl font-semibold text-gray-700 mb-2">
          Dashboard Coming Soon
        </h2>
        <p className="text-gray-500 text-sm">
          এই page-এ সব statistics, orders, payments দেখা যাবে
        </p>
      </div>
    </div>
  );
}
