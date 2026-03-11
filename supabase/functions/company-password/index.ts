import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as encodeBase64 } from "https://deno.land/std@0.208.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Simple hash using Web Crypto (SHA-256 + salt)
async function hashPassword(password: string, salt?: string): Promise<{ hash: string; salt: string }> {
  const s = salt || crypto.randomUUID();
  const data = new TextEncoder().encode(s + password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = new Uint8Array(hashBuffer);
  const hash = encodeBase64(hashArray);
  return { hash: `${s}:${hash}`, salt: s };
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt] = stored.split(":");
  const { hash } = await hashPassword(password, salt);
  return hash === stored;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Unauthorized");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    // ACTION: set_password — called during company registration
    if (action === "set_password") {
      const { company_id, password } = await req.json();
      if (!company_id || !password) throw new Error("Missing company_id or password");
      if (password.length < 4) throw new Error("Password must be at least 4 characters");

      // Verify the user is the owner
      const { data: company } = await admin
        .from("companies")
        .select("owner_id")
        .eq("id", company_id)
        .single();

      if (!company || company.owner_id !== user.id) {
        throw new Error("Forbidden: only the owner can set the company password");
      }

      const { hash } = await hashPassword(password);
      await admin
        .from("companies")
        .update({ switch_password_hash: hash })
        .eq("id", company_id);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ACTION: verify_password — called when switching companies
    if (action === "verify_password") {
      const { company_id, password } = await req.json();
      if (!company_id || !password) throw new Error("Missing company_id or password");

      // Verify the user is a member
      const { data: member } = await admin
        .from("company_members")
        .select("id")
        .eq("company_id", company_id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!member) throw new Error("Not a member of this company");

      const { data: company } = await admin
        .from("companies")
        .select("switch_password_hash")
        .eq("id", company_id)
        .single();

      if (!company?.switch_password_hash) {
        // No password set — allow
        return new Response(JSON.stringify({ verified: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const valid = await verifyPassword(password, company.switch_password_hash);
      return new Response(JSON.stringify({ verified: valid }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Unknown action");
  } catch (err) {
    const status = err.message === "Unauthorized" ? 401 : err.message?.startsWith("Forbidden") ? 403 : 400;
    return new Response(JSON.stringify({ error: err.message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
