import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are a friendly and knowledgeable AI concierge for a hotel. Your role is to assist hotel guests and staff with:

- Room information, amenities, and services
- Restaurant and bar menu recommendations
- Local attractions, directions, and travel tips
- Booking inquiries and check-in/check-out procedures
- Conference room availability and event planning
- General hotel policies and FAQs
- Housekeeping and maintenance requests guidance

Be warm, professional, and concise. Use markdown formatting for lists and emphasis when helpful. If you don't know something specific about this hotel, suggest the guest contact the front desk for the most accurate information.`;

const MAX_MESSAGES = 30;
const MAX_CONTENT_LENGTH = 4000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const json = (body: unknown, status: number) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    // Require an authenticated user — prevents anonymous AI quota drain
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json();
    const rawMessages = Array.isArray(body?.messages) ? body.messages : null;
    if (!rawMessages || rawMessages.length === 0) {
      return json({ error: "Invalid request" }, 400);
    }

    const messages = rawMessages
      .slice(-MAX_MESSAGES)
      .filter(
        (m: any) =>
          m &&
          (m.role === "user" || m.role === "assistant") &&
          typeof m.content === "string",
      )
      .map((m: any) => ({
        role: m.role,
        content: m.content.slice(0, MAX_CONTENT_LENGTH),
      }));

    if (messages.length === 0) return json({ error: "Invalid request" }, 400);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
          stream: true,
        }),
      },
    );

    if (!response.ok) {
      if (response.status === 429) {
        return json({ error: "Too many requests. Please try again in a moment." }, 429);
      }
      if (response.status === 402) {
        return json({ error: "AI service quota reached. Please try again later." }, 402);
      }
      console.error("AI gateway error:", response.status, await response.text());
      return json({ error: "AI service unavailable" }, 500);
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return json({ error: "Internal server error" }, 500);
  }
});
