"use client";

interface DeliverySectionProps {
  homeDeliveries: number;
  selfPickups: number;
  deliveryCharge: number;
  deliveryGST: number;
}

export default function DeliverySection({
  homeDeliveries,
  selfPickups,
  deliveryCharge,
  deliveryGST,
}: DeliverySectionProps) {
  const totalDelivery = deliveryCharge + deliveryGST;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
        <h3 className="text-sm font-bold text-gray-900">
          🚚 Delivery GST (Secondary)
        </h3>
        <p className="text-xs text-gray-500 mt-0.5">
          Home delivery service charge GST (18%)
        </p>
      </div>

      <div className="p-4 space-y-3">
        {/* Delivery Count */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-base">🏠</span>
              <p className="text-xs font-medium text-blue-700">
                Home Delivery
              </p>
            </div>
            <p className="text-xl font-bold text-blue-800">
              {homeDeliveries}
            </p>
          </div>
          <div className="bg-purple-50 rounded-xl p-3 border border-purple-100">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-base">🏬</span>
              <p className="text-xs font-medium text-purple-700">
                Self Pickup
              </p>
            </div>
            <p className="text-xl font-bold text-purple-800">
              {selfPickups}
            </p>
          </div>
        </div>

        {/* Delivery Charge Breakdown */}
        <div className="bg-gray-50 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">
              Delivery Charge (Base):
            </span>
            <span className="text-sm font-bold text-gray-800">
              ₹{deliveryCharge.toLocaleString("en-IN")}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">
              GST (18%):
            </span>
            <span className="text-sm font-bold text-amber-600">
              ₹{deliveryGST.toFixed(2)}
            </span>
          </div>

          <div className="border-t border-gray-200 pt-2 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-800">
              Total Delivery:
            </span>
            <span className="text-base font-bold text-blue-600">
              ₹{totalDelivery.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Info Note */}
        <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
          <p className="text-xs text-amber-700">
            💡 Delivery service charge-এর GST 18%। Self Pickup-এ
            delivery charge নেই।
          </p>
        </div>
      </div>
    </div>
  );
}
