import { NextResponse } from "next/server";
import { CREDIT_ACTIONS, CREDIT_ENTITLEMENTS, CREDIT_POLICY_VERSION } from "@/lib/credits/policy";

export function GET() {
  return NextResponse.json({
    version: CREDIT_POLICY_VERSION,
    chargingEnabled: process.env.EGG_CREDIT_V2_ENABLED === "true",
    purchaseEnabled: false,
    entitlements: CREDIT_ENTITLEMENTS,
    actions: CREDIT_ACTIONS,
  });
}
