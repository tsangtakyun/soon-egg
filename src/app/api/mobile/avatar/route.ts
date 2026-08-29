import {
  createClient as createServiceClient,
  type SupabaseClient,
} from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import {
  acceptPendingWorkspaceInvitations,
  createEggAdmin,
} from "@/lib/creator-workspace";

const bucketName = "avatars";
const maxSize = 5 * 1024 * 1024;
const allowed = ["image/jpeg", "image/png", "image/webp"];

async function ensureBucket(admin: SupabaseClient) {
  const { data } = await admin.storage.getBucket(bucketName);
  if (!data)
    await admin.storage.createBucket(bucketName, {
      public: true,
      fileSizeLimit: maxSize,
      allowedMimeTypes: allowed,
    });
}

export async function POST(request: Request) {
  const value = request.headers.get("authorization") ?? "";
  const token = value.startsWith("Bearer ") ? value.slice(7).trim() : "";
  const admin = createEggAdmin();
  const {
    data: { user },
  } = token ? await admin.auth.getUser(token) : { data: { user: null } };
  if (!user)
    return NextResponse.json(
      { error: "登入已失效，請重新登入" },
      { status: 401 },
    );
  await acceptPendingWorkspaceInvitations(admin, user.id, user.email);
  const selected = request.headers.get("x-egg-workspace-id");
  let query = admin
    .from("egg_creator_workspace_members")
    .select("workspace_id,role")
    .eq("user_id", user.id);
  if (selected) query = query.eq("workspace_id", selected);
  const { data: membership } = await query.limit(1).maybeSingle();
  if (!membership || !["owner", "admin"].includes(membership.role))
    return NextResponse.json(
      { error: "你無權修改工作空間資料" },
      { status: 403 },
    );
  const form = await request.formData();
  const file = form.get("file");
  if (
    !(file instanceof File) ||
    !allowed.includes(file.type) ||
    file.size > maxSize
  )
    return NextResponse.json(
      { error: "請選擇 5MB 以下 JPG、PNG 或 WebP 圖片" },
      { status: 400 },
    );
  const bytes = Buffer.from(await file.arrayBuffer());
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isPng = bytes
    .subarray(0, 8)
    .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const isWebp =
    bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
    bytes.subarray(8, 12).toString("ascii") === "WEBP";
  if (!isJpeg && !isPng && !isWebp)
    return NextResponse.json({ error: "圖片內容格式不正確" }, { status: 400 });
  const extension = isJpeg ? "jpg" : isPng ? "png" : "webp";
  const mime = isJpeg ? "image/jpeg" : isPng ? "image/png" : "image/webp";
  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
  await ensureBucket(service);
  const path = `${user.id}/${membership.workspace_id}/avatar.${extension}`;
  const { error } = await service.storage
    .from(bucketName)
    .upload(path, bytes, { upsert: true, contentType: mime });
  if (error)
    return NextResponse.json({ error: "頭像上傳失敗" }, { status: 500 });
  const { data } = service.storage.from(bucketName).getPublicUrl(path);
  const avatarUrl = `${data.publicUrl}?t=${Date.now()}`;
  await service
    .from("egg_creator_profiles")
    .update({ avatar_url: avatarUrl })
    .eq("id", membership.workspace_id);
  return NextResponse.json({ avatarUrl });
}
