"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { data, error: loginError } = await supabase.auth.signInWithPassword({ email, password });

    if (loginError || !data.user) {
      setError(loginError?.message || "登入失敗，請再試一次。");
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from("egg_creator_profiles")
      .select("onboarding_completed")
      .eq("user_id", data.user.id)
      .maybeSingle();

    router.push(profile?.onboarding_completed ? "/dashboard" : "/onboarding");
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f7f5] px-4 py-12">
      <section className="w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/soon-egg.png" alt="SOON-EGG" className="h-12 w-auto object-contain" />
        </div>
        <h1 className="text-center text-2xl font-black text-zinc-950">登入 SOON-EGG</h1>
        <p className="mt-2 text-center text-sm text-zinc-500">登入後會按您的設定進度前往 onboarding 或 dashboard。</p>
        <form onSubmit={handleLogin} className="mt-6 space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            className="w-full rounded-2xl border border-zinc-200 px-4 py-3 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            className="w-full rounded-2xl border border-zinc-200 px-4 py-3 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
          {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-blue-500 px-4 py-3 font-semibold text-white transition-colors hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? "登入中..." : "登入"}
          </button>
        </form>
        <p className="mt-5 text-center text-sm text-zinc-500">
          還沒有帳戶？ <Link href="/signup" className="font-semibold text-zinc-950">免費開始</Link>
        </p>
      </section>
    </main>
  );
}
