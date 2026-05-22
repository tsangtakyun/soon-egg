const themes = [
  { name: "日系清透", swatch: "linear-gradient(135deg,#f8fbff,#dceee5)" },
  { name: "韓系黃昏", swatch: "linear-gradient(135deg,#ffdfb8,#e6a6b8)" },
  { name: "港風霓虹", swatch: "linear-gradient(135deg,#160b2e,#00b8d4,#ff4f7b)" },
  { name: "台系文青", swatch: "linear-gradient(135deg,#f4efe6,#7aa095)" },
  { name: "現代極簡", swatch: "linear-gradient(135deg,#111,#f5f5f4)" },
];

export function DesignPicker() {
  return (
    <div className="grid gap-3 sm:grid-cols-5">
      {themes.map((theme) => (
        <button key={theme.name} type="button" className="rounded-lg border border-zinc-200 bg-white p-3 text-left shadow-sm hover:border-zinc-950">
          <div className="aspect-square rounded-md" style={{ background: theme.swatch }} />
          <div className="mt-3 text-sm font-medium text-zinc-950">{theme.name}</div>
        </button>
      ))}
    </div>
  );
}
