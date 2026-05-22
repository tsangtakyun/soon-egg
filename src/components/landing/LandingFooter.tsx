import Link from "next/link";
import { Camera, PlayCircle } from "lucide-react";

const productLinks = ["Link in Bio", "Media Kit", "品牌合作", "數位產品"];
const companyLinks = ["關於我們", "聯絡", "條款", "私隱"];

export default function LandingFooter() {
  return (
    <footer className="bg-[#fafafa]">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0a0a0a] text-sm font-black text-[#f5a623]">SE</span>
            <span className="text-lg font-black text-[#0a0a0a]">SOON-EGG</span>
          </Link>
          <p className="mt-4 text-sm leading-6 text-zinc-600">亞洲創作者的變現中樞</p>
        </div>
        <FooterColumn title="產品" links={productLinks} />
        <FooterColumn title="公司" links={companyLinks} />
        <div>
          <h3 className="text-sm font-black text-[#0a0a0a]">社交</h3>
          <div className="mt-4 flex gap-3">
            <Link href="#" className="rounded-full border border-black/10 p-2 text-zinc-600 hover:text-black" aria-label="Instagram"><Camera className="h-5 w-5" /></Link>
            <Link href="#" className="rounded-full border border-black/10 p-2 text-zinc-600 hover:text-black" aria-label="YouTube"><PlayCircle className="h-5 w-5" /></Link>
          </div>
        </div>
      </div>
      <div className="border-t border-black/10 px-6 py-6 text-center text-sm text-zinc-500">
        © 2026 SOON-EGG · their.studio Limited · 香港
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: string[] }) {
  return (
    <div>
      <h3 className="text-sm font-black text-[#0a0a0a]">{title}</h3>
      <ul className="mt-4 space-y-3 text-sm text-zinc-600">
        {links.map((link) => (
          <li key={link}><Link href="#" className="hover:text-black">{link}</Link></li>
        ))}
      </ul>
    </div>
  );
}
