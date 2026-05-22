"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import { DesignPicker } from "./DesignPicker";
import { ProfileBrief } from "./ProfileBrief";
import { SocialConnect } from "./SocialConnect";

const steps = [
  "Welcome",
  "Connect socials",
  "AI Analysis",
  "Profile Brief",
  "Content categories",
  "Design picker",
  "Complete",
];

const categories = ["美食探店", "美妝教學", "生活日常", "財經科普", "旅遊vlog", "創作者工具", "港風文化"];

export function OnboardingFlow() {
  const [step, setStep] = useState(0);
  const progress = Math.round(((step + 1) / steps.length) * 100);

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <div className="flex items-center justify-between text-sm text-zinc-500">
          <span>{steps[step]}</span>
          <span>{progress}%</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-200">
          <div className="h-full rounded-full bg-zinc-950 transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <section className="rounded-lg border border-zinc-200 bg-zinc-50 p-6">
        {step === 0 && (
          <div className="py-10 text-center">
            <Sparkles className="mx-auto h-10 w-10 text-amber-500" aria-hidden />
            <h1 className="mt-4 text-4xl font-black text-zinc-950">歡迎來到 SOON-EGG</h1>
            <p className="mx-auto mt-4 max-w-2xl text-zinc-600">MOON 會幫你分析社交平台、建立 Link in Bio、生成 Media Kit，然後配對最適合你的亞洲品牌合作。</p>
          </div>
        )}

        {step === 1 && <SocialConnect />}

        {step === 2 && (
          <div className="rounded-lg bg-white p-6 text-center shadow-sm">
            <Sparkles className="mx-auto h-8 w-8 animate-pulse text-amber-500" aria-hidden />
            <h2 className="mt-4 text-2xl font-bold text-zinc-950">MOON 正在分析你的創作者輪廓</h2>
            <p className="mt-2 text-zinc-500">正在讀取公開 bio、followers、內容語言和受眾定位。</p>
          </div>
        )}

        {step === 3 && <ProfileBrief />}

        {step === 4 && (
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button key={category} type="button" className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-700 hover:border-zinc-950">
                {category}
              </button>
            ))}
          </div>
        )}

        {step === 5 && <DesignPicker />}

        {step === 6 && (
          <div className="py-10 text-center">
            <h2 className="text-3xl font-black text-zinc-950">你的 SOON-EGG 主頁已準備好</h2>
            <p className="mt-3 text-zinc-600">sooncreator.network/soon_egg</p>
          </div>
        )}
      </section>

      <div className="mt-6 flex justify-between">
        <button type="button" onClick={() => setStep(Math.max(0, step - 1))} className="inline-flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-700">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          上一步
        </button>
        <button type="button" onClick={() => setStep(Math.min(steps.length - 1, step + 1))} className="inline-flex items-center gap-2 rounded-md bg-zinc-950 px-4 py-2 text-sm text-white">
          下一步
          <ArrowRight className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
