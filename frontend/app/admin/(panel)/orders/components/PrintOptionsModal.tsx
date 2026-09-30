"use client";

import { useState } from "react";
import type { OrderData } from "./OrderCard";
import AddressSticker from "./AddressSticker";
import PrintLabel from "./PrintLabel";

interface PrintOptionsModalProps {
  order: OrderData;
  onClose: () => void;
}

type PrintType = "sticker" | "invoice" | null;

export default function PrintOptionsModal({
  order,
  onClose,
}: PrintOptionsModalProps) {
  const [selectedPrint, setSelectedPrint] = useState<PrintType>(null);

  // Show Address Sticker component
  if (selectedPrint === "sticker") {
    return (
      <AddressSticker
        order={order}
        onClose={() => {
          setSelectedPrint(null);
          onClose();
        }}
      />
    );
  }

  // Show Invoice component
  if (selectedPrint === "invoice") {
    return (
      <PrintLabel
        order={order}
        onClose={() => {
          setSelectedPrint(null);
          onClose();
        }}
      />
    );
  }

  // Print Options
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              🖨️ Print Options
            </h2>
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

        {/* Body */}
        <div className="p-5 space-y-3">
          <p className="text-sm text-gray-600 mb-4">
            কী print করতে চান select করুন:
          </p>

          {/* Address Sticker Option */}
          <button
            onClick={() => setSelectedPrint("sticker")}
            className="w-full bg-white hover:bg-blue-50 border-2 border-gray-200 hover:border-blue-400 rounded-xl p-4 transition text-left group"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-blue-100 group-hover:bg-blue-200 flex items-center justify-center text-2xl shrink-0 transition">
                📌
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-gray-900">
                  Address Sticker
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  ছোট sticker — শুধু delivery info
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  75mm × 50mm • Sticker paper
                </p>
              </div>
              <span className="text-gray-300 group-hover:text-blue-600 text-xl transition">
                →
              </span>
            </div>
          </button>

          {/* Invoice Option */}
          <button
            onClick={() => setSelectedPrint("invoice")}
            className="w-full bg-white hover:bg-green-50 border-2 border-gray-200 hover:border-green-400 rounded-xl p-4 transition text-left group"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-green-100 group-hover:bg-green-200 flex items-center justify-center text-2xl shrink-0 transition">
                📋
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-gray-900">
                  {order.refund_amount > 0 ? "Refund Invoice" : "Invoice"}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Full bill — Products + GST + Total
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  A4 Paper • Complete details
                </p>
              </div>
              <span className="text-gray-300 group-hover:text-green-600 text-xl transition">
                →
              </span>
            </div>
          </button>
        </div>

        {/* Actions */}
        <div className="p-5 border-t border-gray-100">
          <button
            onClick={onClose}
            className="w-full py-3 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
