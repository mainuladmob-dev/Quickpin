"use client";

type DateRange = "today" | "yesterday" | "custom";

interface DateFilterProps {
  dateRange: DateRange;
  setDateRange: (range: DateRange) => void;
  customStart: string;
  setCustomStart: (date: string) => void;
  customEnd: string;
  setCustomEnd: (date: string) => void;
}

export default function DateFilter({
  dateRange,
  setDateRange,
  customStart,
  setCustomStart,
  customEnd,
  setCustomEnd,
}: DateFilterProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 bg-white rounded-xl p-1 shadow-sm border border-gray-100">
        <button
          onClick={() => setDateRange("today")}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
            dateRange === "today"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-gray-600 hover:bg-gray-50"
          }`}
        >
          Today
        </button>
        <button
          onClick={() => setDateRange("yesterday")}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
            dateRange === "yesterday"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-gray-600 hover:bg-gray-50"
          }`}
        >
          Yesterday
        </button>
        <button
          onClick={() => setDateRange("custom")}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
            dateRange === "custom"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-gray-600 hover:bg-gray-50"
          }`}
        >
          📅 Custom
        </button>
      </div>

      {dateRange === "custom" && (
        <div className="flex items-center gap-2 bg-white rounded-xl p-2 shadow-sm border border-gray-100">
          <input
            type="date"
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
          <span className="text-gray-400 text-sm">to</span>
          <input
            type="date"
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
        </div>
      )}
    </div>
  );
}
