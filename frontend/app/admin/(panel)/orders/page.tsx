"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

// IST (Asia/Kolkata) Timezone Helper
function getISTDateString(dateObj: Date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(dateObj); // YYYY-MM-DD
}

export default function AdminOrdersPage() {
  const supabase = createClient();

  // 1. Date States
  const todayIST = useMemo(() => getISTDateString(new Date()), []);
  const yesterdayIST = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return getISTDateString(d);
  }, []);

  const [selectedDate, setSelectedDate] = useState<string>(todayIST);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // 2. Filters
  const [activeMode, setActiveMode] = useState<string>("all");
  const [activeStatus, setActiveStatus] = useState<string>("all");

  // 3. Modals
  const [picklistOpen, setPicklistOpen] = useState<boolean>(false);
  const [refundOrder, setRefundOrder] = useState<any | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);

  // 4. Safe Fetch Orders (No joins, strict IST Timezone)
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const startOfDayIST = `${selectedDate}T00:00:00+05:30`;
      const endOfDayIST = `${selectedDate}T23:59:59.999+05:30`;

      const { data: rawOrders, error } = await supabase
        .from("orders")
        .select("*")
        .gte("created_at", startOfDayIST)
        .lte("created_at", endOfDayIST)
        .order("created_at", { ascending: false });

      if (error || !rawOrders) {
        setOrders([]);
        setLoading(false);
        return;
      }

      const orderIds = rawOrders.map((o) => o.id);
      const userIds = [...new Set(rawOrders.map((o) => o.user_id).filter(Boolean))];

      // Safe fetch profiles
      let profilesMap: Record<string, any> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, name, phone, email, address")
          .in("id", userIds);
        if (profiles) {
          profiles.forEach((p) => {
            profilesMap[p.id] = p;
          });
        }
      }

      // Safe fetch items
      let itemsMap: Record<string, any[]> = {};
      const { data: orderItems } = await supabase
        .from("order_items")
        .select("*")
        .in("order_id", orderIds);

      if (orderItems) {
        orderItems.forEach((item) => {
          if (!itemsMap[item.order_id]) itemsMap[item.order_id] = [];
          itemsMap[item.order_id].push(item);
        });
      }

      const finalOrders = rawOrders.map((ord) => {
        const items =
          ord.items && Array.isArray(ord.items) && ord.items.length > 0
            ? ord.items
            : itemsMap[ord.id] || [];

        return {
          ...ord,
          profile: profilesMap[ord.user_id] || {
            name: ord.customer_name || ord.name || "Customer",
            phone: ord.customer_phone || ord.phone || "N/A",
            address: ord.delivery_address || ord.address || "",
          },
          items,
        };
      });

      setOrders(finalOrders);
    } catch (err) {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [selectedDate, supabase]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Delivery Mode Filter
  const filteredByMode = useMemo(() => {
    if (activeMode === "all") return orders;
    return orders.filter((o) => {
      const type = (o.delivery_type || "").toLowerCase();
      const isHome = type.includes("home");
      const isSelf = type.includes("pickup") || type.includes("self");
      const remaining = Number(o.remaining_amount || 0);

      if (activeMode === "home_full") return isHome && remaining <= 0;
      if (activeMode === "home_adv") return isHome && remaining > 0;
      if (activeMode === "self_full") return isSelf && remaining <= 0;
      if (activeMode === "self_adv") return isSelf && remaining > 0;
      return true;
    });
  }, [orders, activeMode]);

  // Status Filter
  const finalFilteredOrders = useMemo(() => {
    if (activeStatus === "all") return filteredByMode;
    return filteredByMode.filter((o) => {
      const st = (o.order_status || o.status || "").toLowerCase();
      if (activeStatus === "pending") return st === "pending";
      if (activeStatus === "current") return ["current", "accepted", "processing"].includes(st);
      if (activeStatus === "out_for_delivery") return st === "out_for_delivery";
      if (activeStatus === "delivered") return st === "delivered";
      if (activeStatus === "refund") return st === "refund" || st === "refunded" || Number(o.refund_amount || 0) > 0;
      if (activeStatus === "spam") return st === "spam" || st === "cancelled";
      return true;
    });
  }, [filteredByMode, activeStatus]);

  // Status Counters
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: filteredByMode.length,
      pending: 0,
      current: 0,
      out_for_delivery: 0,
      delivered: 0,
      refund: 0,
      spam: 0,
    };
    filteredByMode.forEach((o) => {
      const st = (o.order_status || o.status || "").toLowerCase();
      if (st === "pending") counts.pending++;
      if (["current", "accepted", "processing"].includes(st)) counts.current++;
      if (st === "out_for_delivery") counts.out_for_delivery++;
      if (st === "delivered") counts.delivered++;
      if (st === "refund" || st === "refunded" || Number(o.refund_amount || 0) > 0) counts.refund++;
      if (st === "spam" || st === "cancelled") counts.spam++;
    });
    return counts;
  }, [filteredByMode]);

  // Current Orders for Master Picklist
  const currentOrders = useMemo(() => {
    return orders.filter((o) => {
      const st = (o.order_status || o.status || "").toLowerCase();
      return ["current", "accepted", "processing"].includes(st);
    });
  }, [orders]);

  // Actions
  const updateStatus = async (orderId: string, newStatus: string, extraUpdates: any = {}) => {
    try {
      const { error } = await supabase
        .from("orders")
        .update({ order_status: newStatus, status: newStatus, ...extraUpdates })
        .eq("id", orderId);
      if (error) alert("Error: " + error.message);
      else fetchOrders();
    } catch {
      alert("Update failed");
    }
  };

  const approvePayment = async (order: any) => {
    await updateStatus(order.id, "current", {
      payment_status: "paid",
      remaining_amount: 0,
      paid_amount: order.total_amount,
    });
  };

  // Print Slip
  const printSlip = (order: any) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    const itemsHtml = (order.items || [])
      .map(
        (it: any) =>
          `<tr><td style="padding:4px 0;">${it.name || it.product_name || "Item"} x ${it.quantity || 1}</td><td style="text-align:right;">₹${(it.price || it.unit_price || 0) * (it.quantity || 1)}</td></tr>`
      )
      .join("");

    printWindow.document.write(`<html><head><title>Order #${order.order_number || order.id?.slice(0, 8)}</title><style>body{font-family:monospace;font-size:12px;max-width:300px;margin:0 auto;padding:12px;}.border{border-top:1px dashed #000;border-bottom:1px dashed #000;margin:8px 0;padding:6px 0;}table{width:100%;border-collapse:collapse;}</style></head><body><center><h2 style="margin:0;">QUICKPIN</h2><p style="margin:2px 0;">Delivery Slip</p></center><div class="border"><div>Order: #${order.order_number || order.id?.slice(0, 8)}</div><div>Date: ${new Date(order.created_at).toLocaleString("en-IN")}</div><div>Customer: ${order.profile?.name || "N/A"} (${order.profile?.phone || "N/A"})</div><div>Address: ${order.profile?.address || order.delivery_address || "Pickup"}</div></div><table><tbody>${itemsHtml}</tbody></table><div class="border"><table><tr><td>Total:</td><td style="text-align:right;">₹${order.total_amount || 0}</td></tr><tr><td>Paid:</td><td style="text-align:right;">₹${order.paid_amount || 0}</td></tr><tr><td><strong>Remaining:</strong></td><td style="text-align:right;"><strong>₹${order.remaining_amount || 0}</strong></td></tr></table></div><center><p style="margin:6px 0;">Thank you!</p></center><script>window.print();</script></body></html>`);
    printWindow.document.close();
  };
        return (
    <div className="space-y-4 pb-12">
      {/* 1. Date & Picklist Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 bg-slate-50 outline-none"
            />
            <button
              onClick={() => setSelectedDate(todayIST)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold ${
                selectedDate === todayIST ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setSelectedDate(yesterdayIST)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold ${
                selectedDate === yesterdayIST ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"
              }`}
            >
              Yesterday
            </button>
          </div>

          <button
            onClick={() => setPicklistOpen(true)}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold"
          >
            <span>📋 Master Picklist</span>
            <span className="bg-emerald-800 text-[10px] px-1.5 py-0.5 rounded-full">
              {currentOrders.length}
            </span>
          </button>
        </div>

        {/* 2. 4 Delivery Modes */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-t border-slate-100 pt-2.5">
          {[
            { id: "all", label: "All Modes" },
            { id: "home_full", label: "🏠 Home Full" },
            { id: "home_adv", label: "🏠 Home Advance" },
            { id: "self_full", label: "🏪 Self Full" },
            { id: "self_adv", label: "🏪 Self Advance" },
          ].map((mode) => (
            <button
              key={mode.id}
              onClick={() => setActiveMode(mode.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap ${
                activeMode === mode.id ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. 7 Status Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {[
          { id: "all", label: "All Orders", count: statusCounts.all },
          { id: "pending", label: "Pending", count: statusCounts.pending },
          { id: "current", label: "Current", count: statusCounts.current },
          { id: "out_for_delivery", label: "Out for Delivery", count: statusCounts.out_for_delivery },
          { id: "delivered", label: "Delivered", count: statusCounts.delivered },
          { id: "refund", label: "Refund", count: statusCounts.refund },
          { id: "spam", label: "Spam", count: statusCounts.spam },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveStatus(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap ${
              activeStatus === tab.id
                ? "bg-slate-900 text-white"
                : "bg-white text-slate-600 border border-slate-200"
            }`}
          >
            <span>{tab.label}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full font-black bg-slate-100 text-slate-600">
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* 4. Orders List */}
      {loading ? (
        <div className="bg-white rounded-2xl border p-8 text-center text-xs font-semibold text-slate-500">
          অর্ডার লোড হচ্ছে...
        </div>
      ) : finalFilteredOrders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center space-y-1">
          <p className="text-2xl">📦</p>
          <p className="text-xs font-bold text-slate-700">এই ফিল্টারে কোনো অর্ডার পাওয়া যায়নি</p>
        </div>
      ) : (
        <div className="space-y-3">
          {finalFilteredOrders.map((order) => {
            const isPending = (order.order_status || order.status) === "pending";
            const isCurrent = ["current", "accepted", "processing"].includes(order.order_status || order.status);
            const isOut = (order.order_status || order.status) === "out_for_delivery";

            return (
              <div key={order.id} className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
                <div className="flex items-start justify-between border-b pb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-900">
                        #{order.order_number || order.id?.slice(0, 8)}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 uppercase">
                        {order.delivery_type || "Delivery"}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {order.profile?.name} • {order.profile?.phone}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-slate-900">₹{order.total_amount || 0}</p>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      {Number(order.remaining_amount || 0) <= 0 ? "Paid Full" : `Due: ₹${order.remaining_amount}`}
                    </span>
                  </div>
                </div>

                {/* Items */}
                <div className="bg-slate-50 rounded-xl p-2.5 space-y-1">
                  {(order.items || []).map((it: any, idx: number) => (
                    <div key={idx} className="flex justify-between text-xs text-slate-700">
                      <span>{it.name || it.product_name} × {it.quantity || 1}</span>
                      <span className="font-bold">₹{(it.price || it.unit_price || 0) * (it.quantity || 1)}</span>
                    </div>
                  ))}
                </div>

                {/* Screenshot Verification */}
                {order.payment_screenshot && (
                  <div className="flex items-center justify-between bg-blue-50 p-2 rounded-xl text-xs">
                    <span className="font-semibold text-blue-900">Payment Screenshot</span>
                    <button
                      onClick={() => setScreenshotPreview(order.payment_screenshot)}
                      className="text-blue-600 font-bold hover:underline"
                    >
                      View Screenshot 👁️
                    </button>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => printSlip(order)}
                      className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold"
                    >
                      🖨️ Print
                    </button>
                    <button
                      onClick={() => setRefundOrder(order)}
                      className="px-2.5 py-1.5 rounded-xl border border-rose-200 text-rose-600 text-xs font-bold"
                    >
                      🔄 Refund
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {isPending && (
                      <button
                        onClick={() => approvePayment(order)}
                        className="px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold"
                      >
                        ✓ Approve
                      </button>
                    )}
                    {isCurrent && (
                      <button
                        onClick={() => updateStatus(order.id, "out_for_delivery")}
                        className="px-3 py-1.5 rounded-xl bg-amber-500 text-white text-xs font-bold"
                      >
                        🚚 Out for Delivery
                      </button>
                    )}
                    {isOut && (
                      <button
                        onClick={() => updateStatus(order.id, "delivered")}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold"
                      >
                        ✓ Delivered
                      </button>
                    )}
                    {isPending && (
                      <button
                        onClick={() => updateStatus(order.id, "spam")}
                        className="px-2.5 py-1.5 rounded-xl text-rose-500 text-xs font-bold"
                      >
                        ✕ Reject
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. Master Picklist Modal */}
      {picklistOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-black text-slate-900 text-sm">📋 Master Picklist ({selectedDate})</h3>
              <button onClick={() => setPicklistOpen(false)}>✕</button>
            </div>
            <div className="overflow-y-auto flex-1 space-y-2">
              {currentOrders.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6">Current Orders-এ কোনো অর্ডার নেই</p>
              ) : (
                (() => {
                  const aggregated: Record<string, number> = {};
                  currentOrders.forEach((o) => {
                    (o.items || []).forEach((it: any) => {
                      const name = it.name || it.product_name || "Item";
                      aggregated[name] = (aggregated[name] || 0) + (it.quantity || 1);
                    });
                  });
                  return Object.entries(aggregated).map(([name, qty]) => (
                    <div key={name} className="flex justify-between p-2 rounded-xl bg-slate-50 text-xs font-bold">
                      <span>{name}</span>
                      <span className="text-blue-600 font-mono">× {qty}</span>
                    </div>
                  ));
                })()
              )}
            </div>
            <button
              onClick={() => setPicklistOpen(false)}
              className="w-full py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
            >
              Close Picklist
            </button>
          </div>
        </div>
      )}

      {/* 6. Refund Modal */}
      {refundOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-black text-slate-900 text-sm">
                🔄 Refund #{refundOrder.order_number || refundOrder.id?.slice(0, 8)}
              </h3>
              <button onClick={() => setRefundOrder(null)}>✕</button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const amount = Number((form.elements.namedItem("refund_amount") as HTMLInputElement).value);
                const reason = (form.elements.namedItem("refund_reason") as HTMLSelectElement).value;

                await supabase.from("orders").update({
                  refund_amount: amount,
                  refund_reason: reason,
                  order_status: "refund",
                  status: "refund",
                }).eq("id", refundOrder.id);

                setRefundOrder(null);
                fetchOrders();
              }}
              className="space-y-3 text-xs font-bold"
            >
              <div>
                <label>Refund Amount (₹)</label>
                <input
                  name="refund_amount"
                  type="number"
                  max={refundOrder.total_amount}
                  defaultValue={refundOrder.total_amount}
                  required
                  className="w-full border rounded-xl p-2 mt-1"
                />
              </div>
              <div>
                <label>Reason</label>
                <select name="refund_reason" className="w-full border rounded-xl p-2 mt-1">
                  <option value="Damaged Mal">Rotten / Damaged Mal</option>
                  <option value="Missing Item">Missing Item</option>
                  <option value="Weight Shortage">Weight Shortage</option>
                  <option value="Customer Cancellation">Customer Cancellation</option>
                </select>
              </div>
              <button type="submit" className="w-full py-2 bg-rose-600 text-white rounded-xl font-bold">
                Process Refund
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 7. Screenshot Lightbox */}
      {screenshotPreview && (
        <div
          onClick={() => setScreenshotPreview(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
        >
          <div className="max-w-md w-full bg-white rounded-2xl p-2">
            <img
              src={screenshotPreview}
              alt="Payment Screenshot"
              className="w-full h-auto max-h-[80vh] object-contain rounded-xl"
            />
            <p className="text-center text-xs font-bold text-slate-500 py-2">Tap to close</p>
          </div>
        </div>
      )}
    </div>
  );
              }
      
