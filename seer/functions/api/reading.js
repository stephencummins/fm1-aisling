// POST /api/reading: hands a three-card reading to Sídhe's engine and returns its interpretation.
// The engine sends no CORS headers, so the page cannot call it itself; this forwards the request server to server.
const ENGINE = "https://sidhe.stephen8n.com/api/generate-tarot-interpretation";

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

export async function onRequestPost({ request }) {
  let body;
  try { body = await request.json(); } catch { return json({ error: "Send JSON." }, 400); }
  const cards = Array.isArray(body?.cards) ? body.cards.slice(0, 3) : [];
  const ok = cards.length === 3 && cards.every((c) => typeof c?.name === "string" && c.name.length < 40 &&
    typeof c?.position === "string" && c.position.length < 40 && typeof c?.isReversed === "boolean");
  if (!ok) return json({ error: "Three cards, each with a name, a position and isReversed." }, 400);
  const meaningType = body.meaningType === "traditional" ? "traditional" : "celtic";
  const question = String(body.question || "").slice(0, 1500);
  let upstream;
  try {
    upstream = await fetch(ENGINE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cards: cards.map(({ name, position, isReversed }) => ({ name, position, isReversed })), question, spreadName: "Three Card Spread", meaningType }),
    });
  } catch {
    return json({ error: "The engine could not be reached." }, 502);
  }
  if (!upstream.ok) return json({ error: "The engine did not answer." }, upstream.status === 429 ? 429 : 502);
  const { interpretation } = await upstream.json().catch(() => ({}));
  return json({ interpretation: String(interpretation || "") });
}

export const onRequest = () => json({ error: "POST only." }, 405);
