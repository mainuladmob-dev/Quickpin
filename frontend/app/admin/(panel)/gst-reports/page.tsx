{/* Summary Cards — 3 Cards + Total */}
<div className="grid grid-cols-2 md:grid-cols-3 gap-3">
  <div className="bg-white rounded-2xl border border-gray-100 p-5">
    <p className="text-xs text-gray-500 mb-1">Net Sales</p>
    <p className="text-2xl font-bold text-blue-600">
      ₹{netSales.toLocaleString("en-IN")}
    </p>
  </div>

  <div className="bg-white rounded-2xl border border-gray-100 p-5">
    <p className="text-xs text-gray-500 mb-1">Product GST</p>
    <p className="text-2xl font-bold text-amber-600">
      ₹{productGST.toLocaleString("en-IN")}
    </p>
  </div>

  <div className="bg-white rounded-2xl border border-gray-100 p-5">
    <p className="text-xs text-gray-500 mb-1">Delivery GST</p>
    <p className="text-2xl font-bold text-purple-600">
      ₹{deliveryGST.toLocaleString("en-IN")}
    </p>
  </div>

  {/* Total GST — Full Width */}
  <div className="col-span-2 md:col-span-3 bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl p-5 text-white shadow-sm">
    <p className="text-xs text-white/80 mb-1">Total GST Payable</p>
    <p className="text-3xl font-bold">
      ₹{totalGST.toLocaleString("en-IN")}
    </p>
  </div>
</div>
