"use client";

import { useMemo, useState } from "react";
import { BadgeDollarSign, BriefcaseBusiness, Camera, Check, ClipboardList, Music2, PlayCircle } from "lucide-react";
import { SOONMascot } from "./SOONMascot";

const totalSteps = 5;

const socialPlatforms = [
  { name: "Instagram", icon: Camera, placeholder: "@soon_egg", color: "bg-pink-500" },
  { name: "YouTube", icon: PlayCircle, placeholder: "@soon_egg", color: "bg-red-500" },
  { name: "小紅書", icon: ClipboardList, placeholder: "soon_egg", color: "bg-rose-500" },
  { name: "TikTok", icon: Music2, placeholder: "@soon_egg", color: "bg-zinc-900" },
  { name: "Threads", icon: Music2, placeholder: "@soon_egg", color: "bg-gray-700" },
];

const themes = [
  { name: "日系清透", swatch: "linear-gradient(135deg,#f8fbff,#dceee5)" },
  { name: "韓系黃昏", swatch: "linear-gradient(135deg,#ffdfb8,#e6a6b8)" },
  { name: "港風霓虹", swatch: "linear-gradient(135deg,#160b2e,#00b8d4,#ff4f7b)" },
  { name: "台系文青", swatch: "linear-gradient(135deg,#f4efe6,#7aa095)" },
  { name: "現代極簡", swatch: "linear-gradient(135deg,#111,#f5f5f4)" },
];

export function OnboardingFlow() {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedTheme, setSelectedTheme] = useState("日系清透");
  const progress = (currentStep / totalSteps) * 100;

  const stepMeta = useMemo(() => {
    switch (currentStep) {
      case 1:
        return { title: "你好！我係 SOON AI", mood: "excited" as const };
      case 2:
        return { title: "告訴我你喺邊度活躍", mood: "thinking" as const };
      case 3:
        return { title: "SOON AI 分析緊你的數據...", mood: "thinking" as const };
      case 4:
        return { title: "係咁架！呢個係你嗎？", mood: "excited" as const };
      default:
        return { title: "揀一個你鍾意的風格", mood: "happy" as const };
    }
  }, [currentStep]);

  const nextStep = () => setCurrentStep((step) => Math.min(totalSteps, step + 1));
  const prevStep = () => setCurrentStep((step) => Math.max(1, step - 1));

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <div className="fixed left-0 right-0 top-0 z-20 h-1 bg-gray-200">
        <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>

      <div className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
        <p className="mb-8 text-xs font-medium uppercase tracking-wide text-gray-400">
          步驟 {currentStep} / {totalSteps}
        </p>

        <div className="w-full max-w-md rounded-3xl border border-gray-100 bg-white p-8 shadow-sm">
          <SOONMascot mood={stepMeta.mood} />
          <h2 className="mb-2 text-center text-xl font-bold text-gray-900">{stepMeta.title}</h2>
          <StepContent currentStep={currentStep} selectedTheme={selectedTheme} onSelectTheme={setSelectedTheme} />
        </div>

        <div className="mt-6 flex w-full max-w-md gap-3">
          {currentStep > 1 && (
            <button
              type="button"
              onClick={prevStep}
              className="flex-1 rounded-2xl border border-gray-200 py-3 font-medium text-gray-600 transition-colors hover:bg-gray-50"
            >
              ← 上一步
            </button>
          )}
          <button
            type="button"
            onClick={nextStep}
            className="flex-1 rounded-2xl bg-blue-500 py-3 font-semibold text-white transition-colors hover:bg-blue-600"
          >
            {currentStep === totalSteps ? "完成設定" : "下一步 →"}
          </button>
        </div>
      </div>
    </div>
  );
}

function StepContent({
  currentStep,
  selectedTheme,
  onSelectTheme,
}: {
  currentStep: number;
  selectedTheme: string;
  onSelectTheme: (theme: string) => void;
}) {
  if (currentStep === 1) {
    return (
      <div className="mt-6 space-y-3">
        <FeatureRow icon={BriefcaseBusiness} text="配對最適合你的亞洲品牌" />
        <FeatureRow icon={ClipboardList} text="自動生成繁體中文 Media Kit" />
        <FeatureRow icon={BadgeDollarSign} text="協助你談到理想報價" />
      </div>
    );
  }

  if (currentStep === 2) {
    return (
      <div className="mt-5 space-y-4">
        <p className="text-center text-sm leading-6 text-gray-500">我會幫你分析受眾，配對最合適的品牌</p>
        <div className="space-y-3">
          {socialPlatforms.map((platform) => {
            const Icon = platform.icon;
            return (
              <label key={platform.name} className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-gray-50 px-3 py-2">
                <span className={`flex h-9 w-9 items-center justify-center rounded-full text-white ${platform.color}`}>
                  <Icon size={16} />
                </span>
                <span className="w-20 text-sm font-semibold text-gray-700">{platform.name}</span>
                <input
                  placeholder={platform.placeholder}
                  className="min-w-0 flex-1 bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
                />
              </label>
            );
          })}
        </div>
      </div>
    );
  }

  if (currentStep === 3) {
    return (
      <div className="mt-8 rounded-3xl bg-blue-50 p-6 text-center">
        <div className="mx-auto flex w-fit gap-2">
          <span className="h-2 w-2 animate-bounce rounded-full bg-blue-500" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-blue-500 [animation-delay:120ms]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-blue-500 [animation-delay:240ms]" />
        </div>
        <p className="mt-4 text-sm leading-6 text-gray-600">正在整理你的平台數據、內容定位、受眾輪廓同品牌合作機會。</p>
      </div>
    );
  }

  if (currentStep === 4) {
    return (
      <div className="mt-6 rounded-3xl border border-gray-100 bg-gray-50 p-5">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-cyan-300 font-black text-white">SE</div>
          <div>
            <h3 className="font-bold text-gray-900">SOON-EGG</h3>
            <p className="text-sm text-gray-500">@soon_egg</p>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-2 text-center">
          <Metric label="Followers" value="128K" />
          <Metric label="Engagement" value="5.8%" />
          <Metric label="Region" value="HK" />
        </div>
        <p className="mt-4 text-sm leading-6 text-gray-600">專注亞洲創作者工具、品牌合作同內容變現的創作者。</p>
      </div>
    );
  }

  return (
    <div className="mt-6 grid grid-cols-2 gap-3">
      {themes.map((theme) => (
        <button
          key={theme.name}
          type="button"
          onClick={() => onSelectTheme(theme.name)}
          className={`rounded-2xl border bg-white p-3 text-left shadow-sm transition ${
            selectedTheme === theme.name ? "border-blue-500 ring-2 ring-blue-100" : "border-gray-100 hover:border-blue-200"
          }`}
        >
          <div className="aspect-[4/3] rounded-xl" style={{ background: theme.swatch }} />
          <div className="mt-3 flex items-center justify-between text-sm font-semibold text-gray-900">
            {theme.name}
            {selectedTheme === theme.name && <Check size={16} className="text-blue-500" />}
          </div>
        </button>
      ))}
    </div>
  );
}

function FeatureRow({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-gray-50 px-4 py-3">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-blue-600">
        <Icon size={17} />
      </span>
      <span className="text-sm font-medium text-gray-700">{text}</span>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white p-3">
      <div className="text-[10px] uppercase tracking-wide text-gray-400">{label}</div>
      <div className="mt-1 text-sm font-bold text-gray-900">{value}</div>
    </div>
  );
}
