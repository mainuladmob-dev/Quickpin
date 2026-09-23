"use client";

import { useState, useMemo } from "react";

type OrderItem = {
  id?: string;
  name?: string;
  product_name?: string;
  price?: number;
  unit_price?: number;
  quantity?: number;
  qty?: number;
  count?: number;
  products?: {
    name_en?: string;
    name_bn?: string;
    name?: string;
  };
};

function resolveItemName(item: any): string {
  const p = item?.products || item?.product || {};
  return (
    p.name_en ||
    item.name_en ||
    p.name ||
    item.name ||
    item.product_name ||
    p.title ||
    item.title ||
    p.name_bn ||
    "Product Item"
  );
}

export default function RefundModal({
  order,
  onClose,
  onSubmit,
  saving,
}: {
  order: any;
  onClose: () => void;
  onSubmit: (data: {
    reason: string;
    amount: number;
    method: string;
    note: string;
    product_name?: string;
    transaction_ref?: string;
    customer_upi?: string;
  }) => void;
  saving: boolean;
}) {
  // 1. Order Items Extraction
  const items: OrderItem[] = useMemo(() => {
    if (Array.isArray(order?.order_items)) return order.order_items;
    if (Array.isArray(order?.items)) return order.items;
    if (typeof order?.items === "string") {
      try {
        return JSON.parse(order.items);
      } catch {
        return [];
      }
    }
    return [];
  }, [order]);

  // Initializing Defaults
  const initialItem = items.length > 0 ? items[0] : null;
  const initialItemCap = initialItem
    ? Number(initialItem.price || initialItem.unit_price || 0) *
      Number(initialItem.quantity || initialItem.qty || 1)
    : Number(order?.total_amount || 0);

  const [selectedItemIdx, setSelectedItemIdx] = useState<number>(0);
  const [amount, setAmount] = useState<string>(initialItemCap > 0 ? initialItemCap.toString() : "0");
  const [reason, setReason] = useState<string>("rotten");
  const [method, setMethod] = useState<"upi" | "cash" | "bank">("upi");
  const [utr, setUtr] = useState<string>("");
  const [note, setNote] = useState<string>("");

  // UPI State (Database default ba manual input)
  const defaultUpi =
    order?.customer_upi ||
    order?.upi_id ||
    order?.profiles?.upi_id ||
    "";
  const [customerUpi, setCustomerUpi] = useState<string>(defaultUpi);
  const [copiedUpi, setCopiedUpi] = useState(false);

  // 2. Active Item Maximum Refund Cap Calculation
  const activeCap = useMemo(() => {
    if (selectedItemIdx === -1) {
      // Entire Order option
      return Number(order?.total_amount || 0);
    }
    const item = items[selectedItemIdx];
    if (!item) return Number(order?.total_amount || 0);
    const price = Number(item.price || item.unit_price || 0);
    const qty = Number(item.quantity || item.qty || item.count || 1);
    return price * qty;
  }, [selectedItemIdx, items, order]);

  // Handle Item Dropdown Change
  const handleItemChange = (idx: number) => {
    setSelectedItemIdx(idx);
    if (idx === -1) {
      setAmount(Number(order?.total_amount || 0).toString());
    } else {
      const it = items[idx];
      const maxVal =
        Number(it?.price || it?.unit_price || 0) *
        Number(it?.quantity || it?.qty || it?.count || 1);
      setAmount(maxVal.toString());
    }
  };

  const parsedAmount = Number(amount) || 0;
  const isAmountValid = parsedAmount > 0 && parsedAmount <= activeCap;

  // Handle Copy UPI
  const handleCopyUpi = () => {
    if (!customerUpi) return;
    navigator.clipboard.writeText(customerUpi);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  // Submit Handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAmountValid) {
      alert(`Invalid Amount! Must be between ₹1 and Cap of ₹${activeCap}`);
      return;
    }

    const selectedName =
      selectedItemIdx === -1
        ? "Entire Order / Full Return"
        : resolveItemName(items[selectedItemIdx]);

    onSubmit({
      reason,
      amount: parsedAmount,
      method,
      note,
      product_name: selectedName,
      transaction_ref: utr.trim() || undefined,
      customer_upi: method === "upi" ? customerUpi.trim() || undefined : undefined,
    });
  };
      
