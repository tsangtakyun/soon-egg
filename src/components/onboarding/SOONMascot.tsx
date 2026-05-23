export function SOONMascot({ mood = "happy" }: { mood?: "happy" | "thinking" | "excited" }) {
  void mood;

  return (
    <div className="mb-6 flex justify-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/soon-egg.png"
        alt="SOON-EGG"
        className="h-16 w-16 object-contain"
        style={{ animation: "spin-slow 4s linear infinite" }}
      />
    </div>
  );
}
