import Link from "next/link";

export default function SignupPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f7f5] px-4">
      <section className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-black text-zinc-950">建立 SOON-EGG 帳戶</h1>
        <p className="mt-2 text-sm text-zinc-500">開始建立你的亞洲創作者品牌合作中心。</p>
        <form className="mt-6 space-y-4">
          <input type="text" placeholder="Creator name" className="w-full rounded-md border border-zinc-200 px-3 py-2 outline-none focus:border-zinc-950" />
          <input type="email" placeholder="Email" className="w-full rounded-md border border-zinc-200 px-3 py-2 outline-none focus:border-zinc-950" />
          <input type="password" placeholder="Password" className="w-full rounded-md border border-zinc-200 px-3 py-2 outline-none focus:border-zinc-950" />
          <button type="button" className="w-full rounded-md bg-zinc-950 px-4 py-2 text-white">註冊</button>
        </form>
        <p className="mt-4 text-sm text-zinc-500">已有帳戶？ <Link href="/login" className="font-medium text-zinc-950">登入</Link></p>
      </section>
    </main>
  );
}
