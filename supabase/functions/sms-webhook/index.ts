import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-webhook-secret",
};

type ParsedSMS = {
  amount: number | null;
  utr: string | null;
  type: "credit" | "debit" | "unknown";
};

function parseSMS(text: string): ParsedSMS {
  const result: ParsedSMS = { amount: null, utr: null, type: "unknown" };

  // Determine credit / debit
  if (/credited|received|deposit|credit/i.test(text)) {
    result.type = "credit";
  } else if (/debited|withdrawn|debit|sent|paid/i.test(text)) {
    result.type = "debit";
  }

  // Amount patterns:
  // Rs.500.00 / Rs 500 / INR 500.00 / ₹500.50 / Rs.1,500.00
  const amountPatterns = [
    /(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{1,2})?)/i,
    /([\d,]+(?:\.\d{1,2})?)\s*(?:Rs\.?|INR|₹)/i,
  ];

  for (const pattern of amountPatterns) {
    const match = text.match(pattern);
    if (match) {
      const cleaned = match[1].replace(/,/g, "");
      const num = parseFloat(cleaned);
      if (!isNaN(num) && num > 0) {
        result.amount = num;
        break;
      }
    }
  }

  // UTR patterns:
  // UPI Ref No 123456789012 / UTR: 123456789012 / Ref No. 123456789012
  // UPI:xxxx@xxx Ref: 123456789 / Txn ID: xxxx / RRN: 123456789
  const utrPatterns = [
    /(?:UTR|UPI\s*Ref(?:\s*No)?|Ref(?:erence)?\s*No|Txn\s*ID|RRN)[\s:.\-]*([A-Za-z0-9]{8,20})/i,
    /UPI:([^\s]+)/i,
  ];

  for (const pattern of utrPatterns) {
    const match = text.match(pattern);
    if (match) {
      result.utr = match[1].trim();
      break;
    }
  }

  return result;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const body = await req.json();

    // SMS Forwarder typically sends: { from, text, sentStamp, receivedStamp }
    // We accept: { message, sender, timestamp } OR { text, from } OR raw
    const smsText: string = body.message || body.text || body.sms || "";
    const sender: string = body.sender || body.from || "";
    const receivedAt: string =
      body.receivedStamp || body.timestamp || new Date().toISOString();

    if (!smsText) {
      await supabase.from("webhook_logs").insert({
        raw_sms: JSON.stringify(body),
        status: "unmatched",
        ip_address: req.headers.get("x-forwarded-for") || null,
      });
      return new Response(JSON.stringify({ error: "No SMS text found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify webhook secret
    const { data: secretData } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "webhook_secret")
      .single();

    const expectedSecret = secretData?.value;
    const providedSecret =
      req.headers.get("x-webhook-secret") ||
      body.secret ||
      new URL(req.url).searchParams.get("secret");

    if (expectedSecret && expectedSecret !== "change-me-please") {
      if (providedSecret !== expectedSecret) {
        await supabase.from("webhook_logs").insert({
          raw_sms: smsText,
          status: "unmatched",
          ip_address: req.headers.get("x-forwarded-for") || null,
        });
        return new Response(JSON.stringify({ error: "Invalid secret" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Parse SMS
    const parsed = parseSMS(smsText);
    const ip = req.headers.get("x-forwarded-for") || null;

    // Only process credit transactions
    if (parsed.type !== "credit" || !parsed.amount) {
      const { data: log } = await supabase
        .from("webhook_logs")
        .insert({
          raw_sms: smsText,
          parsed_amount: parsed.amount,
          parsed_utr: parsed.utr,
          received_at: receivedAt,
          status: "unmatched",
          ip_address: ip,
        })
        .select()
        .single();

      return new Response(
        JSON.stringify({
          success: false,
          reason: parsed.type !== "credit" ? "Not a credit SMS" : "No amount parsed",
          log_id: log?.id,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check if UTR already used (avoid duplicates)
    if (parsed.utr) {
      const { data: existing } = await supabase
        .from("orders")
        .select("id")
        .eq("upi_transaction_id", parsed.utr)
        .maybeSingle();

      if (existing) {
        await supabase.from("webhook_logs").insert({
          raw_sms: smsText,
          parsed_amount: parsed.amount,
          parsed_utr: parsed.utr,
          received_at: receivedAt,
          matched_order_id: existing.id,
          status: "duplicate",
          ip_address: ip,
        });

        return new Response(
          JSON.stringify({ success: false, reason: "Duplicate UTR" }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    // Find matching order:
    // - payment_status = 'pending'
    // - created within last 45 minutes
    // - total_amount OR partial_payment_amount = parsed amount
    const fortyFiveMinAgo = new Date(Date.now() - 45 * 60 * 1000).toISOString();

    const { data: candidates } = await supabase
      .from("orders")
      .select("id, order_number, total_amount, partial_payment_amount, payment_type")
      .eq("payment_status", "pending")
      .gte("created_at", fortyFiveMinAgo)
      .order("created_at", { ascending: false });

    const matchingOrders = (candidates || []).filter((o) => {
      const expectedAmount =
        o.payment_type === "partial"
          ? Number(o.partial_payment_amount)
          : Number(o.total_amount);
      return Math.abs(expectedAmount - parsed.amount!) < 0.5;
    });

    if (matchingOrders.length === 0) {
      await supabase.from("webhook_logs").insert({
        raw_sms: smsText,
        parsed_amount: parsed.amount,
        parsed_utr: parsed.utr,
        received_at: receivedAt,
        status: "unmatched",
        ip_address: ip,
      });

      return new Response(
        JSON.stringify({ success: false, reason: "No matching order" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (matchingOrders.length > 1) {
      await supabase.from("webhook_logs").insert({
        raw_sms: smsText,
        parsed_amount: parsed.amount,
        parsed_utr: parsed.utr,
        received_at: receivedAt,
        status: "unmatched",
        ip_address: ip,
      });

      return new Response(
        JSON.stringify({
          success: false,
          reason: "Multiple matching orders — needs manual review",
          count: matchingOrders.length,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const matchedOrder = matchingOrders[0];

    // Update order: payment success + order status current
    const { error: updateError } = await supabase
      .from("orders")
      .update({
        payment_status: "success",
        payment_verified_by: "auto_webhook",
        payment_verified_at: new Date().toISOString(),
        upi_transaction_id: parsed.utr,
        paid_amount: parsed.amount,
        screenshot_status: "approved",
        order_status: "current",
        status_changed_at: new Date().toISOString(),
      })
      .eq("id", matchedOrder.id);

    if (updateError) {
      await supabase.from("webhook_logs").insert({
        raw_sms: smsText,
        parsed_amount: parsed.amount,
        parsed_utr: parsed.utr,
        received_at: receivedAt,
        status: "unmatched",
        ip_address: ip,
      });

      return new Response(
        JSON.stringify({ success: false, error: updateError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Log success
    await supabase.from("webhook_logs").insert({
      raw_sms: smsText,
      parsed_amount: parsed.amount,
      parsed_utr: parsed.utr,
      received_at: receivedAt,
      matched_order_id: matchedOrder.id,
      status: "matched",
      ip_address: ip,
    });

    return new Response(
      JSON.stringify({
        success: true,
        order_number: matchedOrder.order_number,
        amount: parsed.amount,
        utr: parsed.utr,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
