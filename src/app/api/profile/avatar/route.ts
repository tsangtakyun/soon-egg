import { createClient as createServiceClient, type SupabaseClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getActiveCreatorProfile } from "@/lib/creator-workspace";

const AVATAR_BUCKET = "avatars";
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

function detectImageType(buffer: Buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mimeType: "image/jpeg", extension: "jpg" };
  }
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { mimeType: "image/png", extension: "png" };
  }
  if (buffer.length >= 12 && buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP") {
    return { mimeType: "image/webp", extension: "webp" };
  }
  const gifHeader = buffer.subarray(0, 6).toString("ascii");
  if (gifHeader === "GIF87a" || gifHeader === "GIF89a") {
    return { mimeType: "image/gif", extension: "gif" };
  }
  return null;
}

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
  if (new URL(req.url).searchParams.get("restore") === "1") return PATCH();
  const authSupabase = await createClient();
  const { data: { user } = { user: null } } = authSupabase ? await authSupabase.auth.getUser() : { data: { user: null } };

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const { profile } = await getActiveCreatorProfile("id");
  if (!profile) return NextResponse.json({ error: "Creator workspace not found" }, { status: 404 });

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

    const buffer = Buffer.from(await file.arrayBuffer());
    const detectedType = detectImageType(buffer);
    if (!detectedType || detectedType.mimeType !== file.type) {
      return NextResponse.json({ error: "File content does not match a supported image type" }, { status: 400 });
    }
    const path = `${user.id}/${profile.id}/avatar.${detectedType.extension}`;

    const { error: uploadError } = await serviceSupabase.storage.from(AVATAR_BUCKET).upload(path, buffer, {
      upsert: true,
      contentType: detectedType.mimeType,
    });

    if (uploadError) throw uploadError;

    const { data } = serviceSupabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
    const avatarUrl = `${data.publicUrl}?t=${Date.now()}`;

    const { error: updateError } = await serviceSupabase
      .from("egg_creator_profiles")
      .update({ avatar_url: avatarUrl })
      .eq("id", profile.id)
      .eq("user_id", user.id);

    if (updateError) throw updateError;

    return NextResponse.json({ avatarUrl });
  } catch (error) {
    console.error("Avatar upload error:", error);
    return NextResponse.json({ error: "Avatar upload failed" }, { status: 500 });
  }
}

export async function PATCH() {
  const authSupabase = await createClient();
  const { data: { user } = { user: null } } = authSupabase ? await authSupabase.auth.getUser() : { data: { user: null } };
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { profile } = await getActiveCreatorProfile("id");
  if (!profile) return NextResponse.json({ error: "Creator workspace not found" }, { status: 404 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return NextResponse.json({ error: "Storage is not configured" }, { status: 500 });

  try {
    const serviceSupabase = createServiceClient(url, serviceKey, { auth: { persistSession: false } });
    const pathPrefix = `${user.id}/${profile.id}`;
    const { data: files, error: listError } = await serviceSupabase.storage.from(AVATAR_BUCKET).list(pathPrefix, { limit: 20 });
    if (listError) throw listError;

    const uploadedAvatar = files?.find((file) => /^avatar\.(?:jpe?g|png|webp|gif)$/i.test(file.name));
    if (!uploadedAvatar) return NextResponse.json({ error: "No uploaded avatar found" }, { status: 404 });

    const objectPath = `${pathPrefix}/${uploadedAvatar.name}`;
    const { data } = serviceSupabase.storage.from(AVATAR_BUCKET).getPublicUrl(objectPath);
    const avatarUrl = `${data.publicUrl}?t=${Date.now()}`;
    const { error: updateError } = await serviceSupabase
      .from("egg_creator_profiles")
      .update({ avatar_url: avatarUrl })
      .eq("id", profile.id)
      .eq("user_id", user.id);
    if (updateError) throw updateError;

    return NextResponse.json({ avatarUrl });
  } catch (error) {
    console.error("Avatar restore error:", error);
    return NextResponse.json({ error: "Avatar restore failed" }, { status: 500 });
  }
}
