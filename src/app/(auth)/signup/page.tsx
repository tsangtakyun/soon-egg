"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const [creatorName, setCreatorName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSignup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error: signupError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: creatorName },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding`,
      },
    });

    setLoading(false);

    if (signupError) {
      setError(signupError.message);
      return;
    }

    router.push("/onboarding");
  };

  const handleGoogleSignup = async () => {
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/onboarding`,
      },
    });

    if (oauthError) {
      setError(oauthError.message);
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f7f5] px-4 py-12">
      <section className="w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/soon-egg.png" alt="SOON-EGG" className="h-12 w-auto object-contain" />
        </div>
        <h1 className="text-center text-2xl font-black text-zinc-950">建立 SOON-EGG 帳戶</h1>
        <p className="mt-2 text-center text-sm text-zinc-500">先建立帳戶，再開始設定您的創作者主頁。</p>

        <button
          type="button"
          onClick={handleGoogleSignup}
          disabled={loading}
          className="mt-6 flex w-full items-center justify-center gap-3 rounded-2xl border border-gray-200 py-3 transition-colors hover:bg-gray-50 disabled:opacity-50"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="https://cdn.simpleicons.org/google" alt="Google" className="h-5 w-5" />
          <span className="text-sm font-medium text-gray-700">使用 Google 帳號註冊</span>
        </button>

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-gray-200" />
          <span className="text-xs text-gray-400">或</span>
          <div className="h-px flex-1 bg-gray-200" />
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          <input
            type="text"
            placeholder="Creator name"
            value={creatorName}
            onChange={(event) => setCreatorName(event.target.value)}
            className="w-full rounded-2xl border border-zinc-200 px-4 py-3 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
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
            minLength={6}
            className="w-full rounded-2xl border border-zinc-200 px-4 py-3 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
          {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-blue-500 px-4 py-3 font-semibold text-white transition-colors hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? "建立中..." : "免費開始"}
          </button>
        </form>
        <p className="mt-5 text-center text-sm text-zinc-500">
          已經有帳戶？ <Link href="/login" className="font-semibold text-zinc-950">登入</Link>
        </p>
      </section>
    </main>
  );
}
