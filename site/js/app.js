/* ==========================================================
   App logic: stage explorer, organ systems, cell-state
   explorer, lifecycle, glossary, flashcards, theme.
   ========================================================== */
(function () {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  if (window.BGI && !window.BGI_HELP) {
    const B = window.BGI;
    window.BGI_HELP = {
      samplesForStage: (n) => B.samples.filter((x) => x.stage === n),
      tissueColor: (t) => { const A = { foregut: "foregut/hindgut", hindgut: "foregut/hindgut", "somatic muscle": "muscle", "visceral muscle": "muscle", oenocyte: "oenocytes" }; const k = String(t).toLowerCase(); return B.tissueColors[A[k] || k] || "#bbb"; },
      subclustersFor: (keys) => keys.flatMap((k) => (B.subclusters[k] || []).map((x) => ({ ...x, t: k })))
    };
  }
  const STAGES = window.STAGES, ORGANS = window.ORGANS, LAYERS = window.LAYERS, CS = window.CALDERON_STATES;
  const WINDOWS = ["0-2", "2-4", "4-6", "6-8", "8-10", "10-12", "12-14", "14-16", "16-18", "18-20"];
  const TOTAL = 1320; // minutes to hatching (~22 h)
  const hm = (m) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`;
  const winRange = (w) => w.split("-").map((x) => +x * 60);
  const stageWindows = (st) => WINDOWS.filter((w) => { const [a, b] = winRange(w); return st.start < b && st.end > a; });
  const windowStages = (w) => { const [a, b] = winRange(w); return STAGES.filter((s) => s.start < b && s.end > a).map((s) => s.n); };

  /* ---------- theme ---------- */
  try { const t = localStorage.getItem("theme"); if (t) document.documentElement.dataset.theme = t; } catch (e) {}
  $("#themeBtn").addEventListener("click", () => {
    const cur = document.documentElement.dataset.theme || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    const next = cur === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("theme", next); } catch (e) {}
  });

  /* ---------- legend ---------- */
  const legendHTML = () => ["ecto", "neuro", "meso", "endo", "germ", "extra"].map((k) => `<span><i style="background:${LAYERS[k].color}"></i>${LAYERS[k].label}</span>`).join("") +
    `<span><i style="background:var(--yolk);border:1px solid var(--shell)"></i>Yolk</span><span><i style="background:#5a7fb5"></i>Fore-/hindgut</span>`;
  $("#heroLegend").innerHTML = legendHTML();
  $("#stageLegend").innerHTML = legendHTML();

  /* ---------- hero animation ---------- */
  let heroN = 1;
  function heroTick() {
    $("#heroEmbryo").innerHTML = window.renderEmbryo(heroN, { labels: false, section: false, axes: false });
    const s = STAGES[heroN - 1];
    $("#heroCaption").innerHTML = `<b>Stage ${s.n}</b> · ${s.name} · ${hm(s.start)}–${hm(s.end)} h AEL`;
    heroN = heroN % 17 + 1;
  }
  heroTick();
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!reduce) setInterval(heroTick, 1800);

  /* ---------- stage explorer ---------- */
  let cur = 1, playing = null;
  const view = { labels: true, section: true, ventral: false, hide: new Set() };
  const viewOf = () => (view.ventral && window.EMBRYO_VENTRAL(cur) ? "ventral" : "lateral");
  $("#layerToggles").innerHTML = `<label><input type="checkbox" data-k="labels" checked> Labels</label><label><input type="checkbox" data-k="section" checked> Cross-section</label>` +
    window.EMBRYO_LAYERS.map(([k, t]) => `<label><input type="checkbox" data-k="${k}" checked> ${t}</label>`).join("");
  $("#layerToggles").addEventListener("change", (e) => {
    const k = e.target.dataset.k, on = e.target.checked;
    if (k === "labels" || k === "section") view[k] = on; else on ? view.hide.delete(k) : view.hide.add(k);
    drawStageSvg();
  });
  function drawStageSvg(fade) {
    const box = $("#stageSvg");
    box.innerHTML = window.renderEmbryo(cur, { labels: view.labels, section: view.section, hide: [...view.hide], pad: true, view: viewOf() });
    const can = window.EMBRYO_VENTRAL(cur), v = viewOf();
    $$("#viewSwitch button").forEach((b) => { b.setAttribute("aria-pressed", String(b.dataset.v === v)); b.disabled = b.dataset.v === "ventral" && !can; });
    $("#viewHint").textContent = v === "ventral" ? "Seen from below, anterior left, focused on the neuroblast layer. Neuroblasts are shaded by wave: SI darkest, SII mid, SIII palest." : can ? "" : "The ventral view is available for stages 9–12.";
    if (fade && !reduce) { const svg = box.firstElementChild; svg.classList.add("enter"); requestAnimationFrame(() => requestAnimationFrame(() => svg.classList.remove("enter"))); }
    if (focusLayer) setFocus(focusLayer);
  }
  /* hover (or tap) a label or a layer toggle to highlight that tissue layer */
  let focusLayer = null;
  function setFocus(k) {
    focusLayer = k;
    const svg = $("#stageSvg svg"); if (!svg) return;
    svg.classList.toggle("focusing", !!k);
    $$("[data-layer]", svg).forEach((el) => { const l = el.dataset.layer; if (l !== "section") el.classList.toggle("dim", !!k && l !== k); });
    $$("#layerToggles label").forEach((lb) => lb.classList.toggle("hot", !!k && lb.querySelector("input").dataset.k === k));
  }
  $("#stageSvg").addEventListener("pointerover", (e) => { const l = e.target.closest(".lbl[data-layer]"); if (l && e.pointerType === "mouse") setFocus(l.dataset.layer); });
  $("#stageSvg").addEventListener("pointerout", (e) => { if (e.target.closest(".lbl[data-layer]") && e.pointerType === "mouse") setFocus(null); });
  $("#stageSvg").addEventListener("click", (e) => { const l = e.target.closest(".lbl[data-layer]"); setFocus(l && l.dataset.layer !== focusLayer ? l.dataset.layer : null); });
  $("#layerToggles").addEventListener("pointerover", (e) => { const i = e.target.closest("label")?.querySelector("input"); if (i && !["labels", "section"].includes(i.dataset.k)) setFocus(i.dataset.k); });
  $("#layerToggles").addEventListener("pointerleave", () => setFocus(null));
  $("#viewSwitch").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b || b.disabled) return; view.ventral = b.dataset.v === "ventral"; drawStageSvg(true); });
  /* download the current drawing as a standalone SVG (colour tokens resolved for the current theme) */
  function downloadSvg() {
    const svg = $("#stageSvg svg"); if (!svg) return;
    const cs = getComputedStyle(document.documentElement);
    const css = `.seg-name{font:600 7.5px monospace;fill:var(--ink-3)}.svg-label{font:italic 11px Inter,Helvetica,Arial,sans-serif;fill:var(--ink-2)}.svg-label-strong{font:600 12px Inter,Helvetica,Arial,sans-serif;fill:var(--ink)}.sec-title{font-size:9.5px;letter-spacing:.14em;fill:var(--ink-3)}`;
    let s = new XMLSerializer().serializeToString(svg).replace("<style>", "<style>" + css).replace(/ class="([^"]*)\bdim\b/g, ' class="$1');
    s = s.replace(/var\((--[\w-]+)\)/g, (m, v) => cs.getPropertyValue(v).trim() || m);
    s = s.replace("<svg ", `<svg style="background:${cs.getPropertyValue("--card").trim()}" `);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([s], { type: "image/svg+xml" }));
    a.download = `drosophila-stage-${cur}-${viewOf()}.svg`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  const bar = $("#stageBar");
  bar.innerHTML = STAGES.map((s) => `<button data-n="${s.n}" title="Stage ${s.n}: ${s.name}">${s.n}</button>`).join("");
  $("#phaseBar").innerHTML = STAGES.map((s) => `<div style="flex:1;background:${window.PHASES[s.phase].color}"></div>`).join("");
  // phase labels positioned at the first stage of each phase
  let lab = "", seen = {};
  STAGES.forEach((s, i) => { if (!seen[s.phase]) { seen[s.phase] = 1; lab += `<span style="left:${(i / 17) * 100}%">${window.PHASES[s.phase].label}</span>`; } });
  $("#phaseLabels").innerHTML = lab;
  bar.addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) setStage(+b.dataset.n); });

  function drawRuler() {
    const st = STAGES[cur - 1];
    const x = (m) => (m / TOTAL) * 1000;
    let s = `<rect x="0" y="6" width="1000" height="14" rx="3" fill="var(--bg-2)"/>`;
    STAGES.forEach((t) => {
      s += `<rect x="${x(t.start)}" y="6" width="${Math.max(1.2, x(t.end) - x(t.start))}" height="14" fill="${window.PHASES[t.phase].color}" opacity="${t.n === cur ? 1 : 0.35}"/>`;
    });
    s += `<rect x="${x(st.start) - 1}" y="2" width="${Math.max(3, x(st.end) - x(st.start)) + 2}" height="22" fill="none" stroke="var(--accent)" stroke-width="2" rx="2"/>`;
    for (let h = 0; h <= 22; h += 2) {
      s += `<line x1="${x(h * 60)}" y1="24" x2="${x(h * 60)}" y2="30" stroke="var(--calderon)" stroke-width="1.5"/>`;
      s += `<text x="${x(h * 60)}" y="42" font-size="10" text-anchor="${h === 0 ? "start" : h === 22 ? "end" : "middle"}" fill="var(--ink-3)">${h}h</text>`;
    }
    $("#hourRuler").innerHTML = s;
  }

  function stageStatesHTML(st) {
    const ws = stageWindows(st);
    return ws.map((w) => {
      const list = CS[w] || [];
      return `<div style="margin:6px 0 2px"><span class="tag c">${w} h · ${list.length} states</span></div><div class="state-chips">` +
        list.slice(0, 40).map((x) => `<button data-w="${w}" data-name="${encodeURIComponent(x.name)}"><i style="background:${x.hex}"></i>${x.name}</button>`).join("") + `</div>`;
    }).join("");
  }

  function setStage(n) {
    cur = Math.max(1, Math.min(17, n));
    const st = STAGES[cur - 1];
    $$("#stageBar button").forEach((b) => b.classList.toggle("active", +b.dataset.n === cur));
    drawStageSvg(true);
    drawRuler();
    const ph = window.PHASES[st.phase];
    const cText = st.omics.c || `This stage falls in Calderon's <b>${stageWindows(st).join(" / ")} h</b> inferred-age window(s). Its annotated cell states are listed below.`;
    const bText = st.omics.b || `Flysta3D-v2 Stereo-seq embryos are sampled every 0.5–2 h across embryogenesis, with scRNA-/scATAC-seq in 2-h windows. Open the <a href="https://db.cngb.org/stomics/flysta3d-v2/" target="_blank" rel="noopener">Spateo Viewer</a> to see any gene in 3D at this age.`;
    const H = window.BGI_HELP, smp = H ? H.samplesForStage(st.n) : [];
    const tis = {}; smp.forEach((x) => x.tissues.forEach(([t, c]) => { if (t !== "unknown") tis[t] = (tis[t] || 0) + c; }));
    const smpHTML = H ? (smp.length ? `<div class="bgi-samples"><b style="font-size:.85rem">${smp.length} Stereo-seq sample${smp.length > 1 ? "s" : ""} RAPToR-staged to stage ${st.n}:</b> ${smp.map((x) => `<span class="tag b">${x.id} · ${x.age} h</span>`).join("")}
      <div class="state-chips" style="margin-top:6px">${Object.entries(tis).sort((a, b) => b[1] - a[1]).map(([t, c]) => `<span class="chip-static"><i style="background:${H.tissueColor(t)}"></i>${t} <b>${c}</b></span>`).join("")}</div>
      <p class="muted" style="font-size:.78rem;margin:.4em 0 0">Tissue = annotated spatial clusters, summed over samples (Table S2).</p></div>` : `<p class="muted" style="font-size:.82rem;margin:.5em 0 0">No Stereo-seq sample was RAPToR-staged to exactly stage ${st.n}; see neighbouring stages.</p>`) : "";
    $("#stageInfo").innerHTML = `<div class="info-grid"><div>
      <div class="stage-title"><span class="num">${st.n}</span><div><h3 style="margin:0">${st.name}</h3>
      <span class="time">${hm(st.start)} – ${hm(st.end)} h AEL · ${st.end - st.start} min</span></div></div>
      <div style="margin:10px 0 12px"><span class="tag" style="background:${ph.color};color:#fff;border-color:transparent">${ph.label}</span>
      ${stageWindows(st).map((w) => `<span class="tag c">Calderon ${w} h</span>`).join("")}<span class="tag b">Flysta3D-v2 embryo</span></div>
      <p>${st.summary}</p>
      <h4>Key events</h4><ul class="stage-events">${st.events.map((e) => `<li>${e}</li>`).join("")}</ul>
      <h4>Genes to know</h4><div class="gene-list">${st.genes.map((g) => `<span>${g}</span>`).join("")}</div>
      </div><div>
      <div class="omics-box c"><h4 style="color:var(--calderon)">Calderon et al. 2022 · continuum view</h4><p>${cText}</p></div>
      <div class="omics-box b"><h4 style="color:var(--bgi)">Flysta3D-v2 · spatial view</h4><p>${bText}</p>${smpHTML}</div>
      <details style="margin-top:14px"><summary style="cursor:pointer;font-weight:600;font-size:.92rem">Cell states present (sci-RNA-seq, Table S1)</summary>${stageStatesHTML(st)}</details></div></div>`;
    $$("#stageInfo .state-chips button").forEach((b) => b.addEventListener("click", () => {
      selectWindow(b.dataset.w); selectState(b.dataset.w, decodeURIComponent(b.dataset.name));
      document.getElementById("explorer").scrollIntoView();
    }));
    markOrganStage();
    document.dispatchEvent(new CustomEvent("atlas:stage", { detail: cur }));
  }
  $("#prevStage").onclick = () => setStage(cur - 1);
  $("#nextStage").onclick = () => setStage(cur + 1);
  $("#svgStage").onclick = downloadSvg;
  $("#playStage").onclick = () => {
    if (playing) { clearInterval(playing); playing = null; $("#playStage").textContent = "▶ Play"; return; }
    $("#playStage").textContent = "❚❚ Pause";
    playing = setInterval(() => setStage(cur === 17 ? 1 : cur + 1), 1500);
  };
  document.addEventListener("keydown", (e) => {
    if (e.target.matches("input, textarea")) return;
    const r = $("#stages").getBoundingClientRect();
    if (r.top > innerHeight || r.bottom < 0) return;
    if (e.key === "ArrowRight") setStage(cur + 1);
    if (e.key === "ArrowLeft") setStage(cur - 1);
  });
  window.setStage = setStage;
  const hs = /#stage-(\d+)/.exec(location.hash); setStage(hs ? +hs[1] : 1);

  /* ---------- organ systems ---------- */
  let organ = ORGANS[0].id;
  $("#organTabs").innerHTML = ORGANS.map((o) => `<button data-id="${o.id}"><i style="background:${LAYERS[o.layer].color}"></i>${o.name}</button>`).join("");
  $("#organTabs").addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) setOrgan(b.dataset.id); });
  const ORGAN_BGI = { cns: ["CNS", "ventral midline"], pns: ["PNS"], sns: ["foregut"], trachea: ["trachea"], epidermis: ["epidermis", "ectoderm"], gut: ["midgut", "foregut", "hindgut", "Malpighian tubule", "salivary gland"], mesoderm: ["mesoderm"], somatic: ["muscle"], visceral: ["muscle"], fatbody: ["fat body", "hemolymph"], heart: ["muscle"], gonad: ["gonad"] };
  function organSubs(o) {
    const H = window.BGI_HELP; if (!H) return "";
    let subs = H.subclustersFor(ORGAN_BGI[o.id] || []).filter((x) => x.k === "RNA");
    if (o.id === "visceral") subs = subs.filter((x) => /visceral/i.test(x.n));
    if (o.id === "heart") subs = subs.filter((x) => /card|heart|dorsal vessel/i.test(x.n));
    if (o.id === "somatic") subs = subs.filter((x) => !/visceral|card/i.test(x.n));
    if (!subs.length) return "";
    const seen = new Set(); subs = subs.filter((x) => { const k = x.t + x.n; if (seen.has(k)) return false; seen.add(k); return true; });
    return `<details style="margin-top:8px"><summary style="cursor:pointer;font-weight:600;font-size:.88rem">${subs.length} scRNA-seq subclusters (Table S4)</summary>
      <div style="max-height:260px;overflow:auto;margin-top:6px">${subs.map((x) => `<div style="font-size:.84rem;padding:4px 0;border-bottom:1px dashed var(--line)"><b>${x.n}</b> <span class="muted">· ${x.t}</span>${x.m ? `<br><span class="gene" style="font-family:var(--mono);font-size:.78rem">${x.m}</span>` : ""}${x.r ? `<br><small>${x.r}</small>` : ""}</div>`).join("")}</div></details>`;
  }
  /* close-up drawings through time (js/organ-art.js) + a small whole-embryo locator per panel */
  const ORGAN_LAYER = { cns: "cns", pns: "cns", sns: "cns", trachea: "trach", epidermis: "ecto", gut: "gut", mesoderm: "meso", somatic: "meso", visceral: "meso", fatbody: "meso", heart: "meso", gonad: "germ" };
  function organFilm(o) {
    const panels = (window.ORGAN_ART || {})[o.id];
    if (!panels) return "";
    const lay = ORGAN_LAYER[o.id];
    return `<div class="card organ-film"><div class="film-head"><h4>Through time: close-ups</h4><span class="muted">Original schematics, not to scale. The small embryo shows the stage with this tissue highlighted.</span></div><div class="film">` +
      panels.map((p, i) => {
        const n = Math.min(17, Math.max(1, parseInt(p.st, 10)));
        const loc = window.renderEmbryo(n, { labels: false, section: false, axes: false });
        return `<figure class="film-panel"><header><span class="film-st">st ${p.st}</span><b>${window.organArtMd(p.t)}</b><div class="film-loc" data-layer="${lay}" title="Stage ${n}, whole embryo">${loc}</div></header>${window.renderOrganArt(o.id, i)}<figcaption>${window.organArtMd(p.cap)}</figcaption></figure>`;
      }).join("") + `</div></div>`;
  }
  function setOrgan(id) {
    const o = ORGANS.find((x) => x.id === id); if (!o) return false;
    organ = id;
    $$("#organTabs button").forEach((b) => b.classList.toggle("active", b.dataset.id === id));
    $("#organPanel").innerHTML = `<div class="organ-panel">
      <div class="card">
        <div class="origin"><i style="width:10px;height:10px;border-radius:50%;background:${LAYERS[o.layer].color};display:inline-block"></i>${LAYERS[o.layer].label}</div>
        <h3>${o.name}</h3>
        <p class="muted" style="font-size:.9rem"><b>Origin:</b> ${o.origin}</p>
        <p>${o.intro}</p>
        <h4>Core regulators &amp; markers</h4>
        <div class="gene-list">${o.genes.map(([g, r]) => `<span>${g}<b>${r}</b></span>`).join("")}</div>
        <a class="btn" href="${"https://www.sdbonline.org/sites/fly/atlas/" + o.atlas}" target="_blank" rel="noopener">Original Hartenstein plate ↗</a>
      </div>
      <div class="card">
        <h4>Developmental timeline (stage)</h4>
        <ul class="mini-timeline">${o.timeline.map(([s, t]) => { const n = (String(s).match(/\d+/g) || []).map(Number); return `<li data-a="${Math.min(...n)}" data-b="${Math.max(...n)}"><b>${s}</b><span>${t}</span></li>`; }).join("")}</ul>
        <p class="muted now-note" style="font-size:.78rem;margin:4px 0 12px"></p>
        <div class="omics-box c"><h4 style="color:var(--calderon)">Calderon et al. 2022</h4><p>${o.c}</p></div>
        <div class="omics-box b"><h4 style="color:var(--bgi)">Flysta3D-v2 (Wang et al. 2025)</h4><p>${o.b}</p>${organSubs(o)}</div>
      </div></div>${organFilm(o)}`;
    $$("#organPanel .film-loc").forEach((el) => { const k = el.dataset.layer; $$("[data-layer]", el).forEach((g) => { if (g.dataset.layer !== k) g.classList.add("dim"); }); });
    markOrganStage();
    document.dispatchEvent(new CustomEvent("atlas:organ", { detail: id }));
    return true;
  }
  /* global stage cursor: highlight the organ-timeline step(s) covering the current stage */
  function markOrganStage() {
    const lis = $$("#organPanel .mini-timeline li"); if (!lis.length) return;
    let hit = false;
    lis.forEach((li) => { const on = +li.dataset.a <= cur && cur <= +li.dataset.b; li.classList.toggle("now", on); hit = hit || on; });
    const note = $("#organPanel .now-note");
    if (note) note.innerHTML = hit ? `Highlighted: stage ${cur}, the stage selected in Part I.` : `No step of this timeline at stage ${cur} (the stage selected in Part I).`;
  }
  setOrgan(organ);

  /* ---------- cell-state explorer ---------- */
  const GERM_ORDER = ["maternal", "blastoderm / pole", "germ cell", "ectoderm", "neuroectoderm", "mesoderm", "endoderm", "extra-embryonic", "unknown"];
  let curWin = "10-12";
  const maxN = Math.max(...WINDOWS.map((w) => (CS[w] || []).length));
  $("#divChart").innerHTML = WINDOWS.map((w) => `<div data-w="${w}" style="height:${((CS[w] || []).length / maxN) * 100}%" title="${w} h: ${(CS[w] || []).length} annotated states"><span>${(CS[w] || []).length}</span></div>`).join("");
  $("#winPicker").innerHTML = WINDOWS.map((w) => `<button data-w="${w}">${w} h</button>`).join("");
  $("#winPicker").addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) selectWindow(b.dataset.w); });
  $("#divChart").addEventListener("click", (e) => { const b = e.target.closest("div[data-w]"); if (b) selectWindow(b.dataset.w); });

  function chip(w, x) { return `<button data-w="${w}" data-name="${encodeURIComponent(x.name)}"><i style="background:${x.hex}"></i>${x.name}</button>`; }
  function bindChips(root) {
    $$(".state-chips button", root).forEach((b) => b.addEventListener("click", () => selectState(b.dataset.w, decodeURIComponent(b.dataset.name))));
  }
  function selectWindow(w) {
    curWin = w; $("#stateSearch").value = "";
    $$("#winPicker button").forEach((b) => b.classList.toggle("active", b.dataset.w === w));
    $$("#divChart div[data-w]").forEach((b) => b.classList.toggle("active", b.dataset.w === w));
    const list = CS[w] || [];
    const groups = {};
    list.forEach((x) => { (groups[x.germ] = groups[x.germ] || []).push(x); });
    const keys = Object.keys(groups).sort((a, b) => (GERM_ORDER.indexOf(a) + 99 * (GERM_ORDER.indexOf(a) < 0)) - (GERM_ORDER.indexOf(b) + 99 * (GERM_ORDER.indexOf(b) < 0)));
    $("#stateGroups").innerHTML = `<p class="muted" style="font-size:.88rem">Window <b>${w} h</b> ≈ stages ${windowStages(w).join(", ")} · ${list.length} annotated cell states</p>` +
      keys.map((k) => `<div class="germ-group"><h4>${k}</h4><div class="state-chips">${groups[k].map((x) => chip(w, x)).join("")}</div></div>`).join("");
    bindChips($("#stateGroups"));
  }
  function selectState(w, name) {
    const x = (CS[w] || []).find((s) => s.name === name); if (!x) return;
    $$(".state-chips button").forEach((b) => b.classList.toggle("active", b.dataset.w === w && decodeURIComponent(b.dataset.name) === name));
    const other = WINDOWS.filter((ww) => (CS[ww] || []).some((s) => s.name === name));
    $("#stateDetail").innerHTML = `<div class="swatch" style="background:${x.hex}"></div>
      <h3 style="margin-bottom:4px">${x.name}</h3>
      <p class="muted" style="font-size:.88rem;margin-bottom:10px">${x.germ} · window ${w} h (≈ stage ${windowStages(w).join("–")}) · ${x.n} cluster${x.n > 1 ? "s" : ""}</p>
      <h4>Top marker genes</h4>
      <div class="gene-list">${x.markers.length ? x.markers.map((g) => `<span>${g}</span>`).join("") : '<span style="font-style:normal">none significant</span>'}</div>
      <h4>Present in windows</h4>
      <div class="win-picker">${other.map((ww) => `<button data-w="${ww}" class="${ww === w ? "active" : ""}">${ww}</button>`).join("")}</div>
      <p class="muted" style="font-size:.8rem;margin-top:10px">Source: Calderon et al. 2022, Table S1 (manual annotation, colour code) and Table S3 (markers).</p>`;
    $$("#stateDetail .win-picker button").forEach((b) => b.addEventListener("click", () => { selectWindow(b.dataset.w); selectState(b.dataset.w, name); }));
  }
  $("#stateSearch").addEventListener("input", (e) => {
    const q = e.target.value.trim().toLowerCase();
    if (!q) { selectWindow(curWin); return; }
    $$("#winPicker button, #divChart div").forEach((b) => b.classList.remove("active"));
    let html = "";
    WINDOWS.forEach((w) => {
      const hits = (CS[w] || []).filter((x) => x.name.toLowerCase().includes(q) || x.markers.some((g) => g.toLowerCase() === q || (q.length > 2 && g.toLowerCase().startsWith(q))));
      if (hits.length) html += `<div class="germ-group"><h4>${w} h</h4><div class="state-chips">${hits.map((x) => chip(w, x)).join("")}</div></div>`;
    });
    $("#stateGroups").innerHTML = html || `<p class="muted">No cell state or top marker matches “${q}”. Only the top 8 markers per state are indexed.</p>`;
    bindChips($("#stateGroups"));
  });
  selectWindow(curWin);

  /* shared entry points for the router and gene cards (js/genes.js) */
  window.ATLAS = {
    setStage, setOrgan, getStage: () => cur, getOrgan: () => organ,
    openState: (w, name) => { selectWindow(w); selectState(w, name); document.getElementById("explorer").scrollIntoView(); }
  };

  /* ---------- lifecycle ---------- */
  const life = [
    ["Embryo 0–20 h", "0–22 h AEL", "Syncytium → gastrulation → organogenesis → hatching.", [1, 1]],
    ["Larva L1", "~1 day", "Feeding larva. Imaginal discs and adult progenitors (AMPs) stay quiescent.", [0, 1]],
    ["Larva L2–L3", "~2–3 days", "Growth by polyploidy. In late L3 the midgut is remodelled: gastric caeca and EC (<i>Acbp3</i>+) shrink.", [0, 1]],
    ["Pupa P12–P72", "~4 days", "Metamorphosis: larval tissues undergo histolysis and adult structures form. The midgut splits into inner and outer layers.", [0, 1]],
    ["Adult", "", "Midgut regions R1–R5 are already prefigured in the late embryo and larva.", [0, 0]]
  ];
  $("#lifecycle").innerHTML = life.map(([t, d, txt, cov]) => `<div class="life-step"><b>${t}</b><span class="t">${d}</span><p style="margin:.4em 0 0">${txt}</p>
    <div class="cov"><i class="${cov[0] ? "c" : ""}" title="Calderon"></i><i class="${cov[1] ? "b" : ""}" title="Flysta3D-v2"></i></div></div>`).join("");

  /* ---------- glossary & flashcards ---------- */
  $("#glossary").innerHTML = window.GLOSSARY.map(([a, b]) => `<div><b>${a}</b>${b}</div>`).join("");
  $("#flashcards").innerHTML = window.FLASHCARDS.map(([q, a]) => `<div class="flash" tabindex="0"><div class="flash-inner">
    <div class="flash-face"><small>Question</small>${q}</div><div class="flash-face back"><small>Answer</small>${a}</div></div></div>`).join("");
  $$(".flash").forEach((c) => {
    c.addEventListener("click", () => c.classList.toggle("flipped"));
    c.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); c.classList.toggle("flipped"); } });
  });

  /* ---------- nav highlight ---------- */
  const secs = $$("section.block, footer");
  const io = new IntersectionObserver((ents) => ents.forEach((en) => {
    if (en.isIntersecting) $$(".navlinks a").forEach((a) => a.classList.toggle("active", a.getAttribute("href") === "#" + en.target.id));
  }), { rootMargin: "-40% 0px -55% 0px" });
  secs.forEach((s) => io.observe(s));
})();
