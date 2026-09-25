"use client";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: string;
  color?: "blue" | "green" | "red" | "amber" | "purple" | "slate";
  onClick?: () => void;
  clickable?: boolean;
}

export default function StatsCard({
  title,
  value,
  icon,
  color = "blue",
  onClick,
  clickable = false,
}: StatsCardProps) {
  const colorStyles = {
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    green: "bg-green-50 text-green-600 border-green-100",
    red: "bg-red-50 text-red-600 border-red-100",
    amber: "bg-amber-50 text-amber-600 border-amber-100",
    purple: "bg-purple-50 text-purple-600 border-purple-100",
    slate: "bg-slate-50 text-slate-600 border-slate-100",
  };

  const colorIconBg = {
    blue: "bg-blue-100 text-blue-600",
    green: "bg-green-100 text-green-600",
    red: "bg-red-100 text-red-600",
    amber: "bg-amber-100 text-amber-600",
    purple: "bg-purple-100 text-purple-600",
    slate: "bg-slate-100 text-slate-600",
  };

  return (
    <div
      onClick={clickable ? onClick : undefined}
      className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-5 transition ${
        clickable
          ? "cursor-pointer hover:shadow-md hover:border-blue-200 active:scale-[0.98]"
          : ""
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${colorIconBg[color]}`}
        >
          {icon}
        </div>
        {clickable && (
          <span className="text-xs text-gray-400 font-medium">View →</span>
        )}
      </div>
      <p className="text-xs text-gray-500 font-medium mb-1">{title}</p>
      <p className={`text-2xl font-bold ${colorStyles[color].split(" ")[1]}`}>
        {value}
      </p>
    </div>
  );
}
