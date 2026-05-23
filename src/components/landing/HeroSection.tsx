"use client";

import Link from "next/link";
import { DollarSign, Handshake, TrendingUp } from "lucide-react";
import { CountUp } from "./CountUp";

export default function HeroSection() {
  return (
    <section
      className="relative flex min-h-screen items-center overflow-hidden py-20 sm:py-28"
      style={{
        backgroundImage: "url(/hero-bg.jpg)",
        backgroundPosition: "center top",
        backgroundRepeat: "no-repeat",
        backgroundSize: "cover",
      }}
    >
      <div className="absolute inset-0 bg-black/20" />
      <div className="relative z-10 mx-auto grid w-full max-w-7xl items-center gap-16 px-6 lg:grid-cols-[1fr_0.9fr]">
        <div>
          <span className="text-sm font-medium tracking-wide text-white">
            亞洲創作者專屬平台
          </span>
          <h1 className="mt-7 text-5xl font-black leading-[1.08] tracking-tight text-white sm:text-7xl">
            人人都可以成為
            <br />
            Content Creator
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-white/90">
            SOON AI 幫你配對品牌，協助你提供最新創作工具，讓你專注創作。
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link href="/signup" className="rounded-full bg-blue-500 px-7 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-blue-600">
              免費開始
            </Link>
            <button type="button" className="px-2 py-3.5 text-sm font-semibold text-blue-500 transition-colors hover:text-blue-600">
              觀看示範 →
            </button>
          </div>
        </div>

        <div className="relative flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/hero-phone.png"
            alt="Creator jumping out of phone"
            className="phone-mockup w-[92vw] max-w-[570px] object-contain drop-shadow-2xl sm:w-[570px]"
            style={{ filter: "drop-shadow(0 40px 60px rgba(0,0,0,0.15))" }}
          />

          <div className="absolute top-[10%] -left-[16%] hidden min-w-[160px] rounded-2xl bg-white px-4 py-3 shadow-xl sm:block">
            <div className="mb-1 flex items-center gap-2 text-xs text-gray-500">
              <TrendingUp size={16} className="text-[#f5a623]" />
              今日流量
            </div>
            <p className="text-2xl font-bold text-gray-900">3,241 <span className="text-sm font-normal">views</span></p>
          </div>

          <div className="absolute top-[5%] -right-[12%] hidden min-w-[180px] rounded-2xl bg-white px-4 py-3 shadow-xl sm:block">
            <div className="mb-1 flex items-center gap-2 text-xs font-medium text-gray-700">
              <Handshake size={16} className="text-[#f5a623]" />
              品牌合作邀請
            </div>
            <p className="text-sm text-gray-500">卓悅 wants to collab</p>
            <button className="mt-2 rounded-full bg-black px-3 py-1 text-xs text-white">查看</button>
          </div>

          <div className="absolute bottom-[10%] -left-[12%] hidden min-w-[180px] rounded-2xl bg-[#0a0a0a] px-4 py-3 shadow-xl sm:block">
            <div className="mb-1 flex items-center gap-2 text-xs text-gray-400">
              <DollarSign size={16} className="text-[#f5a623]" />
              本月收入
            </div>
            <CountUp end={18400} prefix="HK$" className="text-2xl font-bold text-white" />
            <p className="mt-1 text-xs text-green-400">↑ +34% vs last month</p>
          </div>
        </div>
      </div>
    </section>
  );
}
