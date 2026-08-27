export const RESERVED_PROFILE_USERNAMES = new Set([
  "active-deals",
  "analytics",
  "api",
  "auth",
  "brand-deals",
  "brands",
  "credits",
  "dashboard",
  "login",
  "media-kit",
  "mediakit",
  "onboarding",
  "products",
  "profile",
  "settings",
  "shop",
  "signup",
  "tools",
]);

export function normalizeProfileUsername(value: string) {
  return value.trim().toLowerCase();
}

export function isValidProfileUsername(value: string) {
  const normalized = normalizeProfileUsername(value);
  return (
    normalized.length >= 3 &&
    normalized.length <= 30 &&
    /^[a-z0-9](?:[a-z0-9._-]{1,28}[a-z0-9])$/.test(normalized) &&
    !RESERVED_PROFILE_USERNAMES.has(normalized)
  );
}
