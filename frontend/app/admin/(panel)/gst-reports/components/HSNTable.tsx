"use client";

interface HSNItem {
  hsn_code: string;
  product_name: string;
  gst_percentage: number;
  net_sales: number;
  gst_amount: number;
  qty: number;
}

interface HSNTableProps {
  items: HSNItem[];
  loading?: boolean;
}

export default function HSNTable({ items, loading }: HSNTableProps) {
  const totalNetSales = items.reduce((sum, item) => sum + item.net_sales, 0);
  const totalGST = items.reduce((sum, item) => sum + item.gst_amount, 0);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mx-auto"></div>
        <p className="text-sm text-gray-500 mt-3">Loading HSN data...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
        <div className="text-6xl mb-4">📊</div>
        <h2 className="text-lg font-semibold text-gray-700 mb-1">
          No sales data
        </h2>
        <p className="text-sm text-gray-500">
          এই period-এ কোনো sales হয়নি
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
        <h3 className="text-sm font-bold text-gray-900">
          🛍️ Product-wise GST (HSN)
        </h3>
        <p className="text-xs text-gray-500 mt-0.5">
          {items.length} HSN{items.length !== 1 ? "s" : ""} • Net Sales based
        </p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">
                HSN
              </th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">
                Product
              </th>
              <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">
                Qty
              </th>
              <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">
                GST%
              </th>
              <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">
                Net Sales
              </th>
              <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">
                GST
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr
                key={`${item.hsn_code}-${item.product_name}-${index}`}
                className="border-b border-gray-50 hover:bg-gray-50/50 transition"
              >
                <td className="px-4 py-3">
                  <span className="text-xs font-mono font-bold text-gray-800 bg-gray-100 px-2 py-1 rounded">
                    {item.hsn_code || "—"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <p className="text-sm font-medium text-gray-900 truncate max-w-[200px]">
                    {item.product_name}
                  </p>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="text-sm text-gray-700">
                    {item.qty}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <span
                    className={`text-xs font-semibold px-2 py-1 rounded-full ${
                      item.gst_percentage === 0
                        ? "bg-green-50 text-green-700"
                        : item.gst_percentage <= 5
                        ? "bg-blue-50 text-blue-700"
                        : item.gst_percentage <= 12
                        ? "bg-amber-50 text-amber-700"
                        : "bg-red-50 text-red-700"
                    }`}
                  >
                    {item.gst_percentage}%
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="text-sm font-bold text-gray-800">
                    ₹{item.net_sales.toLocaleString("en-IN")}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="text-sm font-bold text-amber-600">
                    ₹{item.gst_amount.toFixed(2)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-blue-50 border-t-2 border-blue-100">
              <td
                colSpan={4}
                className="px-4 py-3 text-right text-sm font-bold text-gray-800"
              >
                TOTAL:
              </td>
              <td className="px-4 py-3 text-right text-base font-bold text-blue-700">
                ₹{totalNetSales.toLocaleString("en-IN")}
              </td>
              <td className="px-4 py-3 text-right text-base font-bold text-amber-700">
                ₹{totalGST.toFixed(2)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
