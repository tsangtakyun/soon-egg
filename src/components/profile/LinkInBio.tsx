import { BlockEditor } from "./BlockEditor";
import { PhonePreview, type PhonePreviewProfile, type PhonePreviewTheme } from "./PhonePreview";

export function LinkInBio({ profile, theme }: { profile: PhonePreviewProfile; theme: PhonePreviewTheme | null }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <BlockEditor />
      <PhonePreview profile={profile} theme={theme} />
    </div>
  );
}
