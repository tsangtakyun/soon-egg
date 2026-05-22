import { BlockEditor } from "./BlockEditor";
import { PhonePreview } from "./PhonePreview";

export function LinkInBio() {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <BlockEditor />
      <PhonePreview />
    </div>
  );
}
