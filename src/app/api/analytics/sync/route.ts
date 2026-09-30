import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "呢個舊同步入口已停用，請使用已連結平台嘅真實數據同步。" },
    { status: 410 },
  );
}
