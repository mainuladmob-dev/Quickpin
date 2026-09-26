"use client";

import { useEffect, useRef } from "react";
import type { OrderData } from "./OrderCard";

interface PrintLabelProps {
  order: OrderData;
  onClose: () => void;
}

export default function PrintLabel({ order, onClose }: PrintLabelProps) {
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, []);

  const getOrderTypeLabel = (type: string | null) => {
    if (!type) return "N/A";
    const map: Record<string, string> = {
      full_home: "Full + Home",
      full_self: "Full + Self",
      advance_home: "Advance + Home",
      advance_self: "Advance + Self",
    };
    return map[type] || type;
  };

  const handlePrint = () => {
    if (!printRef.current) return;
    const printWindow = window.open("", "_blank", "width=400,height=600");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Print Label - ${order.order_number}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; padding: 20px; }
            .label { width: 100%; max-width: 380px; margin: 0 auto; border: 2px solid #000; padding: 16px; }
            .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 10px; margin-bottom: 12px; }
            .header h1 { font-size: 20px; letter-spacing: 2px; }
            .header p { font-size: 11px; color: #666; margin-top: 2px; }
            .section { margin-bottom: 12px; }
            .section-title { font-size: 10px; color: #666; text-transform: uppercase; font-weight: bold; letter-spacing: 1px; margin-bottom: 4px; }
            .order-info { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 4px; }
            .order-info strong { font-weight: bold; }
            .products { border-top: 1px dashed #999; padding-top: 8px; margin-top: 8px; }
            .product-row { display: flex; justify-content: space-between; font-size: 12px; padding: 3px 0; }
            .total-row { border-top: 2px solid #000; margin-top: 8px; padding-top: 8px; }
            .total-row .row { display: flex; justify-content: space-between; font-size: 13px; font-weight: bold; padding: 2px 0; }
            .address { border-top: 1px dashed #999; padding-top: 8px; margin-top: 8px; font-size: 12px; line-height: 1.5; }
            .address p { margin: 2px 0; }
            .footer { text-align: center; font-size: 10px; color: #666; margin-top: 12px; border-top: 1px dashed #999; padding-top: 8px; }
          </style>
        </head>
        <body>
          ${printRef.current.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const items = order.order_items || [];
  const address = order.address;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">🖨️ Print Label</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {order.order_number}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500 text-xl"
          >
            ×
          </button>
        </div>

        {/* Preview */}
        <div className="flex-1 overflow-y-auto p-5 bg-gray-50">
          <div
            ref={printRef}
            className="bg-white p-4 border-2 border-black max-w-[380px] mx-auto"
          >
            {/* Label Header */}
            <div className="header">
              <h1>⚡ QUICKPIN</h1>
              <p>Delivery Label</p>
            </div>

            {/* Order Info */}
            <div className="section">
              <div className="order-info">
                <span>Order ID:</span>
                <strong>{order.order_number}</strong>
              </div>
              <div className="order-info">
                <span>Phone:</span>
                <strong>{order.phone || "N/A"}</strong>
              </div>
              <div className="order-info">
                <span>Type:</span>
                <strong>{getOrderTypeLabel(order.delivery_type)}</strong>
              </div>
            </div>

            {/* Products */}
            {items.length > 0 && (
              <div className="products">
                <div className="section-title">🛍️ Products</div>
                {items.map((item, idx) => (
                  <div key={item.id || idx} className="product-row">
                    <span>
                      • {item.products?.name_en || "Product"} x {item.qty}
                    </span>
                    <span>₹{(item.qty * item.price).toLocaleString("en-IN")}</span>
                  </div>
                ))}

                <div className="total-row">
                  <div className="row">
                    <span>Total:</span>
                    <span>₹{order.total_amount.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="row">
                    <span>Paid:</span>
                    <span>₹{order.paid_amount.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="row">
                    <span>Due:</span>
                    <span>₹{order.remaining_amount.toLocaleString("en-IN")}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Address */}
            {address && (
              <div className="address">
                <div className="section-title">📍 Delivery Address</div>
                <p>
                  <strong>{address.full_name}</strong>
                </p>
                <p>{address.address_line1}</p>
                <p>
                  {address.city}, {address.state} - {address.pincode}
                </p>
                <p>📞 {address.phone}</p>
              </div>
            )}

            {/* Footer */}
            <div className="footer">
              Thank you for shopping with Quickpin ⚡
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-gray-100 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-3 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition"
          >
            Cancel
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 py-3 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition"
          >
            🖨️ Print
          </button>
        </div>
      </div>
    </div>
  );
            }
