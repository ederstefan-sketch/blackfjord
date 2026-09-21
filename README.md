# blackfjord.at

Statische Website der blackfjord GmbH, ausgeliefert über Cloudflare (Workers Static Assets).

## Aufbau
- `public/` – alles, was online geht (HTML, Bilder, `style.css`, `_headers`, `robots.txt`, `sitemap.xml`)
- `public/style.css` – gemeinsames Design für alle Seiten
- `worker.js` – nimmt Formular-Anfragen unter `/api/contact` entgegen und speichert sie in der Cloudflare-Datenbank `blackfjord-anfragen` (Tabelle `anfragen`)
- `wrangler.jsonc` – Cloudflare-Konfiguration (Name muss dem Worker in Cloudflare entsprechen)

## Änderung live stellen
1. Datei in GitHub öffnen, bearbeiten, **Commit** auf `main`.
2. Cloudflare baut und veröffentlicht automatisch (ca. 1 Minute).

## Neue Unterseite
1. `public/impressum.html` kopieren, umbenennen (z. B. `immo.html`), Titel und Inhalt ändern.
2. Link auf die Seite (`/immo`) einbauen und in `public/sitemap.xml` eintragen.
