export default function LandingFooter() {
  return (
    <footer className="border-t border-gray-100 bg-[#fafafa] py-8">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-3 px-6 text-center">
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/soon-egg.png" alt="SOON-EGG" className="h-7 w-auto object-contain" />
        </div>
        <p className="text-sm text-gray-500">亞洲創作者的變現中樞</p>
        <p className="text-xs text-gray-400">© 2026 SOON-EGG · their.studio Limited · 香港</p>
      </div>
    </footer>
  );
}
