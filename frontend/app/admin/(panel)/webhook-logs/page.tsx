"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type WebhookLog = {
  id: string;
  raw_sms: string | null;
  parsed_amount: number | null;
  parsed_utr: string | null;
  received_at: string;
  matched_order_id: string | null;
  status: string;
  ip_address: string | null;
};

export default function AdminWebhookLogsPage() {
  const supabase = createClient();
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "matched" | "unmatched" | "duplicate">("all");

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      let query = supabase
        .from("webhook_logs")
        .select("*")
        .order("received_at", { ascending: false })
        .limit(200);

      if (filter !== "all") query = query.eq("status", filter);

      const { data } = await query;
      setLogs(data || []);
      setLoading(false);
    };
    fetchLogs();
  }, [supabase, filter]);

  const getStatusColor = (status: string) => {
    if (status === "matched") return "bg-green-100 text-green-700";
    if (status === "unmatched") return "bg-yellow-100 text-yellow-700";
    if (status === "duplicate") return "bg-red-100 text-red-700";
    return "bg-gray-100 text-gray-700";
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-2">Webhook Logs</h1>
      <p className="text-sm text-gray-500 mb-6">
        SMS Forwarder থেকে আসা সব payment notification এর log
      </p>

      <div className="flex flex-wrap gap-2 mb-4">
        {(["all", "matched", "unmatched", "duplicate"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-sm rounded-lg font-medium capitalize ${
              filter === f
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-700 border border-gray-200"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : logs.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center text-gray-500">
          <p className="text-4xl mb-3">📭</p>
          <p className="text-sm">No webhook logs yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <div key={log.id} className="bg-white rounded-xl p-4 border border-gray-200">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500">
                    {new Date(log.received_at).toLocaleString("en-IN")}
                  </p>
                  {log.ip_address && (
                    <p className="text-xs text-gray-400">IP: {log.ip_address}</p>
                  )}
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded-full font-medium flex-shrink-0 ${getStatusColor(log.status)}`}
                >
                  {log.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
                <div className="bg-gray-50 rounded-lg p-2">
                  <p className="text-xs text-gray-500 mb-1">Amount</p>
                  <p className="font-medium text-gray-800">
                    {log.parsed_amount ? `₹${log.parsed_amount}` : "—"}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-2">
                  <p className="text-xs text-gray-500 mb-1">UTR</p>
                  <p className="font-medium text-gray-800 text-xs truncate">
                    {log.parsed_utr || "—"}
                  </p>
                </div>
              </div>

              {log.raw_sms && (
                <details className="text-xs">
                  <summary className="cursor-pointer text-blue-600 font-medium">
                    View Raw SMS
                  </summary>
                  <div className="mt-2 bg-gray-50 rounded-lg p-2 text-gray-700 whitespace-pre-wrap break-words">
                    {log.raw_sms}
                  </div>
                </details>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
