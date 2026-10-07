import { createHmac } from "node:crypto";
import { NextResponse } from "next/server";
import { createEggAdmin } from "@/lib/creator-workspace";
import { createClient } from "@/lib/supabase/server";

function anonymizedKey(kind: "email" | "ip", value: string, pepper: string) {
  return createHmac("sha256", pepper).update(`${kind}:${value}`).digest("hex");
}

async function consumeLoginLimit(keyHash: string, windowSeconds: number, limit: number) {
  const admin = createEggAdmin();
  const { data, error } = await admin.rpc("consume_egg_login_rate_limit", {
    p_key_hash: keyHash,
    p_window_seconds: windowSeconds,
    p_limit: limit,
  });
  if (error || !data?.[0]) throw error ?? new Error("login_rate_limit_backend_unavailable");
  return data[0] as { allowed: boolean; retry_after_seconds: number };
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as { email?: unknown; password?: unknown };
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!email || !password) return NextResponse.json({ error: "請輸入電郵及密碼。" }, { status: 400 });

  if (process.env.EGG_LOGIN_RATE_LIMIT_ENABLED === "true") {
    const pepper = process.env.EGG_LOGIN_RATE_LIMIT_PEPPER?.trim();
    if (!pepper) {
      return NextResponse.json({ error: "登入服務暫時未能確認使用限額。" }, { status: 503 });
    }
    const ip = (request.headers.get("x-forwarded-for") ?? "unknown").split(",")[0]!.trim();
    try {
      const [identityLimit, ipLimit] = await Promise.all([
        consumeLoginLimit(anonymizedKey("email", email, pepper), 60, 5),
        consumeLoginLimit(anonymizedKey("ip", ip, pepper), 3600, 30),
      ]);
      if (!identityLimit.allowed || !ipLimit.allowed) {
        const retryAfter = Math.max(identityLimit.retry_after_seconds, ipLimit.retry_after_seconds, 1);
        return NextResponse.json(
          { error: "登入嘗試太頻密，請稍後再試。" },
          { status: 429, headers: { "Retry-After": String(retryAfter) } },
        );
      }
    } catch (error) {
      console.error("[login] rate-limit backend unavailable", error instanceof Error ? error.name : "unknown_error");
      return NextResponse.json({ error: "登入服務暫時未能確認使用限額。" }, { status: 503 });
    }
  }

  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "登入服務暫時不可用。" }, { status: 503 });
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    return NextResponse.json({ error: "登入失敗，請檢查電郵及密碼。" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("egg_creator_profiles")
    .select("onboarding_completed")
    .eq("user_id", data.user.id)
    .limit(1)
    .maybeSingle();
  return NextResponse.json({
    success: true,
    next: profile?.onboarding_completed ? "/dashboard" : "/onboarding",
  });
}
