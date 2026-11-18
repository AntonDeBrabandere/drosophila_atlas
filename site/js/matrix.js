/* ==========================================================
   Space × Time matrix: 12 organ systems × 17 stages.
   Rows   = organ systems (Hartenstein timelines, js/data.js)
   Cols   = stages 1–17 (follows the global stage cursor)
   Footer = molecular coverage per stage: Calderon annotated
            cell states and Flysta3D-v2 Stereo-seq samples.
   Every cell links to #organ/<id>/<stage>.
   ========================================================== */
(function () {
  const box = document.getElementById("organMatrix"); if (!box) return;
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const strip = (h) => String(h).replace(/<[^>]+>/g, "");
  const STAGES = window.STAGES, ORGANS = window.ORGANS, LAYERS = window.LAYERS, CS = window.CALDERON_STATES || {}, B = window.BGI;
  const WINDOWS = ["0-2", "2-4", "4-6", "6-8", "8-10", "10-12", "12-14", "14-16", "16-18", "18-20"];
  const N = 17, range = (s) => { const n = (String(s).match(/\d+/g) || []).map(Number); return [Math.min(...n), Math.max(...n)]; };

  // molecular coverage per stage
  const calStates = STAGES.map((st) => {
    const names = new Set();
    WINDOWS.forEach((w) => { const [a, b] = w.split("-").map((h) => +h * 60); if (st.start < b && st.end > a) (CS[w] || []).forEach((x) => names.add(x.name)); });
    return names.size;
  });
  const bgiN = STAGES.map((st) => (B ? B.samples.filter((x) => x.stage === st.n).length : 0));
  const maxCal = Math.max(...calStates), maxBgi = Math.max(1, ...bgiN);

  let html = `<div class="mx-grid" style="--n:${N}">`;
  html += `<div class="mx-corner">Stage →</div>` + STAGES.map((st) => `<a class="mx-col" data-n="${st.n}" href="#stage-${st.n}" title="Stage ${st.n}: ${esc(st.name)}" style="--ph:${window.PHASES[st.phase].color}">${st.n}</a>`).join("");
  ORGANS.forEach((o) => {
    const col = LAYERS[o.layer].color;
    const ev = Array.from({ length: N + 1 }, () => []);
    o.timeline.forEach(([s, t]) => { const [a, b] = range(s); for (let n = a; n <= b; n++) ev[n].push(t); });
    const first = ev.findIndex((x, n) => n && x.length);
    html += `<a class="mx-row" data-id="${o.id}" href="#organ/${o.id}"><i style="background:${col}"></i>${esc(o.name)}</a>`;
    for (let n = 1; n <= N; n++) {
      const has = ev[n].length, present = first > 0 && n >= first;
      const tip = has ? `${o.name}, stage ${n}: ${ev[n].map(strip).join(" · ")}` : present ? `${o.name}, stage ${n}: present; no new step in the Atlas timeline` : `${o.name}: not yet formed at stage ${n}`;
      html += `<a class="mx-cell${has ? " ev" : present ? " pr" : ""}" data-id="${o.id}" data-n="${n}" href="#organ/${o.id}/${n}" style="--c:${col}" title="${esc(tip)}" aria-label="${esc(tip)}"></a>`;
    }
  });
  const foot = (label, cls, vals, max, unit, color) => `<div class="mx-row mx-foot ${cls}">${label}</div>` + vals.map((v, i) =>
    `<a class="mx-cell mx-heat" data-n="${i + 1}" href="#stage-${i + 1}" style="--c:${color};--v:${v / max};color:${v / max > 0.45 ? "#fff" : "var(--ink-2)"}" title="Stage ${i + 1}: ${v} ${unit}">${v || ""}</a>`).join("");
  html += foot("Calderon cell states", "c", calStates, maxCal, "annotated cell states in the overlapping 2-h window(s)", "var(--calderon)");
  if (B) html += foot("Flysta3D 3D samples", "b", bgiN, maxBgi, "Stereo-seq samples RAPToR-staged here", "var(--bgi)");
  html += `</div>`;
  box.innerHTML = `<div class="card mx-card"><div class="axis-head"><span class="axis-k">Space × Time</span><h4>When each organ system forms</h4>
    <span class="muted">Filled: a step in the Atlas timeline · tinted: organ present · bottom rows: single-cell coverage (molecules). Columns are stages, not to scale. Click any cell.</span></div>
    <div class="mx-scroll">${html}</div></div>`;

  // follow the global stage cursor and the selected organ
  const mark = () => {
    const A = window.ATLAS || {}, n = A.getStage ? A.getStage() : 0, id = A.getOrgan ? A.getOrgan() : "";
    $$(".mx-col, .mx-cell", box).forEach((el) => el.classList.toggle("cur", +el.dataset.n === n));
    $$(".mx-row[data-id], .mx-cell[data-id]", box).forEach((el) => el.classList.toggle("sel", el.dataset.id === id));
  };
  document.addEventListener("atlas:stage", mark);
  document.addEventListener("atlas:organ", mark);
  mark();
})();
