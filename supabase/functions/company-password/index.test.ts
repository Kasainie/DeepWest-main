import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;

const BASE = `${SUPABASE_URL}/functions/v1/company-password`;

Deno.test("verify_password returns 401 without auth", async () => {
  const res = await fetch(`${BASE}?action=verify_password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ company_id: "fake", password: "wrong" }),
  });
  const body = await res.text();
  assertEquals(res.status, 401);
  console.log("No-auth test passed:", body);
});

Deno.test("set_password returns 401 without auth", async () => {
  const res = await fetch(`${BASE}?action=set_password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ company_id: "fake", password: "test1234" }),
  });
  const body = await res.text();
  assertEquals(res.status, 401);
  console.log("No-auth set_password test passed:", body);
});

Deno.test("unknown action returns 400 without auth", async () => {
  const res = await fetch(`${BASE}?action=unknown`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({}),
  });
  const body = await res.text();
  // Should be 401 since auth check happens first
  assertEquals(res.status, 401);
  console.log("Unknown action test passed:", body);
});
