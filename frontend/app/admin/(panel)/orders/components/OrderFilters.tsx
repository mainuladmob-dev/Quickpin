"use client";

export type DateRange = "today" | "yesterday" | "custom";

export type OrderStatusFilter =
  | "all"
  | "current"
  | "out_for_delivery"
  | "delivered"
  | "refund"
  | "pending"
  | "spam";

export type OrderTypeFilter =
  | "all"
  | "full_home"
  | "full_self"
  | "advance_home"
  | "advance_self";

interface OrderFiltersProps {
  dateRange: DateRange;
  setDateRange: (r: DateRange) => void;
  customStart: string;
  setCustomStart: (d: string) => void;
  customEnd: string;
  setCustomEnd: (d: string) => void;
  orderStatus: OrderStatusFilter;
  setOrderStatus: (s: OrderStatusFilter) => void;
  orderType: OrderTypeFilter;
  setOrderType: (t: OrderTypeFilter) => void;
}

export default function OrderFilters({
  dateRange,
  setDateRange,
  customStart,
  setCustomStart,
  customEnd,
  setCustomEnd,
  orderStatus,
  setOrderStatus,
  orderType,
  setOrderType,
}: OrderFiltersProps) {
  const statusOptions: { value: OrderStatusFilter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "current", label: "Current" },
    { value: "out_for_delivery", label: "Out for Delivery" },
    { value: "delivered", label: "Delivered" },
    { value: "refund", label: "Refund" },
    { value: "pending", label: "Pending" },
    { value: "spam", label: "Spam" },
  ];

  const typeOptions: { value: OrderTypeFilter; label: string }[] = [
    { value: "all", label: "All Types" },
    { value: "full_home", label: "Full + Home" },
    { value: "full_self", label: "Full + Self" },
    { value: "advance_home", label: "Advance + Home" },
    { value: "advance_self", label: "Advance + Self" },
  ];

  return (
    <div className="space-y-3">
      {/* Date Filter */}
      <div className="flex items-center gap-1 bg-white rounded-xl p-1 shadow-sm border border-gray-100 overflow-x-auto">
        <button
          onClick={() => setDateRange("today")}
          className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition ${
            dateRange === "today"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-gray-600 hover:bg-gray-50"
          }`}
        >
          Today
        </button>
        <button
          onClick={() => setDateRange("yesterday")}
          className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition ${
            dateRange === "yesterday"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-gray-600 hover:bg-gray-50"
          }`}
        >
          Yesterday
        </button>
        <button
          onClick={() => setDateRange("custom")}
          className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition ${
            dateRange === "custom"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-gray-600 hover:bg-gray-50"
          }`}
        >
          📅 Custom
        </button>
      </div>

      {/* Custom date pickers */}
      {dateRange === "custom" && (
        <div className="flex items-center gap-2 bg-white rounded-xl p-2 shadow-sm border border-gray-100">
          <input
            type="date"
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
            className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <span className="text-gray-400 text-xs font-medium">to</span>
          <input
            type="date"
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
            className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
      )}

      {/* Order Type Filter */}
      <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          📦 Order Type
        </p>
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {typeOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setOrderType(opt.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition border ${
                orderType === opt.value
                  ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                  : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Status Filter */}
      <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          📊 Status
        </p>
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {statusOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setOrderStatus(opt.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition border ${
                orderStatus === opt.value
                  ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                  : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
      }
