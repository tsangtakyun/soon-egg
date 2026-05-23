"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BadgeDollarSign, BriefcaseBusiness, ClipboardList } from "lucide-react";
import { SOONMascot } from "./SOONMascot";

const totalSteps = 5;

const PLATFORMS = [
  { id: "instagram", label: "Instagram", placeholder: "用戶名稱", color: "#E1306C" },
  { id: "facebook", label: "Facebook", placeholder: "用戶名稱或專頁名稱", color: "#1877F2" },
  { id: "threads", label: "Threads", placeholder: "用戶名稱", color: "#000000" },
  { id: "youtube", label: "YouTube", placeholder: "頻道名稱", color: "#FF0000" },
  { id: "tiktok", label: "TikTok", placeholder: "用戶名稱", color: "#000000" },
  { id: "douyin", label: "抖音", placeholder: "抖音號", color: "#161823" },
  { id: "xiaohongshu", label: "小紅書", placeholder: "小紅書號", color: "#FF2442" },
];

const THEME_OPTIONS = [
  { name: "藍天白雲", bg: "/hero-bg.jpg", textColor: "#1a1a1a", buttonColor: "#3b82f6" },
  { name: "萬天星空", bg: "/star-bg.jpg", textColor: "#ffffff", buttonColor: "#818cf8" },
  { name: "搞笑戲劇", bg: "/secondbg.jpg", textColor: "#ffffff", buttonColor: "#f59e0b" },
  { name: "科技感覺", bg: "/tech.jpg", textColor: "#ffffff", buttonColor: "#00ff9f" },
  { name: "經典複古", bg: "/classic.jpg", textColor: "#3d2b1f", buttonColor: "#8b6914" },
  { name: "創意主題", bg: "/creative.jpg", textColor: "#2d1b69", buttonColor: "#7c3aed" },
];

type Handles = Record<string, string>;

type AnalysisResult = {
  display_name?: string;
  bio?: string;
  content_categories?: string[];
  content_language?: string;
  ai_profile_summary?: string;
  suggested_theme?: string;
};

const initialHandles = {
  instagram: "",
  facebook: "",
  threads: "",
  youtube: "",
  tiktok: "",
  douyin: "",
  xiaohongshu: "",
};

export function OnboardingFlow() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [handles, setHandles] = useState<Handles>(initialHandles);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [selectedTheme, setSelectedTheme] = useState("藍天白雲");
  const [analyzing, setAnalyzing] = useState(false);
  const [savingTheme, setSavingTheme] = useState(false);
  const [error, setError] = useState("");
  const analyzedRef = useRef(false);
  const progress = (currentStep / totalSteps) * 100;

  const analyzeProfiles = useCallback(async () => {
    setAnalyzing(true);
    setError("");

    try {
      const response = await fetch("/api/onboarding/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handles }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Analysis failed");
      }

      setAnalysisResult(data.analysis);
      if (data.analysis?.suggested_theme && THEME_OPTIONS.some((theme) => theme.name === data.analysis.suggested_theme)) {
        setSelectedTheme(data.analysis.suggested_theme);
      }
      setTimeout(() => setCurrentStep(4), 1000);
    } catch {
      setError("暫時無法完成分析，請稍後再試。");
      setAnalysisResult({
        display_name: "您的創作者檔案",
        bio: "專注亞洲創作者內容與品牌合作。",
        content_categories: ["品牌合作", "內容創作", "創作者工具"],
        ai_profile_summary: "系統暫時未能連線至 AI 分析服務，您仍可繼續選擇頁面風格。",
      });
      setTimeout(() => setCurrentStep(4), 1000);
    } finally {
      setAnalyzing(false);
    }
  }, [handles]);

  useEffect(() => {
    if (currentStep === 3 && !analyzedRef.current) {
      analyzedRef.current = true;
      void analyzeProfiles();
    }
  }, [analyzeProfiles, currentStep]);

  const stepMeta = useMemo(() => {
    switch (currentStep) {
      case 1:
        return { title: "你好！我係 SOON AI", mood: "excited" as const };
      case 2:
        return { title: "請告訴我您活躍的社交平台", mood: "thinking" as const };
      case 3:
        return { title: "SOON AI 正在分析您的社交平台數據...", mood: "thinking" as const };
      case 4:
        return { title: "以下是您的創作者檔案，請確認是否正確", mood: "excited" as const };
      default:
        return { title: "請選擇您偏好的頁面風格", mood: "happy" as const };
    }
  }, [currentStep]);

  const nextStep = () => {
    if (currentStep === 5) {
      void handleThemeConfirm();
      return;
    }
    setCurrentStep((step) => Math.min(totalSteps, step + 1));
  };

  const prevStep = () => setCurrentStep((step) => Math.max(1, step - 1));

  const updateHandle = (platform: string, value: string) => {
    setHandles((current) => ({ ...current, [platform]: value }));
    if (currentStep < 3) {
      analyzedRef.current = false;
    }
  };

  const handleThemeConfirm = async () => {
    setSavingTheme(true);
    setError("");

    try {
      const response = await fetch("/api/onboarding/save-theme", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ themeName: selectedTheme }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Save failed");
      }

      router.push("/dashboard");
    } catch {
      setError("未能儲存頁面風格。請確認您已登入，再重試。");
    } finally {
      setSavingTheme(false);
    }
  };

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
          <StepContent
            currentStep={currentStep}
            handles={handles}
            updateHandle={updateHandle}
            analyzing={analyzing}
            analysisResult={analysisResult}
            selectedTheme={selectedTheme}
            onSelectTheme={setSelectedTheme}
          />
          {error && <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}
        </div>

        <div className="mt-6 flex w-full max-w-md gap-3">
          {currentStep > 1 && currentStep !== 3 && (
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
            disabled={analyzing || savingTheme}
            className="flex-1 rounded-2xl bg-blue-500 py-3 font-semibold text-white transition-colors hover:bg-blue-600 disabled:opacity-50"
          >
            {currentStep === 5 ? (savingTheme ? "儲存中..." : "完成設定") : "下一步 →"}
          </button>
        </div>
      </div>
    </div>
  );
}

function StepContent({
  currentStep,
  handles,
  updateHandle,
  analyzing,
  analysisResult,
  selectedTheme,
  onSelectTheme,
}: {
  currentStep: number;
  handles: Handles;
  updateHandle: (platform: string, value: string) => void;
  analyzing: boolean;
  analysisResult: AnalysisResult | null;
  selectedTheme: string;
  onSelectTheme: (theme: string) => void;
}) {
  if (currentStep === 1) {
    return (
      <div className="mt-6 space-y-3">
        <FeatureRow icon={BriefcaseBusiness} text="配對最適合您的亞洲品牌" />
        <FeatureRow icon={ClipboardList} text="自動生成繁體中文 Media Kit" />
        <FeatureRow icon={BadgeDollarSign} text="協助您談到理想報價" />
      </div>
    );
  }

  if (currentStep === 2) {
    return (
      <div className="mt-5 space-y-4">
        <p className="text-center text-sm leading-6 text-gray-500">我會幫您分析受眾，配對最合適的品牌。</p>
        <div className="space-y-3">
          {PLATFORMS.map((platform) => (
            <label key={platform.id} className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-gray-50 px-3 py-2">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white"
                style={{ backgroundColor: platform.color }}
              >
                {platform.label[0]}
              </div>
              <span className="w-24 text-sm font-semibold text-gray-700">{platform.label}</span>
              <input
                value={handles[platform.id] ?? ""}
                onChange={(event) => updateHandle(platform.id, event.target.value)}
                placeholder={platform.placeholder}
                className="min-w-0 flex-1 bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
              />
            </label>
          ))}
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
        <p className="mt-4 text-sm leading-6 text-gray-600">
          {analyzing ? "正在整理您的平台數據、內容定位、受眾輪廓與品牌合作機會。" : "分析完成，正在準備您的創作者檔案。"}
        </p>
      </div>
    );
  }

  if (currentStep === 4) {
    const connectedHandles = Object.entries(handles).filter(([, value]) => value.trim());

    return (
      <div className="mt-6 space-y-4">
        <div className="rounded-2xl bg-gray-50 p-4">
          <h3 className="text-lg font-bold text-gray-900">{analysisResult?.display_name || "您的創作者檔案"}</h3>
          <p className="mt-1 text-sm text-gray-600">{analysisResult?.bio || "正在建立您的創作者定位。"}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {(analysisResult?.content_categories ?? []).map((category) => (
              <span key={category} className="rounded-full bg-blue-100 px-3 py-1 text-xs text-blue-700">
                {category}
              </span>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-500">已連接平台</p>
          {connectedHandles.length > 0 ? connectedHandles.map(([platform, handle]) => (
            <div key={platform} className="flex items-center gap-2 text-sm text-gray-700">
              <div className="h-5 w-5 rounded-full bg-gray-200" />
              <span className="capitalize">{platform}</span>
              <span className="text-gray-400">@{handle}</span>
            </div>
          )) : (
            <p className="text-sm text-gray-400">尚未輸入平台資料。</p>
          )}
        </div>

        <p className="text-xs italic leading-relaxed text-gray-500">{analysisResult?.ai_profile_summary}</p>
      </div>
    );
  }

  return (
    <div className="mt-6 grid grid-cols-2 gap-3">
      {THEME_OPTIONS.map((theme) => (
        <button
          key={theme.name}
          type="button"
          onClick={() => onSelectTheme(theme.name)}
          className={`relative h-32 overflow-hidden rounded-2xl transition-all ${
            selectedTheme === theme.name ? "scale-[1.02] ring-4 ring-blue-500" : "ring-1 ring-gray-200 hover:ring-2 hover:ring-blue-300"
          }`}
        >
          <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${theme.bg})` }} />
          <div className="absolute inset-0 bg-black/20" />
          <div className="relative z-10 flex h-full flex-col justify-between p-3">
            <div className="flex items-center gap-1.5">
              <div className="h-5 w-5 rounded-full bg-white/80" />
              <div className="h-2 w-12 rounded bg-white/70" />
            </div>
            <div className="h-5 w-full rounded-full" style={{ backgroundColor: theme.buttonColor, opacity: 0.9 }} />
          </div>
          <div className="absolute bottom-0 left-0 right-0 bg-black/40 px-2 py-1">
            <p className="text-center text-xs font-medium text-white">{theme.name}</p>
          </div>
          {selectedTheme === theme.name && (
            <div className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500">
              <svg width="10" height="8" viewBox="0 0 10 8" fill="none" aria-hidden>
                <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
          )}
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
