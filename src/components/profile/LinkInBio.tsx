"use client";

import { useState } from "react";
import { BlockEditor } from "./BlockEditor";
import { PhonePreview, type PhonePreviewProfile, type PhonePreviewTheme, type ProfileBlock } from "./PhonePreview";

export function LinkInBio({
  profile,
  theme,
  blocks: initialBlocks,
}: {
  profile: PhonePreviewProfile;
  theme: PhonePreviewTheme | null;
  blocks: ProfileBlock[];
}) {
  const [blocks, setBlocks] = useState(initialBlocks);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <BlockEditor creatorId={profile.id} blocks={blocks} onBlocksChange={setBlocks} />
      <PhonePreview profile={profile} theme={theme} blocks={blocks} />
    </div>
  );
}
