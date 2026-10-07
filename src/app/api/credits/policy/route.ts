import { NextResponse } from "next/server";
import { CREDIT_ACTIONS, CREDIT_ENTITLEMENTS, CREDIT_POLICY_VERSION, CREDIT_WALLET_READY, trialPreviewPolicy } from "@/lib/credits/policy";

export function GET() {
  return NextResponse.json({
    version: CREDIT_POLICY_VERSION,
    chargingEnabled: CREDIT_WALLET_READY,
    walletStatus: "not_configured",
    walletScope: "workspace",
    trial: trialPreviewPolicy(process.env.EGG_TRIAL_PREVIEW_CREDITS),
    settlement: { unknownRefundMinutes: 15, lateDeliveryRecharged: false, crossPeriodRefund: "reversal_only" },
    purchaseEnabled: false,
    entitlements: CREDIT_ENTITLEMENTS,
    actions: CREDIT_ACTIONS,
  });
}
