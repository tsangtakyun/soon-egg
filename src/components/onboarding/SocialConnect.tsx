"use client";

import { Camera, Check, Music2, PlayCircle } from "lucide-react";

const socials = [
  { name: "Instagram", handle: "@soon_egg", icon: Camera, connected: true },
  { name: "YouTube", handle: "@soon_egg", icon: PlayCircle, connected: true },
  { name: "小紅書", handle: "soon_egg", icon: Music2, connected: true },
  { name: "TikTok", handle: "@soon_egg", icon: Music2, connected: false },
  { name: "Threads", handle: "@soon_egg", icon: Music2, connected: false },
];

export function SocialConnect() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {socials.map((social) => {
        const Icon = social.icon;
        return (
          <button key={social.name} type="button" className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white p-4 text-left shadow-sm hover:border-zinc-950">
            <div className="flex items-center gap-3">
              <Icon className="h-5 w-5 text-zinc-700" aria-hidden />
              <div>
                <div className="font-medium text-zinc-950">{social.name}</div>
                <div className="text-sm text-zinc-500">{social.handle}</div>
              </div>
            </div>
            {social.connected ? <Check className="h-5 w-5 text-emerald-500" aria-hidden /> : <span className="text-sm text-zinc-500">連接</span>}
          </button>
        );
      })}
    </div>
  );
}
