import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { DollarSign, Gift, Handshake, Package, ShoppingBag, Users, type LucideIcon } from "lucide-react";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { SalesTrendChart, type SalesTrendPoint } from "@/components/analytics/SalesTrendChart";

type Profile = {
  id: string;
  username: string;
  display_name: string | null;
  instagram_followers: number | null;
};

type Invitation = {
  id: string;
  brand_name: string | null;
  campaign_name: string | null;
  collab_formats: string[] | null;
  budget_range: string | null;
  responded_at: string | null;
  status: string | null;
};

type Order = {
  id: string;
  product_title: string | null;
  amount: number | null;
  currency: string | null;
  buyer_name: string | null;
  status: string | null;
  created_at: string;
};

type PerkClaim = {
  id: string;
  status: string | null;
  perk_id: string | null;
};

const paidStatuses = new Set(["paid", "processing", "shipped", "delivered"]);
const activePerkStatuses = new Set(["confirmed", "in_progress"]);

export default async function AnalyticsPage() {
  const serverSupabase = await createServerClient();
  if (!serverSupabase) redirect("/login");

  const {
    data: { user },
  } = await serverSupabase.auth.getUser();
  if (!user) redirect("/login");

  const supabaseAdmin = createSupabaseAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!) as any;

  const { data: profileData } = await supabaseAdmin
    .from("egg_creator_profiles")
    .select("id, username, display_name, instagram_followers")
    .eq("user_id", user.id)
    .single();

  const profile = profileData as Profile | null;
  if (!profile) redirect("/login");

  const [{ data: invitationData }, { data: orderData }, { data: perkClaimData }] = await Promise.all([
    supabaseAdmin
      .from("egg_brand_invitations")
      .select("id, brand_name, campaign_name, collab_formats, budget_range, responded_at, status")
      .eq("creator_id", profile.id)
      .eq("status", "accepted")
      .order("responded_at", { ascending: false }),
    supabaseAdmin
      .from("egg_product_orders")
      .select("id, product_title, amount, currency, buyer_name, status, created_at")
      .eq("creator_id", profile.id)
      .neq("status", "cancelled")
      .order("created_at", { ascending: false }),
    supabaseAdmin.from("perk_claims").select("id, status, perk_id").eq("creator_username", profile.username),
  ]);

  const invitations = (invitationData ?? []) as Invitation[];
  const orders = (orderData ?? []) as Order[];
  const perkClaims = (perkClaimData ?? []) as PerkClaim[];
  const paidOrders = orders.filter((order) => paidStatuses.has(order.status ?? ""));

  const brandDealRevenue = invitations.reduce((sum, invitation) => sum + budgetEstimate(invitation.budget_range), 0);
  const productRevenue = orders.reduce((sum, order) => sum + Number(order.amount ?? 0), 0);
  const activePerks = perkClaims.filter((claim) => activePerkStatuses.has(claim.status ?? "")).length;
  const perkStats = {
    pending: perkClaims.filter((claim) => claim.status === "pending").length,
    confirmed: perkClaims.filter((claim) => claim.status === "confirmed").length,
    in_progress: perkClaims.filter((claim) => claim.status === "in_progress").length,
    completed: perkClaims.filter((claim) => claim.status === "completed").length,
  };
  const chartData = buildMonthlySalesData(orders);

  return (
    <div className="space-y-6 bg-[#f7f7f8] pt-[10vh]">
      <div>
        <h1 className="text-3xl font-black text-zinc-950">數據分析</h1>
        <p className="mt-2 text-zinc-500">追蹤品牌合作、貨品銷售和公關宣傳表現。</p>
      </div>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <KpiCard label="品牌合作收入" value={money(brandDealRevenue)} sub="以邀請預算範圍估算" icon={DollarSign} color="bg-purple-500" />
        <KpiCard label="貨品銷售收入" value={money(productRevenue)} sub={`${orders.length} 筆非取消訂單`} icon={ShoppingBag} color="bg-blue-500" />
        <KpiCard label="已完成合作" value={String(invitations.length)} sub="已接受品牌邀請" icon={Handshake} color="bg-green-500" />
        <KpiCard label="訂單總數" value={String(paidOrders.length)} sub="已付款或處理中訂單" icon={Package} color="bg-orange-500" />
        <KpiCard label="IG 追蹤人數" value={Number(profile.instagram_followers ?? 0).toLocaleString()} sub="@Instagram" icon={Users} color="bg-pink-500" />
        <KpiCard label="公關宣傳進行中" value={String(activePerks)} sub="已確認 / 進行中" icon={Gift} color="bg-yellow-500" />
      </section>

      <SalesTrendChart data={chartData} />

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <RecordPanel title="品牌合作記錄" href="/brand-deals">
          {invitations.slice(0, 5).length === 0 ? (
            <EmptyLine text="暫未有已接受品牌合作" />
          ) : (
            invitations.slice(0, 5).map((invitation) => <BrandDealRow key={invitation.id} invitation={invitation} />)
          )}
        </RecordPanel>

        <RecordPanel title="貨品銷售記錄" href="/products">
          {orders.slice(0, 5).length === 0 ? (
            <EmptyLine text="暫未有銷售訂單" />
          ) : (
            orders.slice(0, 5).map((order) => <OrderRow key={order.id} order={order} />)
          )}
        </RecordPanel>
      </section>

      <section className="rounded-2xl border bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold">公關宣傳總覽</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <MiniStat label="待確認" value={perkStats.pending} />
          <MiniStat label="已確認" value={perkStats.confirmed} />
          <MiniStat label="進行中" value={perkStats.in_progress} />
          <MiniStat label="已完成" value={perkStats.completed} />
        </div>
      </section>
    </div>
  );
}

function KpiCard({ label, value, sub, icon: Icon, color }: { label: string; value: string; sub?: string; icon: LucideIcon; color: string }) {
  return (
    <div className="rounded-2xl border bg-white p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-400">{label}</p>
          <p className="mt-1 text-2xl font-bold text-zinc-900">{value}</p>
          {sub && <p className="mt-1 text-xs text-gray-400">{sub}</p>}
        </div>
        <div className={`rounded-xl p-2.5 ${color}`}>
          <Icon size={18} className="text-white" />
        </div>
      </div>
    </div>
  );
}

function RecordPanel({ title, href, children }: { title: string; href: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">{title}</h2>
        <Link href={href} className="text-xs font-medium text-purple-600 hover:underline">
          查看全部
        </Link>
      </div>
      <div className="divide-y">{children}</div>
    </div>
  );
}

function BrandDealRow({ invitation }: { invitation: Invitation }) {
  return (
    <div className="py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{invitation.brand_name ?? "未命名品牌"}</p>
          <p className="mt-0.5 truncate text-xs text-gray-400">{invitation.campaign_name ?? "未命名 Campaign"}</p>
        </div>
        <span className="shrink-0 rounded-full bg-green-50 px-2 py-0.5 text-xs text-green-600">已合作</span>
      </div>
      {invitation.collab_formats && invitation.collab_formats.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {invitation.collab_formats.map((format) => (
            <span key={format} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
              {format}
            </span>
          ))}
        </div>
      )}
      {invitation.responded_at && <p className="mt-2 text-xs text-gray-300">{new Date(invitation.responded_at).toLocaleDateString("zh-HK")}</p>}
    </div>
  );
}

function OrderRow({ order }: { order: Order }) {
  const badge = orderStatusBadge(order.status);
  return (
    <div className="py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{order.product_title ?? "未命名貨品"}</p>
          <p className="mt-0.5 truncate text-xs text-gray-400">{order.buyer_name ?? "未提供姓名"}</p>
          <p className="mt-1 text-sm font-semibold">
            {order.currency ?? "HKD"} {Number(order.amount ?? 0).toLocaleString()}
          </p>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${badge.color}`}>{badge.label}</span>
      </div>
      <p className="mt-2 text-xs text-gray-300">{new Date(order.created_at).toLocaleString("zh-HK")}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-gray-50 p-4 text-center">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="mt-1 text-xl font-bold text-zinc-900">{value}</p>
    </div>
  );
}

function EmptyLine({ text }: { text: string }) {
  return <p className="py-8 text-center text-sm text-gray-400">{text}</p>;
}

function money(value: number) {
  return `HK$${Math.round(value).toLocaleString()}`;
}

function budgetEstimate(value: string | null) {
  if (!value) return 0;
  const numbers = value.match(/\d[\d,]*/g)?.map((num) => Number(num.replace(/,/g, ""))) ?? [];
  if (numbers.length >= 2) return (numbers[0] + numbers[1]) / 2;
  if (numbers.length === 1) return numbers[0];
  return 0;
}

function orderStatusBadge(status: string | null) {
  if (status === "paid") return { label: "已付款", color: "bg-yellow-50 text-yellow-700" };
  if (status === "processing") return { label: "處理中", color: "bg-blue-50 text-blue-700" };
  if (status === "shipped") return { label: "已寄出", color: "bg-purple-50 text-purple-700" };
  if (status === "delivered") return { label: "已完成", color: "bg-green-50 text-green-700" };
  return { label: "待付款", color: "bg-gray-100 text-gray-500" };
}

function buildMonthlySalesData(orders: Order[]): SalesTrendPoint[] {
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    return {
      key: `${date.getFullYear()}-${date.getMonth()}`,
      month: date.toLocaleDateString("zh-HK", { month: "short" }),
      amount: 0,
    };
  });
  const byKey = new Map(months.map((month) => [month.key, month]));

  for (const order of orders) {
    const date = new Date(order.created_at);
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    const target = byKey.get(key);
    if (target) target.amount += Number(order.amount ?? 0);
  }

  return months.map(({ month, amount }) => ({ month, amount }));
}
