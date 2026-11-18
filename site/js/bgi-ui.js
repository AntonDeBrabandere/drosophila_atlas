/* ==========================================================
   Flysta3D-v2 (Wang et al., Cell 2025) explorer — built from
   the supplementary tables (data/bgi.js, see extract_bgi.py).
   ========================================================== */
(function () {
  const BGI = window.BGI; if (!BGI) return;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const TALIAS = { foregut: "foregut/hindgut", hindgut: "foregut/hindgut", "somatic muscle": "muscle", "visceral muscle": "muscle", oenocyte: "oenocytes", "cellsular blastoderm": "cellular blastoderm" };
  const tcol = (t) => { const k = String(t).toLowerCase(); return BGI.tissueColors[TALIAS[k] || k] || "#bbb"; };
  const ccol = (t) => BGI.cellColors[String(t).toLowerCase()] || "#999";

  /* ---------------- shared helpers for other scripts ---------------- */
  window.BGI_HELP = {
    samplesForStage: (n) => BGI.samples.filter((s) => s.stage === n),
    tissueColor: tcol,
    subclustersFor: (keys) => keys.flatMap((k) => (BGI.subclusters[k] || []).map((x) => ({ ...x, t: k })))
  };

  /* ---------------- tabs ---------------- */
  const tabs = $("#bgiTabs"); if (!tabs) return;
  tabs.addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    $$("#bgiTabs button").forEach((x) => x.classList.toggle("active", x === b));
    $$(".bgi-pane").forEach((p) => (p.hidden = p.id !== b.dataset.pane));
  });

  /* =========================================================
     1. METRO MAP of tissue differentiation (Table S6 TFs)
     ========================================================= */
  const METRO = {
    ectoderm: { trunk: ["ectoderm anlage in statu nascendi", "ectoderm anlage", "ectoderm primordium"], lines: [
      ["Epidermis", "epidermis", ["epidermis primordium", "epidermis early", "epidermis mid early", "epidermis mid late", "epidermis late"]],
      ["Tendon cells", "epidermis", ["tendon cells early", "tendon cells late"]],
      ["CNS", "cns", ["procephalic ectoderm primordium", "procephalic ectoderm", "neural progenitors", "neuroblasts", "ganglion mother cells", "undifferentiated neurons", "mature neurons"]],
      ["Glia", "cns", ["glia"]],
      ["PNS", "pns", ["sensory primordium", "sensory complexes"]],
      ["Trachea", "trachea", ["tracheal anlage", "tracheal primordium", "tracheal system early", "tracheal system mid", "tracheal system late"]],
      ["Foregut", "foregut/hindgut", ["foregut primordium", "foregut early", "foregut late", "proventriculus", "foregut/ring gland"]],
      ["Hindgut", "foregut/hindgut", ["hindgut primordium", "hindgut early", "hindgut mid", "hindgut late", "anal pad"]],
      ["Malpighian tubule", "malpighian tubule", ["Malpighian tubule anlage", "Malpighian tubule primordium", "Malpighian tubule"]],
      ["Salivary gland", "salivary gland", ["salivary gland primordium", "salivary gland"]],
      ["Oenocytes", "oenocytes", ["oenocytes"]],
      ["Posterior spiracle", "trachea", ["posterior spiracle"]]] },
    mesoderm: { trunk: ["mesoderm anlage", "mesoderm primordium"], lines: [
      ["Somatic muscle", "muscle", ["somatic mesoderm", "somatic muscle primordium", "somatic muscle early", "somatic muscle late"]],
      ["Visceral muscle 1", "muscle", ["visceral mesoderm", "visceral muscle primordium", "visceral muscle 1 early", "visceral muscle 1 late"]],
      ["Visceral muscle 2", "muscle", ["visceral muscle 2 early", "visceral muscle 2 mid", "visceral muscle 2 late"]],
      ["Heart", "muscle", ["cardiogenic mesoderm", "cardial cell primordium", "cardial cells", "dorsal vessel"]],
      ["Fat body", "fat body", ["fat body primordium", "fat body early", "fat body mid early", "fat body mid late", "fat body late"]],
      ["Plasmatocytes", "hemolymph", ["hemocyte primordium", "plasmatocyte anlage", "plasmatocyte primordium", "plasmatocytes early", "plasmatocytes late"]],
      ["Crystal cells", "hemolymph", ["crystal cells"]]] },
    endoderm: { trunk: ["endoderm anlage", "endoderm primordium", "midgut primordium"], lines: [
      ["Copper cells", "midgut", ["copper cells early", "copper cells late"]],
      ["AMP / EE", "midgut", ["AMP/EE progenitors", "adult midgut precursors"]],
      ["Entero-endocrine", "midgut", ["entero-endocrine cells"]],
      ["Enterocytes 1", "midgut", ["enterocytes early", "enterocytes 1 mid", "enterocytes 1 late", "enterocytes"]],
      ["Enterocytes 2", "midgut", ["enterocytes 2 mid early", "enterocytes 2 mid late", "enterocytes 2 late"]],
      ["Midgut chamber 1", "midgut", ["midgut chamber 1 late"]],
      ["Midgut chamber 2", "midgut", ["midgut chamber 2 early", "midgut chamber 2 late"]],
      ["Midgut chamber 3", "midgut", ["midgut chamber 3 early", "midgut chamber 3 late"]],
      ["Gastric caecum", "midgut", ["gastric caecum"]]] }
  };
  const GL_COL = { ectoderm: "var(--ecto)", mesoderm: "var(--meso)", endoderm: "var(--endo)" };
  const short = (name, line) => {
    const l = line.toLowerCase();
    let s = name.replace(new RegExp("^" + l.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&") + "\\b\\s*", "i"), "").replace(/^\//, "");
    return s || name;
  };
  function wrapLbl(x, y, str) {
    const words = str.split(" "), lines = [""];
    words.forEach((w) => { const l = lines[lines.length - 1]; if ((l + " " + w).trim().length > 15 && l) lines.push(w); else lines[lines.length - 1] = (l + " " + w).trim(); });
    return `<text x="${x}" y="${y}" text-anchor="middle" class="metro-lbl">${lines.map((l, i) => `<tspan x="${x}" dy="${i ? 11 : 0}">${esc(l)}</tspan>`).join("")}</text>`;
  }
  let metroGL = "ectoderm";
  function drawMetro() {
    const M = METRO[metroGL];
    const rowH = 52, x0 = 60, stepT = 112, step = 104, top = 34;
    const trunkEnd = x0 + (M.trunk.length - 1) * stepT;
    const nRows = M.lines.length, H = top + nRows * rowH + 20;
    const midY = top + ((nRows - 1) * rowH) / 2;
    const maxLen = Math.max(...M.lines.map((l) => l[2].length));
    const W = trunkEnd + 150 + maxLen * step;
    let s = `<svg viewBox="0 0 ${W} ${H}" style="width:${W}px;max-width:none;height:auto;display:block">`;
    // trunk
    s += `<line x1="${x0}" y1="${midY}" x2="${trunkEnd}" y2="${midY}" stroke="${GL_COL[metroGL]}" stroke-width="7" stroke-linecap="round"/>`;
    M.lines.forEach(([title, tissue, st], i) => {
      const y = top + i * rowH, bx = trunkEnd + 60, c = tcol(tissue);
      s += `<path d="M${trunkEnd},${midY} C ${trunkEnd + 40},${midY} ${bx - 40},${y} ${bx},${y} L ${bx + (st.length - 1) * step + 10},${y}" fill="none" stroke="${c}" stroke-width="6" stroke-linecap="round" opacity=".9"/>`;
      s += `<text x="${bx - 8}" y="${y - 9}" text-anchor="start" class="metro-line">${esc(title)}</text>`;
      st.forEach((name, j) => {
        const x = bx + 18 + j * step, has = !!BGI.cellTFs[name];
        s += `<g class="metro-st${has ? "" : " no"}" data-ct="${esc(name)}"><circle cx="${x}" cy="${y}" r="7.5" fill="var(--card)" stroke="${c}" stroke-width="3.2"/>` +
          wrapLbl(x, y + 20, short(name, title)) + `</g>`;
      });
    });
    M.trunk.forEach((name, j) => {
      const x = x0 + j * stepT;
      s += `<g class="metro-st" data-ct="${esc(name)}"><circle cx="${x}" cy="${midY}" r="9" fill="var(--card)" stroke="${GL_COL[metroGL]}" stroke-width="3.5"/>` +
        wrapLbl(x, midY + 24, name.replace(" in statu nascendi", " (AISN)")) + `</g>`;
    });
    s += `</svg>`;
    $("#metroSvg").innerHTML = s;
    $$("#metroSvg .metro-st").forEach((g) => g.addEventListener("click", () => metroDetail(g.dataset.ct)));
  }
  function metroDetail(ct) {
    $$("#metroSvg .metro-st").forEach((g) => g.classList.toggle("sel", g.dataset.ct === ct));
    const d = BGI.cellTFs[ct];
    if (!d) { $("#metroDetail").innerHTML = `<h4>${esc(ct)}</h4><p class="muted">No TF entry in Table S6 for this cell type.</p>`; return; }
    const mx = Math.max(...d.tfs.map((t) => t.diff));
    const sub = Object.entries(BGI.subclusters).flatMap(([t, arr]) => arr.filter((x) => x.n.toLowerCase() === ct.toLowerCase()).map((x) => ({ ...x, t })));
    $("#metroDetail").innerHTML = `<div class="swatch" style="background:${ccol(ct)}"></div>
      <h3 style="margin-bottom:2px">${esc(ct)}</h3><p class="muted" style="font-size:.85rem">${esc(d.germ)} · top differential TF motifs (scATAC), Table S6</p>
      <div class="tfbars">${d.tfs.map((t) => `<div class="tfbar"><span class="gene">${esc(t.tf)}</span><i style="width:${(t.diff / mx) * 100}%"></i><b>${t.diff}</b>${t.sig ? '<em title="target genes significantly enriched among scRNA markers (adj. p < 0.05)">★</em>' : ""}</div>`).join("")}</div>
      <p class="muted" style="font-size:.78rem">Bar = average motif-activity difference vs. other cell types. ★ = the TF's predicted targets are significantly enriched among this cell type's scRNA-seq markers, which is the paper's integrated criterion for an active cell-type-specific TF.</p>
      ${sub.length ? `<h4>Matching subclusters (Table S4)</h4>${sub.map((x) => `<p style="font-size:.85rem;margin:.2em 0"><span class="tag b">${x.k}</span> ${esc(x.t)}${x.m ? ` · <i>${esc(x.m)}</i>` : ""}</p>`).join("")}` : ""}`;
  }
  $("#metroGL").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; metroGL = b.dataset.gl; $$("#metroGL button").forEach((x) => x.classList.toggle("active", x === b)); drawMetro(); metroDetail(METRO[metroGL].trunk[METRO[metroGL].trunk.length - 1]); });
  drawMetro(); metroDetail("ectoderm primordium");

  /* =========================================================
     2. SPATIAL SAMPLES (Table S2, Stereo-seq annotations)
     ========================================================= */
  function drawSamples() {
    const emb = BGI.samples.filter((s) => s.age !== null), post = BGI.samples.filter((s) => s.age === null);
    const W = 1000, H = 150, x = (h) => 30 + (h / 22) * 700;
    let s = `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block">`;
    s += `<line x1="30" y1="110" x2="730" y2="110" stroke="var(--line)" stroke-width="2"/>`;
    for (let h = 0; h <= 22; h += 2) s += `<line x1="${x(h)}" y1="106" x2="${x(h)}" y2="114" stroke="var(--ink-3)"/><text x="${x(h)}" y="130" text-anchor="middle" class="svg-label">${h}h</text>`;
    const used = {};
    emb.forEach((sm, i) => {
      const k = Math.round(x(sm.age) / 14); used[k] = (used[k] || 0) + 1;
      const cy = 98 - (used[k] - 1) * 13;
      s += `<g class="smp" data-id="${esc(sm.id)}"><circle cx="${x(sm.age)}" cy="${cy}" r="5.5" fill="var(--bgi)" stroke="var(--card)" stroke-width="1.5"/><title>${esc(sm.id)} · RAPToR ${sm.age} h · stage ${sm.stage}</title></g>`;
    });
    post.forEach((sm, i) => {
      const cx = 770 + i * 15;
      s += `<g class="smp" data-id="${esc(sm.id)}"><rect x="${cx - 5}" y="92" width="10" height="10" rx="2" fill="${sm.id.startsWith("Pupa") ? "#8a6a3a" : "#c9a43a"}"/><title>${esc(sm.id)}</title></g>`;
    });
    s += `<text x="770" y="130" class="svg-label">L1 · L2 · L3</text><text x="902" y="130" class="svg-label">pupa 12–72 h</text>`;
    s += `<text x="30" y="148" class="svg-label">RAPToR-inferred embryonic age (h) · each dot = one 3D Stereo-seq sample</text></svg>`;
    $("#sampleSvg").innerHTML = s;
    $$("#sampleSvg .smp").forEach((g) => g.addEventListener("click", () => sampleDetail(g.dataset.id)));
  }
  function sampleDetail(id) {
    const sm = BGI.samples.find((s) => s.id === id); if (!sm) return;
    $$("#sampleSvg .smp").forEach((g) => g.classList.toggle("sel", g.dataset.id === id));
    const tot = sm.tissues.reduce((a, [, c]) => a + c, 0);
    $("#sampleDetail").innerHTML = `<h3 style="margin-bottom:2px">${esc(sm.id)}</h3>
      <p class="muted" style="font-size:.88rem">${sm.age !== null ? `RAPToR age <b>${sm.age} h</b> · inferred <b>stage ${sm.stage ?? "–"}</b>` : "post-embryonic sample"} · ${tot} spatial clusters</p>
      ${tot ? `<div class="stackbar">${sm.tissues.map(([t, c]) => `<i style="flex:${c};background:${tcol(t)}" title="${esc(t)}: ${c}"></i>`).join("")}</div>
      <div class="state-chips">${sm.tissues.map(([t, c]) => `<span class="chip-static"><i style="background:${tcol(t)}"></i>${esc(t)} <b>${c}</b></span>`).join("")}</div>` : `<p class="muted">No biologically meaningful clusters (earliest sample).</p>`}
      ${sm.stage ? `<p style="margin-top:12px"><a href="#stage-${sm.stage}" class="jump-stage" data-n="${sm.stage}">→ open stage ${sm.stage} in the stage explorer</a></p>` : ""}`;
    const j = $("#sampleDetail .jump-stage"); if (j) j.addEventListener("click", (e) => { e.preventDefault(); window.setStage && window.setStage(+j.dataset.n); document.getElementById("stages").scrollIntoView(); });
  }
  drawSamples(); sampleDetail("E10-12h_d");

  /* =========================================================
     3. TISSUE SUBCLUSTERS (Table S4 + S5)
     ========================================================= */
  const tissues = Object.keys(BGI.subclusters).sort((a, b) => a.localeCompare(b));
  $("#subTissues").innerHTML = tissues.map((t) => `<button data-t="${esc(t)}"><i style="background:${tcol(t)}"></i>${esc(t)} <small>${BGI.subclusters[t].length}</small></button>`).join("");
  function showTissue(t) {
    $$("#subTissues button").forEach((b) => b.classList.toggle("active", b.dataset.t === t));
    const rows = BGI.subclusters[t];
    $("#subTable").innerHTML = `<table class="compare small"><thead><tr><th>Subcluster</th><th>Assay</th><th>Notable markers</th><th>Validated common markers (S5)</th><th>Reference</th></tr></thead><tbody>` +
      rows.map((x) => `<tr><td>${esc(x.n)}</td><td><span class="tag b">${x.k}</span></td><td class="gene">${esc(x.m)}</td><td class="gene">${esc(x.c.join(", "))}</td><td>${esc(x.r)}</td></tr>`).join("") + `</tbody></table>`;
  }
  $("#subTissues").addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) showTissue(b.dataset.t); });
  showTissue("midgut");
  window.BGI_HELP.openTissue = (t) => {
    const b = $('#bgiTabs [data-pane="paneSub"]'); if (b) b.click();
    showTissue(t); document.getElementById("flysta").scrollIntoView();
  };

  /* =========================================================
     4. MIDGUT & COPPER CELLS (S4 sheet 6, S8)
     ========================================================= */
  const mgKeys = Object.keys(BGI.midgutLarva);
  const order = ["L1-all-non AMP/EE", "L1-all-EE", "L2-all-non AMP/EE", "L2-all-EE", "L3-early-non AMP/EE", "L3-early-EE", "L3-late-non AMP/EE", "L3-late-EE", "pupa-all"].filter((k) => mgKeys.includes(k));
  $("#mgStages").innerHTML = order.map((k) => `<button data-k="${esc(k)}">${esc(k.replace("-all", "").replace("non AMP/EE", "ECs etc.").replace("-EE", " EEs"))}</button>`).join("");
  function showMg(k) {
    $$("#mgStages button").forEach((b) => b.classList.toggle("active", b.dataset.k === k));
    $("#mgList").innerHTML = BGI.midgutLarva[k].map((a) => `<span class="chip-static"><i style="background:${/copper/.test(a) ? "var(--cc)" : /entero-?endocrine|EE/i.test(a) ? "var(--neuro)" : /caec/.test(a) ? "var(--accent-2)" : "var(--endo)"}"></i>${esc(a)}</span>`).join("");
  }
  $("#mgStages").addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) showMg(b.dataset.k); });
  showMg(order[0]);
  const ec = BGI.exexCounts;
  $("#exexBox").innerHTML = `<div class="kv">${[["dual_up", "dual-motif peaks · up in copper cells"], ["lab_up", "lab-only · up"], ["exex_up", "exex-only · up"], ["dual_down", "dual-motif · down"]].map(([k, t]) => `<div><b>${ec[k] || 0}</b><span>${t}</span></div>`).join("")}</div>
    <h4>Top dual-motif (exex + lab) copper-cell genes</h4>
    <div class="gene-list">${BGI.exexDualUp.map(([g, fc]) => `<span>${esc(g)}<b>+${fc}</b></span>`).join("")}</div>
    <p class="muted" style="font-size:.8rem">Peaks containing both exex and lab motifs sit closer to the TSS of copper-cell markers and are linked to higher accessibility and expression than lab-only peaks (Table S8; log2FC = copper cells vs. other midgut).</p>`;

  /* =========================================================
     5. CNS MORPHOMETRICS (S7)
     ========================================================= */
  const mets = ["acceleration", "curvature", "curl", "torsion"];
  $("#morphTable").innerHTML = `<table class="compare small"><thead><tr><th>Transition</th>${mets.map((m) => `<th>${m}</th>`).join("")}</tr></thead><tbody>` +
    Object.entries(BGI.cnsMorph).map(([stg, o]) => `<tr><td class="mono">${esc(stg)}</td>${mets.map((m) => `<td class="gene">${esc((o[m] || []).slice(0, 6).join(", "))}</td>`).join("")}</tr>`).join("") + `</tbody></table>`;

  /* =========================================================
     6. STEREO-ONLY GENES (S3)
     ========================================================= */
  function showGenes(q) {
    q = (q || "").toLowerCase();
    const rows = BGI.stereoGenes.filter(([g, c, t]) => !q || g.toLowerCase().includes(q) || c.toLowerCase().includes(q) || t.toLowerCase().includes(q));
    $("#genesCount").textContent = `${rows.length} of ${BGI.stereoGenes.length} genes`;
    $("#genesTable").innerHTML = `<table class="compare small"><thead><tr><th>Gene</th><th>Cell-type enrichment (occurrences)</th><th>Tissue enrichment (occurrences)</th></tr></thead><tbody>` +
      rows.slice(0, 120).map(([g, c, t]) => `<tr><td class="gene">${esc(g)}</td><td>${esc(c)}</td><td>${esc(t)}</td></tr>`).join("") + `</tbody></table>`;
  }
  $("#genesSearch").addEventListener("input", (e) => showGenes(e.target.value));
  showGenes("");
})();
