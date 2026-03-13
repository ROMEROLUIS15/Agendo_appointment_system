import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import type { EmailOtpType, User } from "@supabase/supabase-js";

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

export async function GET(request: Request) {
  const { searchParams, origin: requestOrigin } = new URL(request.url);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? requestOrigin;
  const next = searchParams.get("next") ?? "/dashboard";
  const isSignup = searchParams.get("intent") === "signup";
  const supabase = await createClient();

  const code = searchParams.get("code");
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      if (isSignup) {
        await handleGoogleSignup(data.user);
        return NextResponse.redirect(`${siteUrl}/dashboard/setup`);
      }
      const result = await handleUserSession(data.user);
      if (result === "not_registered") {
        await supabase.auth.signOut();
        return NextResponse.redirect(
          `${siteUrl}/register?error=google_not_registered`,
        );
      }
      return NextResponse.redirect(`${siteUrl}${next}`);
    }
    return NextResponse.redirect(`${siteUrl}/login?error=auth_failed`);
  }

  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  if (token_hash && type) {
    const { data, error } = await supabase.auth.verifyOtp({ token_hash, type });
    if (!error && data.user) {
      return NextResponse.redirect(`${siteUrl}${next}`);
    }
    return NextResponse.redirect(
      `${siteUrl}/login?error=email_confirmation_failed`,
    );
  }

  return NextResponse.redirect(`${siteUrl}/login?error=auth_failed`);
}

type SessionResult = "ok" | "not_registered";

async function handleUserSession(user: User): Promise<SessionResult> {
  const admin = getAdminClient();
  const { data: dbUser } = await admin
    .from("users")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();
  if (dbUser) return "ok";
  const provider = user.app_metadata?.provider as string | undefined;
  if (provider === "email") return "ok";
  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteError) {
    console.error(
      "[auth/callback] Failed to delete unregistered OAuth user:",
      deleteError.message,
    );
  }
  return "not_registered";
}

async function handleGoogleSignup(user: User): Promise<void> {
  const admin = getAdminClient();
  const { data: existing } = await admin
    .from("users")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();
  if (existing) return;
  const fullName = user.user_metadata?.full_name as string | undefined;
  const email = user.email ?? "";
  const name = fullName ?? email.split("@")[0];
  await admin.from("users").insert({
    id: user.id,
    email,
    name,
    role: "owner",
    business_id: null,
  });
}
