import { NextResponse } from "next/server";

import { getCreatorWorkspaceContext } from "@/lib/creator-workspace";
import { metaGet } from "@/lib/meta-ads-api";

export async function GET() {
  try {
    const { user, activeWorkspace, activeRole, admin } = await getCreatorWorkspaceContext();
    if (!user || !activeWorkspace || !admin) return NextResponse.json({ error: "請先登入" }, { status: 401 });

    const [{ data: profile }, { data: connection }, { data: media }] = await Promise.all([
      admin.from("egg_creator_profiles").select("display_name,username").eq("id", activeWorkspace.id).maybeSingle(),
      admin.from("egg_meta_connections").select("user_access_token,token_expires_at").eq("workspace_id", activeWorkspace.id).maybeSingle(),
      admin.from("egg_instagram_media")
        .select("id,caption,media_url,thumbnail_url,media_type,permalink,published_at")
        .eq("creator_id", activeWorkspace.id)
        .in("media_type", ["IMAGE", "CAROUSEL_ALBUM"])
        .order("published_at", { ascending: false })
        .limit(20),
    ]);
    const posts = (media || []).map((item) => ({
      id: item.id,
      title: item.caption?.split("\n")[0]?.slice(0, 80) || "Instagram 內容",
      body: item.caption || "",
      image_url: item.media_url || item.thumbnail_url,
      permalink: item.permalink,
    })).filter((item) => item.image_url);
    const token = connection?.user_access_token as string | null;
    const base = {
      appLive: process.env.META_APP_LIVE === "true",
      canManageAds: activeRole === "owner" || activeRole === "admin",
      brandName: profile?.display_name || profile?.username || "Egg Creator",
      posts,
      tokenExpiresAt: connection?.token_expires_at || null,
    };
    if (!token) return NextResponse.json({ ...base, connected: false, permissions: [], adAccounts: [], pages: [] });

    const permissionsResult = await metaGet("me/permissions", token);
    const permissions = Array.isArray(permissionsResult.data) ? permissionsResult.data : [];
    const granted = new Set(permissions.filter((item) => item && typeof item === "object" && item.status === "granted").map((item) => item.permission));
    if (!granted.has("ads_management") || !granted.has("ads_read")) {
      return NextResponse.json({ ...base, connected: true, permissions, adAccounts: [], pages: [] });
    }

    const [accounts, pages] = await Promise.all([
      metaGet("me/adaccounts", token, { fields: "id,name,account_status,currency,disable_reason", limit: "100" }),
      metaGet("me/accounts", token, { fields: "id,name,instagram_business_account{id,username,profile_picture_url}", limit: "100" }),
    ]);
    return NextResponse.json({
      ...base,
      connected: true,
      permissions,
      adAccounts: Array.isArray(accounts.data) ? accounts.data : [],
      pages: Array.isArray(pages.data) ? pages.data : [],
    });
  } catch (error) {
    console.error("[egg/meta-ads/setup]", error);
    return NextResponse.json({ error: "未能讀取 Meta Ads 連接，請重新授權後再試。" }, { status: 500 });
  }
}
