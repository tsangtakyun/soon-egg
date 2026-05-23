"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BadgeDollarSign, BriefcaseBusiness, CheckCircle, ClipboardList } from "lucide-react";
import { SOONMascot } from "./SOONMascot";

const totalSteps = 5;

const PLATFORMS = [
  { id: "instagram", label: "Instagram", placeholder: "用戶名稱", logoUrl: "https://cdn.simpleicons.org/instagram/E1306C" },
  { id: "facebook", label: "Facebook", placeholder: "用戶名稱或專頁名稱", logoUrl: "https://cdn.simpleicons.org/facebook/1877F2" },
  { id: "threads", label: "Threads", placeholder: "用戶名稱", logoUrl: "https://cdn.simpleicons.org/threads/000000" },
  { id: "youtube", label: "YouTube", placeholder: "頻道名稱", logoUrl: "https://cdn.simpleicons.org/youtube/FF0000" },
  { id: "tiktok", label: "TikTok", placeholder: "用戶名稱", logoUrl: "https://cdn.simpleicons.org/tiktok/000000" },
  { id: "douyin", label: "抖音", placeholder: "抖音號", logoUrl: "https://cdn.simpleicons.org/tiktok/161823" },
  { id: "xiaohongshu", label: "小紅書", placeholder: "小紅書號", logoUrl: "https://cdn.simpleicons.org/xiaohongshu/FF2442" },
];

const MANUAL_METRIC_PLATFORMS = new Set(["tiktok", "douyin", "xiaohongshu"]);

const THEME_OPTIONS = [
  { name: "藍天白雲", bg: "/hero-bg.jpg" },
  { name: "萬天星空", bg: "/star-bg.jpg" },
  { name: "搞笑戲劇", bg: "/secondbg.jpg" },
  { name: "科技感覺", bg: "/tech.jpg" },
  { name: "經典複古", bg: "/classic.jpg" },
  { name: "創意主題", bg: "/creative.jpg" },
];

type Handles = Record<string, string>;
type FollowerCounts = Record<string, string>;

type InstagramConnection = {
  username: string;
  followers: number;
  name: string;
  avatar: string;
  facebookPageId: string;
  facebookPageName: string;
  threadsUsername: string;
};

type AnalysisResult = {
  display_name?: string;
  bio?: string;
  content_categories?: string[];
  content_language?: string;
  ai_profile_summary?: string;
  suggested_theme?: string;
  instagram_followers?: number;
  youtube_subscribers?: number;
  tiktok_followers?: number;
  douyin_followers?: number;
  xiaohongshu_followers?: number;
  avatar_url?: string | null;
  real_data_fetched?: boolean;
  provided_data_sources?: string[];
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

const initialFollowerCounts = {
  tiktok: "",
  douyin: "",
  xiaohongshu: "",
};

export function OnboardingFlow() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [handles, setHandles] = useState<Handles>(initialHandles);
  const [followerCounts, setFollowerCounts] = useState<FollowerCounts>(initialFollowerCounts);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [selectedTheme, setSelectedTheme] = useState("藍天白雲");
  const [igData, setIgData] = useState<InstagramConnection | null>(null);
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
        body: JSON.stringify({ handles, followerCounts }),
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
  }, [followerCounts, handles]);

  useEffect(() => {
    if (currentStep === 3 && !analyzedRef.current) {
      analyzedRef.current = true;
      void analyzeProfiles();
    }
  }, [analyzeProfiles, currentStep]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connected = params.get("instagram_connected");
    const username = params.get("ig_username");

    if (connected === "true" && username) {
      const nextIgData = {
        username,
        followers: Number.parseInt(params.get("ig_followers") || "0", 10) || 0,
        name: params.get("ig_name") || "",
        avatar: params.get("ig_avatar") || "",
        facebookPageId: params.get("fb_page_id") || "",
        facebookPageName: params.get("fb_page_name") || "",
        threadsUsername: params.get("threads_username") || username,
      };

      queueMicrotask(() => {
        setIgData(nextIgData);
        setHandles((current) => ({
          ...current,
          instagram: username,
          threads: nextIgData.threadsUsername,
          facebook: current.facebook || nextIgData.facebookPageName,
        }));
        setCurrentStep(2);
        analyzedRef.current = false;
        router.replace("/onboarding");
      });
    } else if (params.get("instagram_error")) {
      queueMicrotask(() => {
        setError("Instagram 連接失敗，您仍可以手動輸入用戶名稱。");
        router.replace("/onboarding");
      });
    }
  }, [router]);

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

  const updateFollowerCount = (platform: string, value: string) => {
    setFollowerCounts((current) => ({ ...current, [platform]: value.replace(/[^\d]/g, "") }));
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
            followerCounts={followerCounts}
            igData={igData}
            updateHandle={updateHandle}
            updateFollowerCount={updateFollowerCount}
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
  followerCounts,
  igData,
  updateHandle,
  updateFollowerCount,
  analyzing,
  analysisResult,
  selectedTheme,
  onSelectTheme,
}: {
  currentStep: number;
  handles: Handles;
  followerCounts: FollowerCounts;
  igData: InstagramConnection | null;
  updateHandle: (platform: string, value: string) => void;
  updateFollowerCount: (platform: string, value: string) => void;
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
          {PLATFORMS.map((platform) => {
            if (platform.id === "facebook" && igData?.facebookPageName) {
              return (
                <div key={platform.id} className="overflow-hidden rounded-2xl border border-green-200 bg-green-50">
                  <div className="flex items-center gap-3 px-3 py-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={platform.logoUrl} alt={platform.label} className="h-6 w-6 shrink-0 object-contain" />
                    <span className="w-24 text-sm font-semibold text-gray-700">{platform.label}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-gray-900">{igData.facebookPageName}</p>
                      <p className="text-xs text-gray-500">已連接 Facebook Page</p>
                    </div>
                    <CheckCircle size={18} className="text-green-500" />
                  </div>
                </div>
              );
            }

            if (platform.id === "threads" && igData?.threadsUsername) {
              return (
                <div key={platform.id} className="overflow-hidden rounded-2xl border border-green-200 bg-green-50">
                  <div className="flex items-center gap-3 px-3 py-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={platform.logoUrl} alt={platform.label} className="h-6 w-6 shrink-0 object-contain" />
                    <span className="w-24 text-sm font-semibold text-gray-700">{platform.label}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-gray-900">@{igData.threadsUsername}</p>
                      <p className="text-xs text-gray-500">已根據 Instagram 自動填入</p>
                    </div>
                    <CheckCircle size={18} className="text-green-500" />
                  </div>
                </div>
              );
            }

            if (platform.id === "instagram") {
              return (
                <div
                  key={platform.id}
                  className={`overflow-hidden rounded-2xl border transition-all ${
                    igData ? "border-green-200 bg-green-50" : "border-gray-100 bg-gray-50"
                  }`}
                >
                  {igData ? (
                    <div className="flex items-center gap-3 px-3 py-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={platform.logoUrl} alt={platform.label} className="h-6 w-6 shrink-0 object-contain" />
                      {igData.avatar && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={igData.avatar} alt="" className="h-8 w-8 rounded-full object-cover" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-gray-900">@{igData.username}</p>
                        <p className="text-xs text-gray-500">{igData.followers.toLocaleString()} 粉絲</p>
                      </div>
                      <CheckCircle size={18} className="text-green-500" />
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 px-3 py-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={platform.logoUrl}
                        alt={platform.label}
                        className="h-6 w-6 shrink-0 object-contain"
                        onError={(event) => {
                          event.currentTarget.style.display = "none";
                          event.currentTarget.nextElementSibling?.classList.remove("hidden");
                        }}
                      />
                      <div className="hidden h-6 w-6 shrink-0 rounded-full bg-gray-300" />
                      <span className="w-24 text-sm font-semibold text-gray-700">{platform.label}</span>
                      <input
                        value={handles.instagram ?? ""}
                        onChange={(event) => updateHandle("instagram", event.target.value)}
                        placeholder={platform.placeholder}
                        className="min-w-0 flex-1 bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
                      />
                      <Link
                        href="/api/auth/instagram"
                        className="shrink-0 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90"
                      >
                        OAuth 連接
                      </Link>
                    </div>
                  )}
                </div>
              );
            }

            if (platform.id === "youtube") {
              const hasYoutubeHandle = Boolean(handles.youtube?.trim());

              return (
                <div
                  key={platform.id}
                  className={`rounded-2xl border px-3 py-2 transition-all ${
                    hasYoutubeHandle ? "border-green-200 bg-green-50" : "border-gray-100 bg-gray-50"
                  }`}
                >
                  <label className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={platform.logoUrl}
                      alt={platform.label}
                      className="h-6 w-6 shrink-0 object-contain"
                      onError={(event) => {
                        event.currentTarget.style.display = "none";
                        event.currentTarget.nextElementSibling?.classList.remove("hidden");
                      }}
                    />
                    <div className="hidden h-6 w-6 shrink-0 rounded-full bg-gray-300" />
                    <span className="w-24 text-sm font-semibold text-gray-700">{platform.label}</span>
                    <input
                      value={handles.youtube ?? ""}
                      onChange={(event) => updateHandle("youtube", event.target.value)}
                      placeholder={platform.placeholder}
                      className="min-w-0 flex-1 bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
                    />
                    {hasYoutubeHandle && <CheckCircle size={18} className="shrink-0 text-green-500" />}
                  </label>
                  {hasYoutubeHandle && (
                    <p className="mt-2 border-t border-green-100 pt-2 text-xs text-green-700">
                      已加入分析；下一步會用 YouTube API 嘗試讀取頻道訂閱數。
                    </p>
                  )}
                </div>
              );
            }

            return (
              <div key={platform.id} className="rounded-2xl border border-gray-100 bg-gray-50 px-3 py-2">
              <label className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={platform.logoUrl}
                  alt={platform.label}
                  className="h-6 w-6 shrink-0 object-contain"
                  onError={(event) => {
                    event.currentTarget.style.display = "none";
                    event.currentTarget.nextElementSibling?.classList.remove("hidden");
                  }}
                />
                <div className="hidden h-6 w-6 shrink-0 rounded-full bg-gray-300" />
                <span className="w-24 text-sm font-semibold text-gray-700">{platform.label}</span>
                <input
                  value={handles[platform.id] ?? ""}
                  onChange={(event) => updateHandle(platform.id, event.target.value)}
                  placeholder={platform.placeholder}
                  className="min-w-0 flex-1 bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
                />
              </label>
              {MANUAL_METRIC_PLATFORMS.has(platform.id) && handles[platform.id]?.trim() && (
                <label className="mt-2 flex items-center gap-2 border-t border-gray-100 pt-2">
                  <span className="w-[7.5rem] text-xs font-medium text-gray-400">粉絲數</span>
                  <input
                    inputMode="numeric"
                    value={followerCounts[platform.id] ?? ""}
                    onChange={(event) => updateFollowerCount(platform.id, event.target.value)}
                    placeholder="由創作者提供"
                    className="min-w-0 flex-1 bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
                  />
                </label>
              )}
            </div>
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
        <p className="mt-4 text-sm leading-6 text-gray-600">
          {analyzing ? "正在整理您的平台數據、內容定位、受眾輪廓與品牌合作機會。" : "分析完成，正在準備您的創作者檔案。"}
        </p>
      </div>
    );
  }

  if (currentStep === 4) {
    const connectedHandles = Object.entries(handles).filter(([, value]) => value.trim());
    const instagramFollowers = analysisResult?.instagram_followers ?? 0;
    const youtubeSubscribers = analysisResult?.youtube_subscribers ?? 0;
    const creatorProvidedStats = [
      { platform: "TikTok", value: analysisResult?.tiktok_followers },
      { platform: "抖音", value: analysisResult?.douyin_followers },
      { platform: "小紅書", value: analysisResult?.xiaohongshu_followers },
    ].filter((item) => (item.value ?? 0) > 0);

    return (
      <div className="mt-6 space-y-4">
        <div className="rounded-2xl bg-gray-50 p-4">
          {analysisResult?.avatar_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={analysisResult.avatar_url}
              alt="Profile"
              className="mx-auto mb-3 h-16 w-16 rounded-full object-cover"
            />
          )}
          <h3 className="text-lg font-bold text-gray-900">{analysisResult?.display_name || "您的創作者檔案"}</h3>
          <p className="mt-1 text-sm text-gray-600">{analysisResult?.bio || "正在建立您的創作者定位。"}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {(analysisResult?.content_categories ?? []).map((category) => (
              <span key={category} className="rounded-full bg-blue-100 px-3 py-1 text-xs text-blue-700">
                {category}
              </span>
            ))}
          </div>
          {(instagramFollowers > 0 || youtubeSubscribers > 0 || creatorProvidedStats.length > 0) && (
            <div className="mt-4 grid grid-cols-2 gap-3">
              {instagramFollowers > 0 && (
                <div className="rounded-xl bg-white px-3 py-2 text-center">
                  <p className="font-bold text-gray-900">{instagramFollowers.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">Instagram 粉絲</p>
                  <p className="mt-1 text-[10px] font-medium text-blue-500">自動驗證</p>
                </div>
              )}
              {youtubeSubscribers > 0 && (
                <div className="rounded-xl bg-white px-3 py-2 text-center">
                  <p className="font-bold text-gray-900">{youtubeSubscribers.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">YouTube 訂閱</p>
                  <p className="mt-1 text-[10px] font-medium text-blue-500">自動驗證</p>
                </div>
              )}
              {creatorProvidedStats.map((stat) => (
                <div key={stat.platform} className="rounded-xl bg-white px-3 py-2 text-center">
                  <p className="font-bold text-gray-900">{Number(stat.value).toLocaleString()}</p>
                  <p className="text-xs text-gray-500">{stat.platform} 粉絲</p>
                  <p className="mt-1 text-[10px] font-medium text-amber-500">創作者提供</p>
                </div>
              ))}
            </div>
          )}
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
          <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-black/60 to-transparent" />
          <p className="absolute bottom-2 left-0 right-0 text-center text-xs font-semibold text-white drop-shadow-sm">{theme.name}</p>
          {selectedTheme === theme.name && (
            <div className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 shadow">
              <svg width="10" height="8" viewBox="0 0 10 8" fill="none" aria-hidden>
                <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
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
