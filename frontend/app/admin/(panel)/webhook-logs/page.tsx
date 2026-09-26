"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

interface WebhookLog {
  id: string;
  raw_sms: string | null;
  parsed_amount: number | null;
  parsed_utr: string | null;
  created_at: string;
}

export default function WebhookLogsPage() {
  const supabase = useMemo(() => createClient(), []);

  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("webhook_logs")
      .select("id, raw_sms, parsed_amount, parsed_utr, created_at")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      console.error(error);
    } else {
      setLogs((data as WebhookLog[]) || []);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    } catch (err) {
      console.error(err);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const filteredLogs = useMemo(() => {
    if (!searchQuery.trim()) return logs;
    const q = searchQuery.toLowerCase().trim();
    return logs.filter(
      (log) =>
        log.parsed_utr?.toLowerCase().includes(q) ||
        log.raw_sms?.toLowerCase().includes(q) ||
        String(log.parsed_amount || "").includes(q)
    );
  }, [logs, searchQuery]);

  const totalParsed = useMemo(() => {
    return logs.reduce((sum, log) => sum + (log.parsed_amount || 0), 0);
  }, [logs]);

  return (
    <div className="space-y-4 pb-20">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Webhook Logs</h1>
          <p className="text-sm text-gray-500 mt-1">
            Payment webhook history
          </p>
        </div>
        <button
          onClick={fetchLogs}
          disabled={loading}
          className="text-xs bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-medium px-3 py-2 rounded-lg transition disabled:opacity-50"
        >
          🔄 Refresh
        </button>
      </div>

      {/* Stats */}
      {!loading && logs.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl px-4 py-3 border border-gray-100">
            <p className="text-xs text-gray-400 mb-1">Total Logs</p>
            <p className="text-xl font-bold text-blue-600">{logs.length}</p>
          </div>
          <div className="bg-white rounded-xl px-4 py-3 border border-gray-100">
            <p className="text-xs text-gray-400 mb-1">Total Parsed</p>
            <p className="text-xl font-bold text-green-600">
              ₹{totalParsed.toLocaleString("en-IN")}
            </p>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="bg-white rounded-xl p-2 shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 px-2">
          <span className="text-lg">🔍</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by UTR, amount, or SMS..."
            className="flex-1 py-2 text-sm bg-transparent outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <div className="text-6xl mb-4">🔗</div>
          <h2 className="text-lg font-semibold text-gray-700 mb-1">
            No webhook logs
          </h2>
          <p className="text-sm text-gray-500">
            {searchQuery
              ? "এই search-এ কোনো log নেই"
              : "Payment webhook এলে এখানে দেখা যাবে"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredLogs.map((log) => {
            const isExpanded = expandedId === log.id;
            return (
              <div
                key={log.id}
                className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
              >
                {/* Header Row */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : log.id)}
                  className="w-full text-left p-3 hover:bg-gray-50 transition"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {log.parsed_amount !== null && (
                          <span className="text-sm font-bold text-green-600">
                            ₹{log.parsed_amount.toLocaleString("en-IN")}
                          </span>
                        )}
                        {log.parsed_utr && (
                          <span className="text-xs font-mono bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                            UTR: {log.parsed_utr}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        📅 {formatDate(log.created_at)}
                      </p>
                    </div>
                    <span className="text-xs text-gray-400 shrink-0">
                      {isExpanded ? "▲" : "▼"}
                    </span>
                  </div>
                </button>

                {/* Expanded: Raw SMS */}
                {isExpanded && log.raw_sms && (
                  <div className="border-t border-gray-100 p-3 bg-gray-50">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        📩 Raw SMS
                      </p>
                      <button
                        onClick={() => copyToClipboard(log.raw_sms!, log.id)}
                        className="text-xs bg-white hover:bg-gray-100 border border-gray-200 text-gray-600 px-2 py-1 rounded transition"
                      >
                        {copied === log.id ? "✅ Copied" : "📋 Copy"}
                      </button>
                    </div>
                    <pre className="text-xs text-gray-700 whitespace-pre-wrap break-words font-mono bg-white p-3 rounded-lg border border-gray-100">
                      {log.raw_sms}
                    </pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
      }
