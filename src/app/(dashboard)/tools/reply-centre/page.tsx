import { MasterToolPage } from "@/components/tools/MasterToolPage";
import { ReplyVoiceComposer } from "./ReplyVoiceComposer";

export default function ReplyCentrePage() {
  return <div className="space-y-6"><ReplyVoiceComposer /><MasterToolPage tool="reply_threads" /></div>;
}
