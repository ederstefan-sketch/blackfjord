(function () {
  var form = document.getElementById("anfrage");
  if (!form) return;
  var status = document.getElementById("form-status");
  var button = form.querySelector('button[type="submit"]');
  var geladen = Date.now();
  function meldung(text, art) { status.textContent = text; status.className = "form-status" + (art ? " " + art : ""); }

  // Paket-Buttons wählen das passende Feld im Formular vor
  document.querySelectorAll("[data-paket]").forEach(function (el) {
    el.addEventListener("click", function () {
      var radio = form.querySelector('input[name="paket"][value="' + el.getAttribute("data-paket") + '"]');
      if (radio) radio.checked = true;
    });
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var f = form.elements;
    var name = f.name.value.trim(), email = f.email.value.trim(), text = f.nachricht.value.trim();
    if (name.length < 2) { meldung("Bitte geben Sie Ihren Namen an.", "err"); f.name.focus(); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { meldung("Bitte geben Sie eine gültige E-Mail-Adresse an.", "err"); f.email.focus(); return; }
    if (text.length < 10) { meldung("Bitte schreiben Sie uns ein paar Worte mehr.", "err"); f.nachricht.focus(); return; }
    if (!f.consent.checked) { meldung("Bitte bestätigen Sie die Datenschutzerklärung.", "err"); f.consent.focus(); return; }
    var paketEl = form.querySelector('input[name="paket"]:checked');
    var paket = paketEl && paketEl.value !== "Noch offen" ? paketEl.value : "";
    var artEl = form.querySelector('input[name="art"]:checked') || form.querySelector('input[name="art"]');
    button.disabled = true; meldung("Wird gesendet …");
    fetch("/api/contact", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        art: artEl.value,
        name: name, email: email,
        nachricht: (paket ? "Paket: " + paket + "\n\n" : "") + text,
        consent: true, website: f.website.value, elapsed: Date.now() - geladen
      })
    }).then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { return r.ok && d.ok; }); })
      .then(function (ok) {
        if (!ok) throw new Error("fehler");
        form.innerHTML = '<p class="form-done">Vielen Dank. Ihre Anfrage ist bei uns eingegangen, wir melden uns bald bei Ihnen.</p>';
      })
      .catch(function () {
        button.disabled = false;
        meldung("Das hat leider nicht geklappt. Bitte schreiben Sie uns direkt an office@blackfjord.at.", "err");
      });
  });
})();
