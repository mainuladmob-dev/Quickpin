"use client";

interface SummaryCardsProps {
  grossSales: number;
  refundAmount: number;
  netSales: number;
  productGST: number;
  deliveryGST: number;
  totalGST: number;
}

export default function SummaryCards({
  grossSales,
  refundAmount,
  netSales,
  productGST,
  deliveryGST,
  totalGST,
}: SummaryCardsProps) {
  return (
    <div className="space-y-4">
      {/* Row 1: Sales Summary */}
      <div>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          💰 Sales Summary
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-xs text-gray-500 mb-1">Gross Sales</p>
            <p className="text-xl font-bold text-green-600">
              ₹{grossSales.toLocaleString("en-IN")}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-xs text-gray-500 mb-1">Refund</p>
            <p className="text-xl font-bold text-red-600">
              ₹{refundAmount.toLocaleString("en-IN")}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-xs text-gray-500 mb-1">Net Sales</p>
            <p className="text-xl font-bold text-blue-600">
              ₹{netSales.toLocaleString("en-IN")}
            </p>
          </div>
        </div>
      </div>

      {/* Row 2: GST Summary */}
      <div>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          📊 GST Summary
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-xs text-gray-500 mb-1">Product GST</p>
            <p className="text-xl font-bold text-amber-600">
              ₹{productGST.toLocaleString("en-IN")}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-xs text-gray-500 mb-1">Delivery GST</p>
            <p className="text-xl font-bold text-purple-600">
              ₹{deliveryGST.toLocaleString("en-IN")}
            </p>
          </div>
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl border border-blue-700 p-4 text-white">
            <p className="text-xs text-blue-100 mb-1">Total GST Payable</p>
            <p className="text-xl font-bold">
              ₹{totalGST.toLocaleString("en-IN")}
            </p>
          </div>
        </div>
      </div>

      {/* Row 3: CGST/SGST Split */}
      <div>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          📋 GST Breakdown (Intra-State)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-xs text-gray-500 mb-1">CGST (9%)</p>
            <p className="text-lg font-bold text-gray-800">
              ₹{(totalGST / 2).toLocaleString("en-IN")}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-xs text-gray-500 mb-1">SGST (9%)</p>
            <p className="text-lg font-bold text-gray-800">
              ₹{(totalGST / 2).toLocaleString("en-IN")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
