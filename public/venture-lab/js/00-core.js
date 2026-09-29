// ---------- Konfiguration ----------
  window.SB_URL = 'https://moirwvfslgyskxvcfxre.supabase.co';
  window.SB_KEY = 'sb_publishable_yccVaz2j7stfTKGMd-rHtg_PiBq19g0'; // öffentlicher Schlüssel, durch Row Level Security geschützt
  window.CONTACT = 'office@blackfjord.at';
  window.sb = supabase.createClient(SB_URL, SB_KEY);
  window.app = document.getElementById('app');

  window.state = { user: null, profile: null, customers: [], selectedCustomerId: null, ventures: [], venture: null, membership: null, tab: 'chat', threadId: undefined };
  window.TABS = [['chat', 'KI-Chat'], ['memory', 'Gedächtnis'], ['tasks', 'Aufgaben'], ['docs', 'Dokumente'], ['msgs', 'BLACKFJORD']];

// ---------- Hilfsfunktionen (alle Inhalte werden als Text eingefügt, nie als HTML) ----------
  function h(tag, props, ...kids) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(props || {})) {
      if (v === false || v == null) continue;
      if (k === 'class') e.className = v;
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? '' : v);
    }
    for (const c of kids.flat()) {
      if (c == null || c === false) continue;
      e.append(typeof c === 'object' ? c : document.createTextNode(String(c)));
    }
    return e;
  }
  const fmt = (d) => new Date(d).toLocaleDateString('de-AT');
  const fmtT = (d) => new Date(d).toLocaleString('de-AT', { dateStyle: 'short', timeStyle: 'short' });
  const isAdmin = () => state.profile?.role === 'admin';

// ---------- Toast statt alert ----------
  let toastTimer = null;
  function toast(text, kind) {
    let el = document.querySelector('.toast');
    if (!el) { el = h('div', { class: 'toast', role: 'status' }); document.body.append(el); }
    el.className = 'toast' + (kind === 'err' ? ' err' : '');
    el.textContent = text;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.remove(), 4200);
  }
  const fail = (e) => toast(e?.message || 'Etwas ist schiefgelaufen.', 'err');

// ---------- Dialog statt prompt ----------
  function askText(title, placeholder) {
    return new Promise((resolve) => {
      const input = h('input', { type: 'text', maxlength: 120, placeholder: placeholder || '', 'aria-label': title });
      const close = (val) => { box.remove(); resolve(val); };
      const box = h('div', { class: 'modal-backdrop', role: 'presentation', onclick: (e) => { if (e.target === box) close(null); } },
        h('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
          h('h3', {}, title),
          input,
          h('div', { class: 'modal-actions' },
            h('button', { class: 'btn ghost', type: 'button', onclick: () => close(null) }, 'Abbrechen'),
            h('button', { class: 'btn', type: 'button', onclick: () => close(input.value.trim() || null) }, 'OK'))));
      document.body.append(box);
      input.focus();
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') close(input.value.trim() || null);
        if (e.key === 'Escape') close(null);
      });
    });
  }

  function wordmark() { return h('span', { class: 'word' }, 'black', h('b', {}, 'fjord')); }

  function logo() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 32 32'); svg.setAttribute('width', '28'); svg.setAttribute('height', '28');
    svg.setAttribute('aria-hidden', 'true');
    svg.innerHTML = '<polygon points="16,2 28,9 28,23 16,30 4,23 4,9" fill="none" stroke="#C8CCD4" stroke-width="1.6"/>' +
      '<polygon points="8,21 14,11 18,17 21,13 25,21" fill="#4C90F0"/>' +
      '<path d="M7 24.5 Q16 21.5 25 24.5" fill="none" stroke="#C8CCD4" stroke-width="1.2"/>';
    return svg;
  }
