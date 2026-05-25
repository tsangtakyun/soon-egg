import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

function loginUrl(req: Request) {
  return new URL("/login", process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin);
}

export async function POST(req: Request) {
  const supabase = await createClient();
  await supabase?.auth.signOut();
  return NextResponse.redirect(loginUrl(req), 303);
}

export async function GET(req: Request) {
  const supabase = await createClient();
  await supabase?.auth.signOut();
  return NextResponse.redirect(loginUrl(req));
}
