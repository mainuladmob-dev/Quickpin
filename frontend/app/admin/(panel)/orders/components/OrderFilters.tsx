"use client";

export type DateRange = "today" | "yesterday" | "custom" | "all";

export type OrderStatusFilter =
  | "all"
  | "current"
  | "out_for_delivery"
  | "delivered"
  | "pending"
  | "spam";

export type OrderTypeFilter =
  | "all"
  | "full_home"
  | "full_self"
  | "advance_home"
  | "advance_self";

interface StatusCounts {
  all: number;
  current: number;
  out_for_delivery: number;
  delivered: number;
  pending: number;
  spam: number;
}

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
  counts: StatusCounts;
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
  counts,
}: OrderFiltersProps) {
  const statusOptions: {
    value: OrderStatusFilter;
    label: string;
    count: number;
    color: string;
  }[] = [
    { value: "all", label: "All", count: counts.all, color: "blue" },
    { value: "current", label: "Current", count: counts.current, color: "blue" },
    {
      value: "out_for_delivery",
      label: "Out for Delivery",
      count: counts.out_for_delivery,
      color: "purple",
    },
    {
      value: "delivered",
      label: "Delivered",
      count: counts.delivered,
      color: "green",
    },
    {
      value: "pending",
      label: "Pending",
      count: counts.pending,
      color: "amber",
    },
    { value: "spam", label: "Spam", count: counts.spam, color: "red" },
  ];

  const typeOptions: { value: OrderTypeFilter; label: string }[] = [
    { value: "all", label: "All Types" },
    { value: "full_home", label: "Full + Home" },
    { value: "full_self", label: "Full + Self" },
    { value: "advance_home", label: "Advance + Home" },
    { value: "advance_self", label: "Advance + Self" },
  ];

  const getStatusColorClasses = (color: string, isActive: boolean) => {
    const map: Record<string, { active: string; badge: string }> = {
      blue: {
        active: "bg-blue-600 text-white border-blue-600 shadow-sm",
        badge: "bg-white/25 text-white",
      },
      purple: {
        active: "bg-purple-600 text-white border-purple-600 shadow-sm",
        badge: "bg-white/25 text-white",
      },
      green: {
        active: "bg-green-600 text-white border-green-600 shadow-sm",
        badge: "bg-white/25 text-white",
      },
      amber: {
        active: "bg-amber-500 text-white border-amber-500 shadow-sm",
        badge: "bg-white/25 text-white",
      },
      red: {
        active: "bg-red-600 text-white border-red-600 shadow-sm",
        badge: "bg-white/25 text-white",
      },
    };

    if (isActive) return map[color].active;
    return "bg-white text-gray-600 border-gray-200 hover:bg-gray-50";
  };

  const getBadgeColorClasses = (color: string, isActive: boolean) => {
    if (isActive) return "bg-white/25 text-white";
    return "bg-gray-100 text-gray-600";
  };

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
        <button
          onClick={() => setDateRange("all")}
          className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition ${
            dateRange === "all"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-gray-600 hover:bg-gray-50"
          }`}
        >
          🕐 All Time
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

      {/* Status Filter with Counts */}
      <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          📊 Status
        </p>
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {statusOptions.map((opt) => {
            const isActive = orderStatus === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setOrderStatus(opt.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition border flex items-center gap-1.5 ${getStatusColorClasses(
                  opt.color,
                  isActive
                )}`}
              >
                <span>{opt.label}</span>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${getBadgeColorClasses(
                    opt.color,
                    isActive
                  )}`}
                >
                  {opt.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
