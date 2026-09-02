const DEFAULT_PLATFORM_ADMINS = ["tsangtakyun@gmail.com"];

export function isEggPlatformAdmin(email: string | null | undefined) {
  if (!email) return false;
  const configured = process.env.EGG_PLATFORM_ADMIN_EMAILS
    ?.split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  const allowed = configured?.length ? configured : DEFAULT_PLATFORM_ADMINS;
  return allowed.includes(email.trim().toLowerCase());
}
