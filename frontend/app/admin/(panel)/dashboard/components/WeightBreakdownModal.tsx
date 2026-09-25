"use client";

interface WeightItem {
  name: string;
  weight: number;
}

interface WeightBreakdownModalProps {
  breakdown: WeightItem[];
  totalWeight: number;
  onClose: () => void;
}

export default function WeightBreakdownModal({
  breakdown,
  totalWeight,
  onClose,
}: WeightBreakdownModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              ⚖️ Weight Breakdown
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Total: {totalWeight} kg
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500 text-xl"
          >
            ×
          </button>
        </div>

        {/* Weight Breakdown List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-2">
          {breakdown.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-4xl mb-3">📭</p>
              <p className="text-gray-500 text-sm">No products found</p>
            </div>
          ) : (
            <>
              {breakdown.map((item, index) => (
                <div
                  key={item.name + index}
                  className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 font-mono w-6">
                      {index + 1}.
                    </span>
                    <span className="text-sm font-medium text-gray-800">
                      {item.name}
                    </span>
                  </div>
                  <span className="text-sm font-bold text-purple-600">
                    {item.weight} kg
                  </span>
                </div>
              ))}

              {/* Total */}
              <div className="flex items-center justify-between bg-purple-50 border border-purple-100 rounded-lg px-4 py-3 mt-4">
                <span className="text-sm font-bold text-purple-700">
                  Total Weight
                </span>
                <span className="text-lg font-bold text-purple-700">
                  {totalWeight} kg
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
