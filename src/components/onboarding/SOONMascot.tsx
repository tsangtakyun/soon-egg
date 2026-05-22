export function SOONMascot({ mood = "happy" }: { mood?: "happy" | "thinking" | "excited" }) {
  return (
    <div className="mb-6 flex justify-center">
      <div className={`relative ${mood === "thinking" ? "animate-bounce" : ""}`}>
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-500 shadow-lg">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden>
            <circle cx="11" cy="13" r="2.5" fill="white" />
            <circle cx="21" cy="13" r="2.5" fill="white" />
            <circle cx="12" cy="13" r="1.2" fill="#1e40af" />
            <circle cx="22" cy="13" r="1.2" fill="#1e40af" />
            {mood === "happy" && <path d="M11 20 Q16 24 21 20" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none" />}
            {mood === "thinking" && <path d="M12 21 Q16 21 20 21" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none" />}
            {mood === "excited" && <path d="M10 19 Q16 25 22 19" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none" />}
          </svg>
        </div>
        <div className="absolute -top-3 left-1/2 h-4 w-1 -translate-x-1/2 rounded-full bg-blue-400" />
        <div className="absolute -top-4 left-1/2 h-3 w-3 -translate-x-1/2 rounded-full bg-blue-300" />
      </div>
    </div>
  );
}
