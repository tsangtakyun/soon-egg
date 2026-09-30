import { NextResponse } from "next/server";
import { getEggRequestContext } from "@/lib/egg-api-context";
import { refreshInstagramCover } from "@/lib/instagram-covers";

export async function POST(request: Request) {
  const context = await getEggRequestContext(request);
  if (!context) return NextResponse.json({ error: "請先登入" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  if (typeof body.mediaId !== "string" || !/^[a-zA-Z0-9-]{1,100}$/.test(body.mediaId))
    return NextResponse.json({ error: "題材識別碼不正確" }, { status: 400 });
  try {
    const imageUrl = await refreshInstagramCover(context.admin, context.workspaceId, body.mediaId);
    return NextResponse.json({ imageUrl }, { status: imageUrl ? 200 : 404, headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "封面暫未能載入" }, { status: 502 });
  }
}
