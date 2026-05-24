"use client";

import { useEffect, useMemo, useState } from "react";

type PerkType = "service" | "product";
type FilterType = "all" | PerkType;

type Perk = {
  id: string;
  type: PerkType;
  title: string;
  description: string | null;
  requirements: string | null;
  quota: number | null;
  valid_until: string | null;
  workspace_id: string;
  brand_name: string | null;
  brand_website: string | null;
  brand_logo_url: string | null;
  claimed_count: number;
};

const timeSlots = ["上午 10:00-12:00", "下午 12:00-14:00", "下午 14:00-17:00", "下午 17:00-19:00"];
const districts = ["香港島", "九龍", "新界", "離島"];

export default function DiscoverBrandsPage() {
  const [perks, setPerks] = useState<Perk[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [claimPerk, setClaimPerk] = useState<Perk | null>(null);
  const [claimedIds, setClaimedIds] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadPerks() {
      setLoading(true);
      setError("");

      try {
        const res = await fetch("/api/perks/feed");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load perks");
        if (!cancelled) setPerks((data.perks ?? []) as Perk[]);
      } catch {
        if (!cancelled) setError("未能載入品牌 Perks，請稍後再試。");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadPerks();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredPerks = useMemo(() => (filter === "all" ? perks : perks.filter((perk) => perk.type === filter)), [filter, perks]);

  return (
    <div className="space-y-5 pt-[20vh]">
      <div>
        <h1 className="text-3xl font-black text-zinc-950">探索品牌</h1>
        <p className="mt-2 text-zinc-500">申請品牌提供的免費服務或產品，主動建立合作關係。</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { id: "all" as const, label: "全部" },
          { id: "service" as const, label: "服務類" },
          { id: "product" as const, label: "產品類" },
        ].map((item) => (
          <button
            className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
              filter === item.id ? "border-black bg-black text-white" : "border-zinc-200 bg-white text-zinc-500 hover:border-zinc-300"
            }`}
            key={item.id}
            onClick={() => setFilter(item.id)}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm text-zinc-400">載入中...</div>
      ) : error ? (
        <div className="py-12 text-center text-sm text-red-500">{error}</div>
      ) : filteredPerks.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-sm text-zinc-400">暫時未有可申請的品牌 Perks</p>
          <p className="mt-1 text-xs text-zinc-300">品牌開放新 Perk 後會顯示於此。</p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {filteredPerks.map((perk) => (
            <PerkCard
              claimed={claimedIds.includes(perk.id)}
              key={perk.id}
              onClaim={() => setClaimPerk(perk)}
              perk={perk}
            />
          ))}
        </div>
      )}

      {claimPerk && (
        <ClaimModal
          onClose={() => setClaimPerk(null)}
          onSuccess={(perkId) => {
            setClaimedIds((current) => [...current, perkId]);
            setPerks((current) =>
              current.map((perk) => (perk.id === perkId ? { ...perk, claimed_count: (perk.claimed_count ?? 0) + 1 } : perk))
            );
            setClaimPerk(null);
          }}
          perk={claimPerk}
        />
      )}
    </div>
  );
}

function PerkCard({ perk, claimed, onClaim }: { perk: Perk; claimed: boolean; onClaim: () => void }) {
  const quota = perk.quota ?? 0;
  const full = quota > 0 && perk.claimed_count >= quota;
  const remaining = quota > 0 ? Math.max(0, quota - perk.claimed_count) : 0;

  return (
    <article className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
      <div className="p-4">
        <div className="mb-3 flex items-start gap-3">
          {perk.brand_logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={perk.brand_logo_url} className="h-10 w-10 rounded-lg object-cover" alt={perk.brand_name ?? ""} />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 text-sm font-bold text-zinc-400">
              {perk.brand_name?.[0] ?? "?"}
            </div>
          )}
          <div className="flex-1">
            <span className={`rounded-full px-2 py-0.5 text-xs ${perk.type === "service" ? "bg-blue-50 text-blue-600" : "bg-orange-50 text-orange-600"}`}>
              {perk.type === "service" ? "服務" : "產品"}
            </span>
            <h3 className="mt-1 text-sm font-medium text-zinc-950">{perk.title}</h3>
            <p className="text-xs text-zinc-400">{perk.brand_name}</p>
          </div>
        </div>

        {perk.description && <p className="mb-3 line-clamp-3 text-xs leading-5 text-zinc-500">{perk.description}</p>}

        {perk.requirements && (
          <div className="mb-3 rounded-lg bg-yellow-50 px-3 py-2">
            <p className="text-xs text-yellow-700">要求：{perk.requirements}</p>
          </div>
        )}

        <div className="mb-3 flex items-center justify-between gap-3">
          <span className="text-xs text-zinc-400">{quota > 0 ? `剩餘名額：${remaining}/${quota}` : "不限名額"}</span>
          {perk.valid_until && <span className="text-xs text-zinc-400">有效至：{perk.valid_until}</span>}
        </div>

        <button
          className={`w-full rounded-xl py-2.5 text-sm font-medium transition ${
            full || claimed ? "cursor-not-allowed bg-zinc-100 text-zinc-400" : "bg-black text-white hover:bg-zinc-800"
          }`}
          disabled={full || claimed}
          onClick={onClaim}
          type="button"
        >
          {claimed ? "已申請" : full ? "名額已滿" : "我想要"}
        </button>
      </div>
    </article>
  );
}

function ClaimModal({ perk, onClose, onSuccess }: { perk: Perk; onClose: () => void; onSuccess: (perkId: string) => void }) {
  const [preferredDate, setPreferredDate] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [partySize, setPartySize] = useState(1);
  const [deliveryName, setDeliveryName] = useState("");
  const [deliveryPhone, setDeliveryPhone] = useState("");
  const [deliveryDistrict, setDeliveryDistrict] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isService = perk.type === "service";
  const disabled = loading || (isService ? !preferredDate : !deliveryName.trim() || !deliveryPhone.trim() || !deliveryAddress.trim());

  async function handleClaim() {
    if (disabled) return;

    setLoading(true);
    setError("");

    const res = await fetch("/api/perks/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        perk_id: perk.id,
        type: perk.type,
        preferred_date: preferredDate || null,
        preferred_time: preferredTime || null,
        party_size: partySize,
        delivery_name: deliveryName || null,
        delivery_phone: deliveryPhone || null,
        delivery_address: deliveryAddress || null,
        delivery_district: deliveryDistrict || null,
        delivery_notes: deliveryNotes || null,
      }),
    });
    const data = await res.json();

    setLoading(false);

    if (!res.ok || !data.success) {
      setError(data.error || data.detail?.error || "申請失敗，請稍後再試。");
      return;
    }

    onSuccess(perk.id);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6">
        <h3 className="text-lg font-semibold text-zinc-950">{isService ? `預約「${perk.title}」` : `申請「${perk.title}」`}</h3>
        <p className="mb-5 mt-1 text-sm text-zinc-500">{perk.brand_name}</p>

        {isService ? (
          <div className="space-y-3">
            <Field label="希望到訪日期 *">
              <input type="date" value={preferredDate} onChange={(event) => setPreferredDate(event.target.value)} />
            </Field>
            <Field label="希望到訪時間">
              <select value={preferredTime} onChange={(event) => setPreferredTime(event.target.value)}>
                <option value="">不指定</option>
                {timeSlots.map((slot) => (
                  <option key={slot} value={slot}>{slot}</option>
                ))}
              </select>
            </Field>
            <Field label="人數">
              <select value={partySize} onChange={(event) => setPartySize(Number(event.target.value))}>
                {[1, 2, 3, 4].map((value) => (
                  <option key={value} value={value}>{value} 人</option>
                ))}
              </select>
            </Field>
          </div>
        ) : (
          <div className="space-y-3">
            <Field label="收件人姓名 *">
              <input value={deliveryName} onChange={(event) => setDeliveryName(event.target.value)} placeholder="真實姓名" />
            </Field>
            <Field label="聯絡電話 *">
              <input value={deliveryPhone} onChange={(event) => setDeliveryPhone(event.target.value)} placeholder="例：9123 4567" />
            </Field>
            <Field label="地區">
              <select value={deliveryDistrict} onChange={(event) => setDeliveryDistrict(event.target.value)}>
                <option value="">請選擇</option>
                {districts.map((district) => (
                  <option key={district} value={district}>{district}</option>
                ))}
              </select>
            </Field>
            <Field label="詳細地址 *">
              <textarea value={deliveryAddress} onChange={(event) => setDeliveryAddress(event.target.value)} placeholder="街道、樓層、單位號碼" rows={2} />
            </Field>
            <Field label="備注（可選）">
              <input value={deliveryNotes} onChange={(event) => setDeliveryNotes(event.target.value)} placeholder="例：日間有人收件" />
            </Field>
          </div>
        )}

        {error && <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}

        <div className="mt-5 flex gap-3">
          <button
            className="flex-1 rounded-xl bg-black py-2.5 text-sm font-medium text-white disabled:opacity-40"
            disabled={disabled}
            onClick={() => void handleClaim()}
            type="button"
          >
            {loading ? "提交中..." : isService ? "確認預約" : "確認申請"}
          </button>
          <button className="flex-1 rounded-xl border border-zinc-200 py-2.5 text-sm text-zinc-500" onClick={onClose} type="button">
            取消
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-zinc-500">{label}</span>
      <div className="[&_input]:w-full [&_input]:rounded-xl [&_input]:border [&_input]:border-zinc-200 [&_input]:bg-white [&_input]:px-3 [&_input]:py-2 [&_input]:text-sm [&_input]:text-zinc-950 [&_select]:w-full [&_select]:rounded-xl [&_select]:border [&_select]:border-zinc-200 [&_select]:bg-white [&_select]:px-3 [&_select]:py-2 [&_select]:text-sm [&_select]:text-zinc-950 [&_textarea]:w-full [&_textarea]:resize-none [&_textarea]:rounded-xl [&_textarea]:border [&_textarea]:border-zinc-200 [&_textarea]:bg-white [&_textarea]:px-3 [&_textarea]:py-2 [&_textarea]:text-sm [&_textarea]:text-zinc-950">
        {children}
      </div>
    </label>
  );
}
