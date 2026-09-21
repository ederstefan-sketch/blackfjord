// blackfjord.at – liefert die statische Seite aus und nimmt Anfragen unter /api/contact entgegen.

const ERLAUBTE_ORIGINS = new Set([
  "https://blackfjord.at",
  "https://www.blackfjord.at",
  "https://drop-207f22dd-fd0.eder-stefan.workers.dev",
]);

const ARTEN = {
  immo: "Immobilien (blackfjord.immo)",
  ventures: "Ventures (blackfjord.ventures)",
  gold: "Gold (blackfjord.gold)",
  allgemein: "Allgemein",
};

function antwort(status, body, extra = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...extra },
  });
}

function bereinigen(text, max) {
  return String(text ?? "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim()
    .slice(0, max);
}

async function anfrageSpeichern(request, env) {
  if (request.method !== "POST") {
    return antwort(405, { ok: false, error: "method" }, { allow: "POST" });
  }
  const origin = request.headers.get("origin");
  if (!origin || !ERLAUBTE_ORIGINS.has(origin)) {
    return antwort(403, { ok: false, error: "origin" });
  }

  let daten;
  try {
    const roh = await request.text();
    if (roh.length > 12000) return antwort(413, { ok: false, error: "size" });
    daten = JSON.parse(roh);
  } catch {
    return antwort(400, { ok: false, error: "json" });
  }

  // Spam-Schutz: verstecktes Feld ausgefüllt oder Formular zu schnell abgeschickt -> stillschweigend "ok"
  if (daten.website || Number(daten.elapsed) < 3000) {
    return antwort(200, { ok: true });
  }

  const art = Object.hasOwn(ARTEN, daten.art) ? daten.art : null;
  const name = bereinigen(daten.name, 100);
  const email = bereinigen(daten.email, 200);
  const nachricht = bereinigen(daten.nachricht, 4000);
  const mailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);

  if (!art || name.length < 2 || !mailOk || nachricht.length < 10 || daten.consent !== true) {
    return antwort(400, { ok: false, error: "invalid" });
  }

  // Grobe Bremse gegen Missbrauch (ohne Speicherung von IP-Adressen)
  const { c } = await env.DB
    .prepare("SELECT COUNT(*) AS c FROM anfragen WHERE erstellt > datetime('now','-10 minutes')")
    .first();
  if (c >= 20) return antwort(429, { ok: false, error: "rate" });

  await env.DB
    .prepare("INSERT INTO anfragen (art, name, email, nachricht) VALUES (?1, ?2, ?3, ?4)")
    .bind(art, name, email, nachricht)
    .run();

  // Optional: E-Mail-Benachrichtigung, sobald Cloudflare Email Service eingerichtet ist
  if (env.EMAIL && env.NOTIFY_TO) {
    try {
      await env.EMAIL.send({
        to: env.NOTIFY_TO,
        from: env.NOTIFY_FROM || "formular@blackfjord.at",
        subject: `Neue Anfrage: ${ARTEN[art]}`,
        text: `Bereich: ${ARTEN[art]}\nName: ${name}\nE-Mail: ${email}\n\n${nachricht}\n`,
      });
    } catch (fehler) {
      console.log("Benachrichtigung fehlgeschlagen", String(fehler));
    }
  }

  return antwort(200, { ok: true });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/contact") {
      try {
        return await anfrageSpeichern(request, env);
      } catch (fehler) {
        console.log("Fehler bei /api/contact", String(fehler));
        return antwort(500, { ok: false, error: "server" });
      }
    }
    return env.ASSETS.fetch(request);
  },
};
