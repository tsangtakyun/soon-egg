import { FileDigit, GraduationCap, Package, ShoppingBag, Wrench } from "lucide-react";

export type ProductType = "physical" | "digital" | "service" | "workshop" | "other";

export const productTypeLabels: Record<string, string> = {
  physical: "實體貨品",
  digital: "數碼產品",
  service: "服務",
  workshop: "工作坊",
  other: "其他",
};

export const productTypeBadgeClasses: Record<string, string> = {
  physical: "bg-orange-50 text-orange-600",
  digital: "bg-blue-50 text-blue-600",
  service: "bg-green-50 text-green-600",
  workshop: "bg-purple-50 text-purple-600",
  other: "bg-gray-50 text-gray-600",
};

export function ProductTypeIcon({ type, size = 32 }: { type: string | null | undefined; size?: number }) {
  const iconType = type ?? "other";

  if (iconType === "physical") return <Package size={size} className="text-orange-400" />;
  if (iconType === "digital") return <FileDigit size={size} className="text-blue-400" />;
  if (iconType === "service") return <Wrench size={size} className="text-green-400" />;
  if (iconType === "workshop") return <GraduationCap size={size} className="text-purple-400" />;
  return <ShoppingBag size={size} className="text-gray-400" />;
}
