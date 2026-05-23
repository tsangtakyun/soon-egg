import { createClient as createServiceClient, type SupabaseClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const AVATAR_BUCKET = "avatars";
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

async function ensureAvatarBucket(supabase: SupabaseClient) {
  const { data: bucket } = await supabase.storage.getBucket(AVATAR_BUCKET);

  if (!bucket) {
    const { error } = await supabase.storage.createBucket(AVATAR_BUCKET, {
      public: true,
      fileSizeLimit: MAX_FILE_SIZE,
      allowedMimeTypes: ALLOWED_MIME_TYPES,
    });

    if (error && !error.message.toLowerCase().includes("already exists")) {
      throw error;
    }

    return;
  }

  if (!bucket.public) {
    const { error } = await supabase.storage.updateBucket(AVATAR_BUCKET, {
      public: true,
      fileSizeLimit: MAX_FILE_SIZE,
      allowedMimeTypes: ALLOWED_MIME_TYPES,
    });

    if (error) throw error;
  }
}

export async function POST(req: NextRequest) {
  const authSupabase = await createClient();
  const { data: { user } = { user: null } } = authSupabase ? await authSupabase.auth.getUser() : { data: { user: null } };

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing avatar file" }, { status: 400 });
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "File is too large" }, { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    return NextResponse.json({ error: "Storage is not configured" }, { status: 500 });
  }

  try {
    const serviceSupabase = createServiceClient(url, serviceKey, {
      auth: { persistSession: false },
    });

    await ensureAvatarBucket(serviceSupabase);

    const extensionFromName = file.name.split(".").pop()?.toLowerCase();
    const extensionFromType = file.type.split("/")[1]?.toLowerCase();
    const extension = extensionFromName || extensionFromType || "jpg";
    const safeExtension = extension === "jpeg" ? "jpg" : extension;
    const path = `${user.id}/avatar.${safeExtension}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await serviceSupabase.storage.from(AVATAR_BUCKET).upload(path, buffer, {
      upsert: true,
      contentType: file.type,
    });

    if (uploadError) throw uploadError;

    const { data } = serviceSupabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
    const avatarUrl = `${data.publicUrl}?t=${Date.now()}`;

    const { error: updateError } = await serviceSupabase
      .from("egg_creator_profiles")
      .update({ avatar_url: avatarUrl })
      .eq("user_id", user.id);

    if (updateError) throw updateError;

    return NextResponse.json({ avatarUrl });
  } catch (error) {
    console.error("Avatar upload error:", error);
    return NextResponse.json({ error: "Avatar upload failed" }, { status: 500 });
  }
}
