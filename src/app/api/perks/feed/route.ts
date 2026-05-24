export async function GET() {
  const res = await fetch(`${process.env.CW_BASE_URL}/api/public/perks`, {
    headers: {
      "x-soon-api-key": process.env.SOON_INTERNAL_API_KEY ?? "",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    console.error("[perks/feed] CW error:", res.status, await res.text());
    return Response.json({ perks: [] });
  }

  const data = await res.json();
  return Response.json(data);
}
