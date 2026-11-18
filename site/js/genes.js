/* ==========================================================
   Part III · Molecules — gene index, gene cards, hash router
   and gene auto-linking.

   Builds one inverted index keyed by gene symbol from every
   source already on the page:
     • Hartenstein stage "genes to know" + italic mentions  (js/data.js)
     • organ-system regulators + organ-timeline mentions     (js/data.js)
     • Calderon 2022 top markers per cell state (Table S1/S3) (data/calderon_states.js)
     • Flysta3D-v2 subcluster markers (S4/S5), TF motifs (S6),
       CNS morphometrics (S7), copper-cell targets (S8),
       new spatial genes (S3)                                 (data/bgi.js)
   Routes:  #gene/<symbol>   #organ/<id>   #stage-<n>
   ========================================================== */
(function () {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const STAGES = window.STAGES, ORGANS = window.ORGANS, LAYERS = window.LAYERS, CS = window.CALDERON_STATES || {}, B = window.BGI || null;
  const CG = window.CALDERON_GENES || null; // every significant marker (Table S3), see data/extract_calderon_genes.py
  const WINDOWS = ["0-2", "2-4", "4-6", "6-8", "8-10", "10-12", "12-14", "14-16", "16-18", "18-20"];
  const TOTAL = 1320;
  const A = () => window.ATLAS || {};

  /* ---------------- index ---------------- */
  const IDX = new Map();
  const LOWER = new Map();
  const SYM = /^[A-Za-z0-9][\w\-:.()'+]*$/;
  function rec(g) {
    g = String(g).trim();
    if (!g || !SYM.test(g)) return null;
    let r = IDX.get(g);
    if (!r) {
      r = { g, stages: new Map(), organs: new Map(), organTL: [], cal: [], sub: [], tf: [], stereo: null, morph: [], copper: null };
      IDX.set(g, r);
      const k = g.toLowerCase(); if (!LOWER.has(k)) LOWER.set(k, g);
    }
    return r;
  }
  const splitGenes = (s) => String(s).split(/\s*(?:\/|→|,|;)\s*/).map((x) => x.trim()).filter(Boolean);
  const italics = (html) => [...String(html || "").matchAll(/<i>([^<]+)<\/i>/g)].flatMap((m) => splitGenes(m[1]));
  const stageRange = (s) => { const n = (String(s).match(/\d+/g) || []).map(Number).filter((x) => x >= 1 && x <= 17); return n.length ? [Math.min(...n), Math.max(...n)] : null; };

  // structured sources first
  STAGES.forEach((st) => st.genes.forEach((g) => splitGenes(g).forEach((x) => { const r = rec(x); if (r) r.stages.set(st.n, "key gene"); })));
  ORGANS.forEach((o) => o.genes.forEach(([g, role]) => splitGenes(g).forEach((x) => { const r = rec(x); if (r) r.organs.set(o.id, role); })));
  const stateObj = (w, name) => (CS[w] || []).find((x) => x.name === name);
  if (CG) {
    Object.entries(CG.genes).forEach(([g, hits]) => { const r = rec(g); if (r) hits.forEach(([si, rank, fc]) => { const [w, name, hex, germ] = CG.states[si]; r.cal.push({ w, s: stateObj(w, name) || { name, hex, germ, markers: [] }, rank, fc }); }); });
  } else {
    WINDOWS.forEach((w) => (CS[w] || []).forEach((s) => s.markers.forEach((m, i) => { const r = rec(m); if (r) r.cal.push({ w, s, rank: i + 1, fc: null }); })));
  }
  const rankOp = (k) => (k <= 10 ? 1 : k <= 50 ? 0.7 : k <= 200 ? 0.4 : 0.18);
  const STRONG = 50; // rank cut-off for "strong" markers in summaries
  if (B) {
    Object.entries(B.subclusters).forEach(([t, rows]) => rows.forEach((x) => {
      splitGenes(x.m).forEach((g) => { const r = rec(g); if (r) r.sub.push({ t, n: x.n, k: x.k, how: "marker" }); });
      (x.c || []).forEach((g) => { const r = rec(g); if (r) r.sub.push({ t, n: x.n, k: x.k, how: "validated" }); });
    }));
    Object.entries(B.cellTFs).forEach(([cell, d]) => d.tfs.forEach((t) => { const r = rec(t.tf); if (r) r.tf.push({ cell, germ: d.germ, diff: t.diff, sig: t.sig }); }));
    B.stereoGenes.forEach(([g, c, t]) => { const r = rec(g); if (r) r.stereo = { c, t }; });
    Object.entries(B.cnsMorph).forEach(([k, o]) => {
      const m = /E([\d.]+)\s*to\s*E([\d.]+)/.exec(k); if (!m) return;
      Object.entries(o).forEach(([metric, gs]) => gs.forEach((g) => { const r = rec(g); if (r) r.morph.push({ a: +m[1], b: +m[2], metric, k }); }));
    });
    B.exexDualUp.forEach(([g, fc]) => { const r = rec(g); if (r) r.copper = fc; });
  }
  // prose mentions: only for symbols already known from a structured list
  STAGES.forEach((st) => italics(st.summary + " " + st.events.join(" ")).forEach((g) => { const r = IDX.get(g); if (r && !r.stages.has(st.n)) r.stages.set(st.n, "mentioned"); }));
  ORGANS.forEach((o) => {
    o.timeline.forEach(([s, txt]) => italics(txt).forEach((g) => { const r = IDX.get(g), rg = stageRange(s); if (r && rg) r.organTL.push({ id: o.id, s, rg, txt }); }));
    italics([o.intro, o.origin, o.c, o.b].join(" ")).forEach((g) => { const r = IDX.get(g); if (r && !r.organs.has(o.id)) r.organs.set(o.id, "mentioned"); });
  });
  const ALL = [...IDX.keys()].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  const resolve = (q) => { q = String(q || "").trim(); return IDX.has(q) ? q : LOWER.get(q.toLowerCase()) || null; };
  window.GENE_INDEX = IDX;

  /* ---------------- time strip ---------------- */
  const L = 150, W = 990, x = (min) => L + (min / TOTAL) * (W - L);
  const stSpan = (a, b) => [STAGES[a - 1].start, STAGES[b - 1].end];
  function whenSvg(r) {
    const rows = [];
    if (r.stages.size) rows.push(["Atlas · stage", "var(--accent)", [...r.stages].map(([n, kind]) => { const [a, b] = stSpan(n, n); return { a, b, c: "var(--accent)", op: kind === "key gene" ? 1 : 0.45, t: `Stage ${n}: ${kind === "key gene" ? "listed as a gene to know" : "mentioned in the stage text"}`, href: `#stage-${n}` }; })]);
    if (r.organTL.length) rows.push(["Atlas · organ timeline", "var(--ink-2)", r.organTL.map((o) => { const org = ORGANS.find((z) => z.id === o.id); const [a, b] = stSpan(o.rg[0], o.rg[1]); return { a, b, c: LAYERS[org.layer].color, op: 0.9, t: `${org.name}, stage ${o.s}: ${o.txt.replace(/<[^>]+>/g, "")}`, href: `#organ/${o.id}` }; })]);
    if (r.cal.length) {
      const segs = [];
      WINDOWS.forEach((w) => {
        const hits = r.cal.filter((c) => c.w === w); if (!hits.length) return;
        const [a, b] = w.split("-").map((h) => +h * 60), step = (b - a) / hits.length;
        hits.sort((p, q) => p.rank - q.rank).forEach((h, i) => segs.push({ a: a + i * step, b: a + (i + 1) * step, c: h.s.hex, op: rankOp(h.rank), t: `${w} h: marker #${h.rank} of “${h.s.name}”${h.fc != null ? ` (log2FC ${h.fc})` : ""}`, state: [w, h.s.name] }));
      });
      rows.push(["Calderon · marker", "var(--calderon)", segs]);
    }
    if (r.morph.length) rows.push(["Flysta3D · CNS shape", "var(--bgi)", r.morph.map((m) => ({ a: m.a * 60, b: m.b * 60, c: "var(--bgi)", op: 0.8, t: `RAPToR ${m.a}–${m.b} h: explains CNS ${m.metric} (Table S7)` }))]);
    if (!rows.length) return `<p class="muted" style="font-size:.88rem">No timing information for <i>${esc(r.g)}</i> in these sources. It appears only in spatial or tissue-level tables (below).</p>`;
    const rowH = 26, top = 30, H = top + rows.length * rowH + 30;
    let s = `<svg viewBox="0 0 ${W} ${H}" class="gene-when" role="img" aria-label="When ${esc(r.g)} appears, in hours after egg laying">`;
    STAGES.forEach((st, i) => {
      const xa = x(st.start), xb = x(st.end);
      if (i) s += `<line x1="${xa}" y1="${top - 6}" x2="${xa}" y2="${top + rows.length * rowH - 2}" stroke="var(--line)"/>`;
      s += `<a href="#stage-${st.n}" class="gw-bg"><rect x="${xa}" y="${top - 6}" width="${xb - xa}" height="${rows.length * rowH + 4}" fill="var(--bg-2)" opacity="0"><title>Stage ${st.n}: ${esc(st.name)}</title></rect></a>`;
      if (xb - xa > 13) s += `<text x="${(xa + xb) / 2}" y="${top - 12}" class="gw-st">${st.n}</text>`;
    });
    rows.forEach(([label, col, segs], i) => {
      const y = top + i * rowH;
      s += `<text x="${L - 10}" y="${y + 13}" class="gw-row" text-anchor="end" fill="${col}">${label}</text>`;
      segs.forEach((g) => {
        const w = Math.max(3, x(g.b) - x(g.a)), rect = `<rect x="${x(g.a)}" y="${y + 2}" width="${w}" height="${rowH - 9}" rx="3" fill="${g.c}" opacity="${g.op}" stroke="var(--card)" stroke-width="1"><title>${esc(g.t)}</title></rect>`;
        s += g.href ? `<a href="${g.href}">${rect}</a>` : g.state ? `<g class="gw-state" data-w="${g.state[0]}" data-name="${encodeURIComponent(g.state[1])}">${rect}</g>` : rect;
      });
    });
    const yb = top + rows.length * rowH + 4;
    for (let h = 0; h <= 22; h += 2) s += `<line x1="${x(h * 60)}" y1="${yb}" x2="${x(h * 60)}" y2="${yb + 5}" stroke="var(--ink-3)"/><text x="${x(h * 60)}" y="${yb + 17}" class="gw-h">${h}h</text>`;
    return s + `</svg>`;
  }

  /* ---------------- gene card ---------------- */
  const organName = (id) => (ORGANS.find((o) => o.id === id) || {}).name || id;
  function coMarkers(r) {
    const cnt = new Map();
    r.cal.filter((c) => c.rank <= STRONG).forEach(({ s }) => s.markers.forEach((m) => { if (m !== r.g) cnt.set(m, (cnt.get(m) || 0) + 1); }));
    return [...cnt].sort((a, b) => b[1] - a[1]).slice(0, 12);
  }
  function showGene(q) {
    const g = resolve(q), box = $("#geneCard");
    $("#geneSearch").value = g || q || "";
    if (!g) {
      const ql = String(q).toLowerCase(), sug = ALL.filter((x) => x.toLowerCase().startsWith(ql.slice(0, 2))).slice(0, 12);
      box.innerHTML = `<div class="card"><h3>No gene “${esc(q)}” in these sources</h3><p class="muted">The index covers the Atlas text and the supplementary tables used on this page (${ALL.length} symbols), not the whole genome. ${sug.length ? "Close matches:" : ""}</p><div class="gene-list">${sug.map((s) => `<span>${esc(s)}</span>`).join("")}</div>
        <a class="btn" href="https://flybase.org/search/symbol/${encodeURIComponent(q)}" target="_blank" rel="noopener">Search FlyBase ↗</a></div>`;
      return;
    }
    const r = IDX.get(g);
    const nStates = new Set(r.cal.filter((c) => c.rank <= STRONG).map((c) => c.s.name)).size, nAll = new Set(r.cal.map((c) => c.s.name)).size;
    const facts = [
      r.stages.size && `<span class="tag">${r.stages.size} stage${r.stages.size > 1 ? "s" : ""}</span>`,
      r.organs.size && `<span class="tag">${r.organs.size} organ system${r.organs.size > 1 ? "s" : ""}</span>`,
      nAll && `<span class="tag c" title="strong = ranked in the top ${STRONG} markers of that state">${nStates ? `${nStates} strong · ` : ""}${nAll} Calderon state${nAll > 1 ? "s" : ""}</span>`,
      r.sub.length && `<span class="tag b">${new Set(r.sub.map((s) => s.t + s.n)).size} BGI subclusters</span>`,
      r.tf.length && `<span class="tag b">TF motif in ${r.tf.length} cell types</span>`,
      r.stereo && `<span class="tag b">new spatial pattern</span>`,
      r.copper != null && `<span class="tag b">copper-cell target</span>`
    ].filter(Boolean).join("");

    // WHERE · organs
    const organs = [...r.organs].map(([id, role]) => { const o = ORGANS.find((z) => z.id === id); return `<a class="chip-link" href="#organ/${id}"><i style="background:${LAYERS[o.layer].color}"></i>${esc(o.name)}<b>${role === "mentioned" ? "in text" : role}</b></a>`; }).join("");
    // WHERE · Calderon states (grouped by name)
    const byName = new Map();
    r.cal.forEach(({ w, s, rank }) => { if (!byName.has(s.name)) byName.set(s.name, { s, ws: [], best: rank, bw: w }); const e = byName.get(s.name); e.ws.push(w); if (rank < e.best) { e.best = rank; e.bw = w; } });
    const calChip = ({ s, ws, best, bw }) => `<button data-w="${bw}" data-name="${encodeURIComponent(s.name)}" style="opacity:${Math.max(0.55, rankOp(best))}" title="best rank #${best} (in ${bw} h)"><i style="background:${s.hex}"></i>${esc(s.name)} <small class="muted">#${best} · ${ws.join(", ")} h</small></button>`;
    const calAll = [...byName.values()].sort((p, q) => p.best - q.best), calStrong = calAll.filter((e) => e.best <= STRONG), calWeak = calAll.filter((e) => e.best > STRONG);
    const cal = calAll.length ? calStrong.map(calChip).join("") + (calWeak.length ? `<details class="weak"><summary>${calWeak.length} more state${calWeak.length > 1 ? "s" : ""} where it ranks below #${STRONG}</summary><div class="state-chips">${calWeak.map(calChip).join("")}</div></details>` : "") : "";
    // WHERE · BGI subclusters, grouped by tissue
    const byT = new Map();
    r.sub.forEach((x) => { if (!byT.has(x.t)) byT.set(x.t, new Map()); const m = byT.get(x.t), k = x.n + " · " + x.k; m.set(k, (m.get(k) ? m.get(k) + ", " : "") + x.how); });
    const H = window.BGI_HELP;
    const sub = [...byT].map(([t, m]) => `<div class="gw-tissue"><button class="tissue-btn" data-t="${esc(t)}"><i style="background:${H ? H.tissueColor(t) : "#bbb"}"></i>${esc(t)}</button><span>${[...m].map(([k, how]) => `${esc(k)}${/validated/.test(how) ? ' <em title="validated common marker (Table S5)">✓</em>' : ""}`).join("; ")}</span></div>`).join("");
    const tf = r.tf.sort((a, b) => b.diff - a.diff).map((t) => `<span class="chip-static" title="motif score ${t.diff}${t.sig ? ", targets enriched among markers" : ""}">${esc(t.cell)} <b>${t.diff}${t.sig ? " ★" : ""}</b></span>`).join("");
    const co = coMarkers(r);

    box.innerHTML = `<div class="card gene-head">
        <div><div class="gene-sym">${esc(g)}</div><div class="gene-facts">${facts || '<span class="muted">Listed once in the sources.</span>'}</div></div>
        <div class="gene-ext"><a class="btn" href="https://flybase.org/search/symbol/${encodeURIComponent(g)}" target="_blank" rel="noopener">FlyBase ↗</a><a class="btn" href="https://db.cngb.org/stomics/flysta3d-v2/" target="_blank" rel="noopener" title="Open the Spateo Viewer and search ${esc(g)} to see it in 3D">3D in Flysta3D ↗</a></div>
      </div>
      <div class="card" style="margin-top:16px"><div class="axis-head"><span class="axis-k">Time</span><h4>When</h4><span class="muted">h after egg laying at 25 °C · bars link to the stage, organ or cell state</span></div>${whenSvg(r)}</div>
      <div class="grid-2" style="margin-top:16px">
        <div class="card"><div class="axis-head"><span class="axis-k">Space</span><h4>Where: organs &amp; tissues</h4></div>
          ${organs ? `<h5>Hartenstein organ systems</h5><div class="chip-row">${organs}</div>` : ""}
          ${sub ? `<h5 style="color:var(--bgi)">Flysta3D-v2 subclusters (Tables S4–S5)</h5><div class="gw-tissues">${sub}</div>` : ""}
          ${r.stereo ? `<h5 style="color:var(--bgi)">Newly described spatial pattern (Table S3)</h5><p style="font-size:.88rem;margin:0">${r.stereo.c ? `Cell types: ${esc(r.stereo.c)}<br>` : ""}${r.stereo.t ? `Tissues: ${esc(r.stereo.t)}` : ""}</p>` : ""}
          ${!organs && !sub && !r.stereo ? `<p class="muted" style="font-size:.88rem">No organ- or tissue-level annotation in these sources.</p>` : ""}
        </div>
        <div class="card"><div class="axis-head"><span class="axis-k">Molecules</span><h4>Cell states &amp; regulation</h4></div>
          ${cal ? `<h5 style="color:var(--calderon)">Calderon marker of <span class="muted" style="text-transform:none;letter-spacing:0;font-weight:400">· rank among that state's significant markers</span></h5><div class="state-chips gw-cal">${cal}</div>` : ""}
          ${tf ? `<h5 style="color:var(--bgi)">TF motif enriched in (Table S6)</h5><div class="chip-row">${tf}</div>` : ""}
          ${r.copper != null ? `<h5 style="color:var(--bgi)">Copper cells (Table S8)</h5><p style="font-size:.88rem;margin:0">Dual <i>exex</i> + <i>lab</i> motif target, log2FC +${r.copper} vs. other midgut.</p>` : ""}
          ${co.length ? `<h5>Often co-marks the same states</h5><div class="gene-list">${co.map(([m, n]) => `<span>${esc(m)}<b>×${n}</b></span>`).join("")}</div>` : ""}
          ${!cal && !tf && r.copper == null ? `<p class="muted" style="font-size:.88rem">Not a significant Calderon marker or a Flysta3D TF motif.</p>` : ""}
        </div>
      </div>`;
    $$(".gw-cal button, .gw-state", box).forEach((b) => b.addEventListener("click", () => A().openState && A().openState(b.dataset.w, decodeURIComponent(b.dataset.name))));
    $$(".tissue-btn", box).forEach((b) => b.addEventListener("click", () => H && H.openTissue && H.openTissue(b.dataset.t)));
  }

  /* ---------------- search ---------------- */
  $("#geneList").innerHTML = ALL.map((g) => `<option value="${esc(g)}">`).join("");
  $("#geneCount").textContent = `${ALL.length.toLocaleString()} gene symbols indexed`;
  const go = (g) => { if (g) location.hash = "#gene/" + encodeURIComponent(g); };
  $("#geneSearch").addEventListener("change", (e) => go(e.target.value.trim()));
  $("#geneSearch").addEventListener("keydown", (e) => { if (e.key === "Enter") go(e.target.value.trim()); });
  $("#geneTry").innerHTML = "Try: " + ["twi", "srp", "GATAe", "sage", "elav", "Mef2", "btl", "lab", "Abd-B", "exex"].filter((g) => IDX.has(g)).map((g) => `<a class="gene-link" href="#gene/${encodeURIComponent(g)}">${g}</a>`).join(" · ");

  /* ---------------- auto-link gene symbols ---------------- */
  const SEL = ".gene-list > span, td.gene, span.gene, #stageInfo i, #organPanel i, #stateDetail i, #flysta i, #singlecell i, #concepts i";
  function linkEl(el) {
    if (el.dataset.gl) return; el.dataset.gl = "1";
    if (el.closest("a, button, svg, #geneTry")) return;
    if (el.tagName === "I" && !splitGenes(el.textContent).every((t) => IDX.has(t.replace(/^\(|[).:+]$/g, "")))) return;
    [...el.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim()).forEach((n) => {
      const parts = n.textContent.split(/(\s*[,;/→+]\s*|\s+)/);
      if (!parts.some((p) => IDX.has(p.replace(/^\(|[).:]$/g, "")))) return;
      const frag = document.createDocumentFragment();
      parts.forEach((p) => {
        const core = p.replace(/^\(|[).:]$/g, "");
        if (core && IDX.has(core)) {
          const i = p.indexOf(core);
          if (i) frag.append(p.slice(0, i));
          const a = document.createElement("a"); a.className = "gene-link"; a.href = "#gene/" + encodeURIComponent(core); a.textContent = core; frag.append(a);
          if (i + core.length < p.length) frag.append(p.slice(i + core.length));
        } else frag.append(p);
      });
      n.replaceWith(frag);
    });
  }
  const linkAll = (root) => { if (root.matches && root.matches(SEL)) linkEl(root); if (root.querySelectorAll) $$(SEL, root).forEach(linkEl); };
  linkAll(document.body);
  new MutationObserver((ms) => ms.forEach((m) => m.addedNodes.forEach((n) => n.nodeType === 1 && linkAll(n)))).observe(document.body, { childList: true, subtree: true });

  /* ---------------- router ---------------- */
  function reveal(id) {
    const el = document.getElementById(id); if (!el) return;
    const t = el.getBoundingClientRect().top;
    if (t < -40 || t > innerHeight * 0.4) el.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }
  function route() {
    let h = location.hash.slice(1); try { h = decodeURIComponent(h); } catch (e) {}
    let m;
    if ((m = /^gene\/(.+)$/.exec(h))) { showGene(m[1]); reveal("genes"); }
    else if ((m = /^organ\/([^/]+)(?:\/(\d+))?$/.exec(h)) && A().setOrgan) { if (m[2]) A().setStage(+m[2]); if (A().setOrgan(m[1])) reveal(m[2] ? "organTabs" : "organs"); }
    else if ((m = /^stage-(\d+)$/.exec(h)) && A().setStage) { A().setStage(+m[1]); reveal("stages"); }
  }
  addEventListener("hashchange", route);
  if (/^#(gene|organ)\//.test(location.hash) || /^#stage-\d+$/.test(location.hash)) route(); else showGene("twi");
  /* keep the URL in step with what the reader picked (shareable links, no history spam) */
  let ready = false;
  const setUrl = (h) => { if (ready && location.hash !== h) history.replaceState(null, "", h); };
  document.addEventListener("atlas:stage", (e) => setUrl("#stage-" + e.detail));
  document.addEventListener("atlas:organ", (e) => setUrl("#organ/" + e.detail));
  setTimeout(() => (ready = true), 0);
})();
