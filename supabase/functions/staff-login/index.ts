import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { staff_code } = await req.json();

    if (!staff_code || typeof staff_code !== "string" || staff_code.length < 3 || staff_code.length > 20) {
      return new Response(
        JSON.stringify({ error: "Invalid staff code" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Look up staff by code
    const { data: staffData, error: lookupError } = await supabaseAdmin.rpc(
      "lookup_staff_by_code",
      { _staff_code: staff_code.trim().toUpperCase() }
    );

    if (lookupError || !staffData || staffData.length === 0) {
      return new Response(
        JSON.stringify({ error: "Invalid staff code" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const staff = staffData[0];

    if (!staff.is_active) {
      return new Response(
        JSON.stringify({ error: "This staff account is deactivated" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if a user account already exists for this staff member
    // We use a deterministic email based on staff_id
    const staffEmail = `staff-${staff.staff_id}@internal.local`;
    const staffPassword = `staff-${staff.staff_id}-${staff_code}`;

    // Try to sign in first
    const { data: signInData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
      email: staffEmail,
      password: staffPassword,
    });

    if (signInData?.session) {
      // Update profile with current company
      await supabaseAdmin
        .from("profiles")
        .update({ current_company_id: staff.company_id })
        .eq("user_id", signInData.user.id);

      return new Response(
        JSON.stringify({
          session: signInData.session,
          staff: {
            full_name: staff.full_name,
            department: staff.department,
            role: staff.role,
            company_name: staff.company_name,
            company_id: staff.company_id,
          },
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // User doesn't exist yet, create one
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: staffEmail,
      password: staffPassword,
      email_confirm: true,
      user_metadata: { full_name: staff.full_name },
    });

    if (createError || !newUser.user) {
      console.error("Create user error:", createError);
      return new Response(
        JSON.stringify({ error: "Failed to create staff account" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Link staff record to user
    await supabaseAdmin
      .from("company_staff")
      .update({ user_id: newUser.user.id })
      .eq("id", staff.staff_id);

    // Add as company member
    await supabaseAdmin.from("company_members").upsert({
      company_id: staff.company_id,
      user_id: newUser.user.id,
      role: staff.role,
    }, { onConflict: "company_id,user_id" }).select();

    // Set current company
    await supabaseAdmin
      .from("profiles")
      .update({ current_company_id: staff.company_id })
      .eq("user_id", newUser.user.id);

    // Now sign in
    const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.signInWithPassword({
      email: staffEmail,
      password: staffPassword,
    });

    if (sessionError || !sessionData.session) {
      return new Response(
        JSON.stringify({ error: "Failed to authenticate" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        session: sessionData.session,
        staff: {
          full_name: staff.full_name,
          department: staff.department,
          role: staff.role,
          company_name: staff.company_name,
          company_id: staff.company_id,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Staff login error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
