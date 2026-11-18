/* ==========================================================
   Fine-grained schematic embryo renderer — v2
   Lateral view (anterior left, dorsal up) + transverse section
   through the mid-trunk (~A2/A3). Original drawings, not taken
   from the Hartenstein Atlas. Colour-coded by germ layer.
   Layers (toggleable via data-layer): ext, ecto, cns, meso,
   gut, trach, germ, section. Labels carry class "lbl".
   ========================================================== */
(function () {
  const W = 880, H = 310, CX = 300, CY = 155, RX = 272;
  let RYV = 110, RYD = 96; // ventral/dorsal half-heights of the lateral outline (made equal for the ventral view)
  const SX = 752, SY = 158, SR = 84, SEC_S = 0.56;
  const C = {
    ecto: "var(--ecto)", ectoD: "var(--ecto-d)", neuro: "var(--neuro)", neuroD: "var(--neuro-d)",
    meso: "var(--meso)", vm: "var(--vm)", endo: "var(--endo)", endoD: "var(--endo-d)", germ: "var(--germ)", germD: "var(--germ-d)",
    extra: "var(--extra)", yolk: "var(--yolk)", shell: "var(--shell)", fore: "var(--fore)", trach: "var(--trach)",
    fat: "var(--fat)", cut: "var(--cuticle)", hemo: "var(--hemo)", cc: "var(--cc)", mt: "var(--mt)", sg: "var(--sg)",
    edge: "rgba(30,25,20,.35)", cellLine: "rgba(255,255,255,.55)", nuc: "rgba(20,20,30,.32)"
  };
  const rad = (d) => (d * Math.PI) / 180;
  const f = (n) => (+n).toFixed(1);
  const P2 = (p) => f(p[0]) + "," + f(p[1]);

  /* ---------- geometry ---------- */
  // rim point at angle deg (0 = posterior, 90 = ventral, 180 = anterior, 270 = dorsal), inset px
  function pt(deg, inset = 0) {
    const t = rad(deg), s = Math.sin(t);
    return [CX + (RX - inset) * Math.cos(t), CY + s * ((s > 0 ? RYV : RYD) - inset)];
  }
  // body coordinates: s 0 (anterior) → 1 (posterior); d -1 (dorsal) → +1 (ventral)
  function B(s, d) {
    const u = 2 * s - 1, h = Math.sqrt(Math.max(0, 1 - u * u));
    return [CX + RX * u, CY + d * h * (d < 0 ? RYD : RYV)];
  }
  function smooth(P, closed) {
    if (P.length < 2) return "";
    const n = P.length, get = (i) => (closed ? P[(i + n) % n] : P[Math.max(0, Math.min(n - 1, i))]);
    let d = "M" + P2(P[0]);
    const end = closed ? n : n - 1;
    for (let i = 0; i < end; i++) {
      const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
      const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += "C" + P2(c1) + " " + P2(c2) + " " + P2(p2);
    }
    return d + (closed ? "Z" : "");
  }
  const bp = (arr, closed) => smooth(arr.map((a) => B(a[0], a[1])), closed);
  function arc(t0, t1, inset = 0) {
    const n = Math.max(8, Math.ceil(Math.abs(t1 - t0) / 2.5)); let d = "";
    for (let i = 0; i <= n; i++) d += (i ? "L" : "M") + P2(pt(t0 + ((t1 - t0) * i) / n, inset));
    return d;
  }
  function band(t0, t1, a, b) {
    const n = Math.max(8, Math.ceil(Math.abs(t1 - t0) / 2.5)); let d = "";
    for (let i = 0; i <= n; i++) d += (i ? "L" : "M") + P2(pt(t0 + ((t1 - t0) * i) / n, a));
    for (let i = n; i >= 0; i--) d += "L" + P2(pt(t0 + ((t1 - t0) * i) / n, b));
    return d + "Z";
  }
  function bRect(s0, s1, d0, d1) { // region in body coords
    const P = []; const n = 24;
    for (let i = 0; i <= n; i++) P.push(B(s0 + ((s1 - s0) * i) / n, d0));
    for (let i = n; i >= 0; i--) P.push(B(s0 + ((s1 - s0) * i) / n, d1));
    return "M" + P.map(P2).join("L") + "Z";
  }
  const eggPath = (inset = 0) => arc(0, 360, inset) + "Z";

  /* ---------- primitives ---------- */
  const path = (d, fill, ex = "") => `<path d="${d}" fill="${fill}" ${ex}/>`;
  const line = (d, c, w, ex = "") => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" ${ex}/>`;
  const circ = (x, y, r, fill, ex = "") => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${fill}" ${ex}/>`;
  const ell = (x, y, rx, ry, fill, ex = "", rot = 0) => `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(rx)}" ry="${f(ry)}" fill="${fill}" ${rot ? `transform="rotate(${f(rot)} ${f(x)} ${f(y)})"` : ""} ${ex}/>`;
  const tube = (d, c, w, ex = "") => line(d, C.edge, w + 2.2, ex) + line(d, c, w, ex);
  const lumen = (d, w) => line(d, "rgba(255,255,255,.55)", Math.max(1, w * 0.22));
  const G = (layer, inner) => (inner ? `<g data-layer="${layer}">${inner}</g>` : "");
  function rng(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
  const outline = 'stroke="rgba(30,25,20,.3)" stroke-width=".8"';

  // individual cells along the rim between insets a (apical) and b (basal)
  function cells(t0, t1, a, b, n, fill, o = {}) {
    let s = "";
    const nr = o.nucR ?? Math.max(1.1, Math.min(2.4, (b - a) * 0.17 + 0.5));
    for (let i = 0; i < n; i++) {
      const ta = t0 + ((t1 - t0) * i) / n, tb = t0 + ((t1 - t0) * (i + 1)) / n, tm = (ta + tb) / 2;
      const fl = typeof fill === "function" ? fill(tm) : fill;
      s += `<path d="M${P2(pt(ta, a))}L${P2(pt(tb, a))}L${P2(pt(tb, b))}L${P2(pt(ta, b))}Z" fill="${fl}" stroke="${C.cellLine}" stroke-width=".55"/>`;
      if (o.nuc !== false) { const [x, y] = pt(tm, a + (b - a) * (o.nucPos ?? 0.4)); s += o.flat ? ell(x, y, nr * 1.8, nr * 0.8, C.nuc) : circ(x, y, nr, C.nuc); }
    }
    return s;
  }

  // Labels are collected, then laid out in two rows above / below each panel without overlap.
  let LB = [];
  function label(x, y, text, lx, ly) { LB.push({ x, y, text, top: ly < CY }); return ""; }
  // Which toggleable layer a label belongs to (drives hover-highlight and layer hiding).
  const LABEL_LAYERS = [
    ["trach", /trache|spiracle|dorsal trunk|\btp\b/i],
    ["germ", /pole (cell|bud|plasm)|\bpc\b|germ cell|gonad|SGP/i],
    ["cns", /\bSI{1,3}\b|mesectoderm|midline|brain|optic|vnc|ventral nerve|neuro(blast|ectoderm)|\bNBs?\b|\bNE\b|\bpnb\b|\bvnb\b|PNS|chordotonal|ring gland/i],
    ["gut", /constriction|gut|\bamg\b|\bpmg\b|stomod|proctod|esophag|proventric|saliva|malpighian|copper|caeca|endoderm|\bst\b|\bhg\b/i],
    ["meso", /ventral furrow|mesoderm|\bms\b|muscle|myotube|fat body|dorsal vessel|cardio|visceral|\bbap\b/i],
    ["ext", /amnioserosa|^as\b|yolk|micropyle/i],
    ["ecto", /ecto|\bdEc\b|epiderm|denticle|cephalic furrow|^cf$|dorsal (fold|ridge|pouch)|clypeolabrum|head skeleton|germ band|\bgb\b|gnathal|procephal|\bcl\b|md · mx/i]
  ];
  const layerOf = (t) => (LABEL_LAYERS.find(([, re]) => re.test(t)) || [""])[0];
  // y of the outline (egg or section disc) just outside the anchor's x, or null if x is beyond it
  function rimY(x, top, sec) {
    const [cx, cy, rx, ry] = sec ? [SX, SY, SR, SR] : [CX, CY, RX, top ? RYD : RYV];
    const u = (x - cx) / rx;
    if (Math.abs(u) >= 0.995) return null;
    const h = ry * Math.sqrt(1 - u * u) + 5;
    return top ? cy - h : cy + h;
  }
  // Three label rows above and below each panel (row 0 nearest the embryo). Leaders leave the
  // anchor vertically, exit the outline, then angle to the label, so they never sweep across the
  // drawing. All leaders are drawn before all text, and text carries a halo, so nothing is hidden.
  const ROWS = { top: [26, 11, -4], bot: [292, 307, 322] };
  function layoutLabels() {
    let lines = "", texts = "";
    [["lat", 6, 636], ["sec", 652, 862]].forEach(([area, xmin, xmax]) => {
      const sec = area === "sec";
      [true, false].forEach((top) => {
        const items = LB.filter((l) => (l.x >= 644) === sec && l.top === top).sort((a, b) => a.x - b.x);
        const rows = top ? ROWS.top : ROWS.bot;
        const ends = rows.map(() => xmin - 20);
        items.forEach((it) => {
          const w = it.text.length * 5.4 + 8;
          let best = null;
          rows.forEach((_, r) => {
            let cx = Math.max(it.x - w / 2, xmin);
            if (cx + w > xmax) cx = xmax - w;
            if (cx < ends[r] + 5) cx = ends[r] + 5;
            const cost = Math.abs(cx + w / 2 - it.x) + r * 26 + (cx + w > xmax + 1 ? 1000 : 0);
            if (!best || cost < best.cost) best = { r, cx, cost };
          });
          ends[best.r] = best.cx + w;
          const tx = best.cx + w / 2, ty = rows[best.r], ly = top ? ty + 4 : ty - 10;
          const ry = rimY(it.x, top, sec);
          const ey = ry == null ? it.y : top ? Math.min(it.y, ry) : Math.max(it.y, ry);
          const lay = layerOf(it.text), da = lay ? ` data-layer="${lay}"` : "";
          lines += `<g class="lbl lbl-line"${da}><path d="M${f(it.x)},${f(it.y)}V${f(ey)}L${f(tx)},${f(ly)}" fill="none" stroke="var(--ink-3)" stroke-width=".65" stroke-linejoin="round" opacity=".8"/>` +
            `<circle cx="${f(it.x)}" cy="${f(it.y)}" r="1.8" fill="var(--ink)" stroke="var(--card)" stroke-width=".9"/></g>`;
          texts += `<g class="lbl lbl-text"${da}><text x="${f(tx)}" y="${f(ty)}" text-anchor="middle" class="svg-label" font-style="italic">${it.text}</text></g>`;
        });
      });
    });
    return lines + texts;
  }
  // Tag section shapes with their layer from their colour token, so layer toggles and
  // hover-highlighting reach the transverse section too.
  const COLOR_LAYER = { "--ecto": "ecto", "--ecto-d": "ecto", "--cuticle": "ecto", "--neuro": "cns", "--neuro-d": "cns", "--meso": "meso", "--vm": "meso", "--fat": "meso", "--hemo": "meso", "--cc": "meso",
    "--endo": "gut", "--endo-d": "gut", "--fore": "gut", "--mt": "gut", "--sg": "gut", "--trach": "trach", "--germ": "germ", "--germ-d": "germ", "--extra": "ext",
    "#33536e": "trach", "#f2f8fc": "trach", "#3d2a14": "ecto", "rgba(220,120,110,.75)": "meso" };
  function tagLayers(s) {
    return s.replace(/<(path|circle|ellipse)\b([^>]*?)\/>/g, (m, tag, attrs) => {
      const get = (a) => { const v = new RegExp(`\\b${a}="([^"]+)"`).exec(attrs); if (!v) return null; const k = /^var\((--[\w-]+)\)$/.exec(v[1]); return COLOR_LAYER[k ? k[1] : v[1]] || null; };
      const lay = get("fill") || get("stroke");
      return lay ? `<${tag} data-layer="${lay}"${attrs}/>` : m;
    });
  }
  const L = (p, text, lx, ly) => label(p[0], p[1], text, lx, ly);

  function defs(id) {
    return `<defs>
      <clipPath id="clip-${id}"><path d="${eggPath(0)}"/></clipPath>
      <clipPath id="sclip-${id}"><circle cx="${SX}" cy="${SY}" r="${SR}"/></clipPath>
      <pattern id="gran-${id}" width="11" height="11" patternUnits="userSpaceOnUse">
        <circle cx="2" cy="3" r="1" fill="rgba(140,110,50,.16)"/><circle cx="7.5" cy="8" r="1.4" fill="rgba(140,110,50,.12)"/><circle cx="8" cy="2" r=".7" fill="rgba(140,110,50,.18)"/></pattern>
      <pattern id="hex-${id}" width="8" height="7" patternUnits="userSpaceOnUse">
        <path d="M0 3.5 L2 0 H6 L8 3.5 L6 7 H2 Z" fill="none" stroke="rgba(255,255,255,.38)" stroke-width=".55"/></pattern>
      <radialGradient id="yolkg-${id}" cx="48%" cy="45%" r="62%"><stop offset="0%" stop-color="var(--yolk)" stop-opacity=".6"/><stop offset="100%" stop-color="var(--yolk)"/></radialGradient>
    </defs>`;
  }
  const yolk = (id, inset = 3) => path(eggPath(inset), `url(#yolkg-${id})`) + path(eggPath(inset), `url(#gran-${id})`);

  /* =====================================================
     STAGES 1–4: cleavage & syncytial blastoderm
     ===================================================== */
  function early(n, id) {
    const r = rng(17 + n * 7); let s = yolk(id, 4);
    let germ = "", ext = "", lab = "";
    if (n <= 3) germ += path(band(-32, 32, 4, 13), C.germ, 'opacity=".35"'); // pole plasm
    ext += ell(CX - RX - 2, CY, 4, 6, C.shell); // micropyle
    if (n === 1) {
      const [x, y] = B(0.42, -0.08);
      ext += circ(x, y, 18, "rgba(255,255,255,.55)") + circ(x - 3, y, 6.5, "rgba(60,60,80,.62)") + circ(x + 6, y + 2, 5.5, "rgba(60,60,80,.45)");
      lab += label(x, y, "pronuclei fusing", 250, 22) + L(pt(180, -2), "micropyle", 60, 80) + L(pt(10, 8), "pole plasm (osk, vas, nos)", 520, 30);
    } else if (n === 2) {
      for (let i = 0; i < 40; i++) {
        const a = r() * 2 * Math.PI, d = Math.sqrt(r()), x = CX - 15 + Math.cos(a) * d * 125, y = CY + Math.sin(a) * d * 44;
        ext += circ(x, y, 9, "rgba(255,255,255,.5)");
        if (i % 7 === 0) ext += circ(x - 2.5, y, 2.2, "rgba(60,60,80,.6)") + circ(x + 2.5, y, 2.2, "rgba(60,60,80,.6)");
        else ext += circ(x, y, 3.2, "rgba(60,60,80,.55)");
      }
      lab += label(CX + 40, CY + 10, "cleavage nuclei + cytoplasmic islands", 420, 292) + L(pt(10, 8), "pole plasm", 600, 52) + L(pt(180, -2), "micropyle", 60, 80);
    } else if (n === 3) {
      for (let i = 0; i < 120; i++) {
        const a = r() * 2 * Math.PI, d = 0.7 + r() * 0.24;
        ext += circ(CX + Math.cos(a) * d * (RX - 22), CY + Math.sin(a) * d * (RYD - 12), 2.6, "rgba(60,60,80,.5)");
      }
      for (let i = 0; i < 14; i++) { const a = r() * 2 * Math.PI, d = Math.sqrt(r()); ext += circ(CX + Math.cos(a) * d * 110, CY + Math.sin(a) * d * 34, 4, "rgba(60,60,80,.22)"); }
      [[-16, 1], [-4, -1], [8, -1], [20, 1], [2, -8]].forEach(([t, i]) => { const [x, y] = pt(t, i); germ += circ(x, y, 6.5, C.germ, outline) + circ(x, y, 2, C.germD); });
      lab += L(pt(0, -2), "pole buds (pc)", 610, 60) + label(CX + 10, CY + 4, "yolk nuclei (vitellophages)", 300, 292) + L(pt(250, 16), "nuclei migrating to cortex", 200, 20);
    } else {
      ext += path(band(0, 360, 4, 15), "rgba(255,255,255,.45)");
      for (let t = 0; t < 360; t += 2.1) { const [x, y] = pt(t, 9); ext += ell(x, y, 2.3, 1.9, "rgba(60,60,80,.55)", "", t + 90); }
      for (let i = 0; i < 10; i++) { const a = r() * 2 * Math.PI, d = Math.sqrt(r()); ext += circ(CX + Math.cos(a) * d * 110, CY + Math.sin(a) * d * 34, 4, "rgba(60,60,80,.22)"); }
      const pcs = [[-14, -2], [-2, -4], [10, -2], [-20, -10], [-8, -12], [4, -12], [16, -8], [-14, -20], [-1, -21], [10, -18]];
      pcs.forEach(([t, i]) => { const [x, y] = pt(t, i); germ += circ(x, y, 6, C.germ, outline) + circ(x, y, 1.8, C.germD); });
      lab += L(pt(0, -10), "pole cells (pc)", 615, 70) + L(pt(255, 9), "cortical nuclei, cycles 10–13", 220, 20) + L(pt(100, 9), "cortical cytoplasm", 360, 296);
    }
    return s + G("ext", ext) + G("germ", germ) + lab;
  }

  /* =====================================================
     STAGES 5–6: cellular blastoderm & early gastrulation
     ===================================================== */
  function rimFate(t) {
    let a = ((t % 360) + 360) % 360; if (a > 180) a -= 360; // -180..180, negative = dorsal
    if (Math.abs(a) < 22) return C.endo;
    if (a >= 22 && a < 148) return C.meso;
    if (a >= 148 && a < 166) return C.endo;
    if (a >= 166 || a <= -122) return C.ecto;
    if (a > -122 && a < -40) return C.extra;
    return C.ecto;
  }
  function blasto(n, id) {
    let s = yolk(id, 4), ecto = "", meso = "", germ = "", lab = "";
    let fm = `<g clip-path="url(#clip-${id})" opacity=".9">`;
    fm += path(bRect(0, 1, -1, 1), C.ecto);
    fm += path(bRect(0.2, 0.86, -1, -0.72), C.extra);
    fm += path(bp([[0.1, -0.38], [0.2, -0.44], [0.29, -0.2], [0.4, -0.14], [0.86, -0.14], [0.86, 0.5], [0.3, 0.5], [0.16, 0.44], [0.1, 0.15]], true), C.neuro);
    fm += path(bRect(0.14, 0.86, 0.5, 1), C.meso);
    fm += path(bRect(0.27, 0.86, 0.46, 0.54), C.neuroD, 'opacity=".9"'); // mesectoderm
    fm += path(bRect(0, 0.13, 0.2, 1), C.endo);
    fm += path(bRect(0.87, 1, -1, 1), C.endo);
    if (n === 5) for (let i = 0; i < 7; i++) { const s0 = 0.33 + i * 0.077; fm += path(bRect(s0, s0 + 0.026, -0.95, 0.95), "rgba(20,10,40,.22)"); }
    fm += path(bRect(0, 1, -1, 1), `url(#hex-${id})`);
    fm += `</g>`;
    s += fm;
    const nC = 176;
    for (let i = 0; i < nC; i++) {
      const ta = (360 * i) / nC, tb = (360 * (i + 1)) / nC, tm = (ta + tb) / 2;
      const a = tm > 180 ? tm - 360 : tm;
      if (n === 6 && a > 36 && a < 146) continue;
      if (n === 6 && (Math.abs(a - 122) < 2.2 || Math.abs(a + 126) < 2.2)) continue;
      const depth = n === 6 && Math.abs(a) < 24 ? 9 : 16;
      ecto += cells(ta, tb, 0, depth, 1, rimFate(tm), { nucPos: 0.28, nucR: 1.5 });
    }
    if (n === 6) {
      meso += cells(36, 146, 7, 27, 58, C.meso, { nucPos: 0.72, nucR: 1.4 });
      meso += line(arc(37, 145, 6), "rgba(120,30,20,.75)", 1.6);
      [122, -126].forEach((t) => {
        const a = pt(t - 2.4, 0), b = pt(t, 30), c = pt(t + 2.4, 0);
        ecto += path(`M${P2(a)}Q${P2(pt(t - 1, 18))} ${P2(b)}Q${P2(pt(t + 1, 18))} ${P2(c)}Z`, C.ecto, outline);
      });
      ecto += line(bp([[0.335, -0.97], [0.318, -0.3], [0.31, 0.3], [0.3, 0.97]]), "rgba(20,20,40,.45)", 2);
      lab += L(pt(100, 12), "ventral furrow (vf)", 262, 302) + L(pt(-126, 18), "cephalic furrow (cf)", 150, 18);
    }
    const pcs = n === 5 ? [[-12, -3], [0, -5], [12, -3], [-6, -14], [6, -14], [0, -23], [-16, -12], [16, -12]] : [[-34, -2], [-24, -4], [-14, -3], [-30, -12], [-19, -13], [-26, -21], [-8, -10], [-40, -10]];
    pcs.forEach(([t, i]) => { const [x, y] = pt(t, i); germ += circ(x, y, 6, C.germ, outline) + circ(x, y, 1.8, C.germD); });
    lab += L(pt(n === 5 ? 0 : -26, -8), "pc", 618, 56);
    lab += L(B(0.5, -0.86), "amnioserosa anlage", 330, 18);
    lab += L(B(0.62, -0.42), "dorsal ectoderm", 470, 26);
    lab += L(B(0.45, 0.15), "neuroectoderm", 150, 302);
    lab += L(B(0.2, 0.0), "procephalic NE", 120, 18);
    lab += L(B(0.06, 0.6), "amg", 44, 262);
    lab += L(B(0.93, 0.5), "pmg", 610, 250);
    lab += L(B(0.7, 0.78), "mesoderm (ms)", 520, 302);
    lab += L(B(0.62, 0.5), "mesectoderm", 390, 302);
    if (n === 5) lab += L(B(0.48, -0.3), "eve stripes 1–7", 250, 18);
    return s + G("ecto", ecto) + G("meso", meso) + G("germ", germ) + lab;
  }

  /* =====================================================
     STAGES 7–12: germ band extension & retraction
     ===================================================== */
  const TIP = { 7: -14, 8: -66, 9: -96, 10: -110, 11: -122, 12: -58 };
  // neuroblast delamination waves: SI (stage 9) darkest, SII (10), SIII and later (11) palest
  const NB_WAVE = [["var(--neuro-d)", ""], ["var(--neuro)", ""], ["var(--neuro)", ' fill-opacity=".45"']];
  function germBand(n, id) {
    const tip = TIP[n], st = 148;
    let s = yolk(id, 4), ext = "", ecto = "", cns = "", meso = "", gut = "", germ = "", trach = "", lab = "";
    if (tip > -150) ext += cells(tip + 3, -150, 0, 6, Math.max(2, Math.round((tip + 150) / 8)), C.extra, { flat: true, nucPos: 0.5, nucR: 1.5 });
    ecto += cells(st + 2, 210, 0, 15, 30, (t) => (t > 160 && t < 200 && n <= 8 ? C.neuro : C.ecto), { nucPos: 0.35 });
    const nGB = Math.round((st - tip) / 2.2);
    ecto += cells(st, tip, 0, n >= 9 ? 13 : 15, nGB, n <= 8 ? C.neuro : C.ecto, { nucPos: 0.35 });
    const segN = 15, s0 = st - 10, s1 = tip + 10;
    if (n >= 10) for (let i = 1; i < segN; i++) {
      const t = s0 - ((s0 - s1) * i) / segN, d = `M${P2(pt(t, -1))}L${P2(pt(t, n >= 11 ? 12 : 6))}`;
      ecto += line(d, "var(--yolk)", 2.2) + line(d, "rgba(20,20,40,.45)", 0.9);
    }
    if (n <= 9) {
      [124, -132].forEach((t) => { const a = pt(t - 2, 0), b = pt(t, 24 - (n - 7) * 5), c = pt(t + 2, 0); ecto += path(`M${P2(a)}L${P2(b)}L${P2(c)}Z`, C.ecto, outline); });
      ecto += line(bp([[0.31, -0.95], [0.3, 0], [0.31, 0.95]]), "rgba(20,20,40,.28)", 1.6);
      lab += L(pt(-132, 12), "cf", 170, 18);
    }
    if (n <= 8) [-100, -80].forEach((t) => { if (t > tip) { const a = pt(t - 2, 0), b = pt(t, 14), c = pt(t + 2, 0); ext += path(`M${P2(a)}L${P2(b)}L${P2(c)}Z`, C.extra, outline); } });
    if (n <= 8 && tip > -80) lab += L(pt(-90, 6), "dorsal folds", 330, 18);
    if (n >= 9) {
      const rows = n === 9 ? 1 : n === 10 ? 2 : 3, step = n === 9 ? 4.6 : 3.3;
      for (let r = 0; r < rows; r++) {
        const ins = 17.5 + r * 6;
        const [wf, wo] = NB_WAVE[r];
        for (let t = st - 5 - (r % 2) * 1.6; t > tip + 12; t -= step) { const [x, y] = pt(t, ins); cns += circ(x, y, 2.9, wf, outline + wo); }
      }
      for (let t = 158; t < 204; t += 3.6) { const [x, y] = pt(t, 19); cns += circ(x, y, 2.9, C.neuro, outline); }
      if (n >= 10) for (let t = 162; t < 200; t += 4.4) { const [x, y] = pt(t, 25); cns += circ(x, y, 2.6, C.neuro, outline); }
      lab += L(pt(98, 19), n === 9 ? "neuroblasts, wave SI" : n === 10 ? "NBs SI + SII" : "NBs SI–SIII (vnb)", 250, 300);
      if (n >= 10) lab += L(pt(84, 23.5), "SII (paler)", 330, 300);
      if (n >= 11) lab += L(pt(64, 29.5), "SIII (palest)", 400, 300);
      lab += L(pt(186, 19), "pnb", 14, 150);
    }
    const mIn = n >= 9 ? 17.5 + (n === 9 ? 1 : n === 10 ? 2 : 3) * 6 + 1 : 16;
    if (n === 7) meso += cells(140, 40, 16, 26, 34, C.meso, { nucPos: 0.5, nucR: 1.3 });
    else meso += cells(st - 4, tip + 6, mIn, mIn + 9, Math.round((st - tip) / 2.6), C.meso, { nucPos: 0.5, nucR: 1.3 });
    if (n >= 11) {
      for (let i = 1; i < segN - 1; i++) { const t = s0 - ((s0 - s1) * (i + 0.5)) / segN; const [x, y] = pt(t, mIn + 12); meso += ell(x, y, 4.2, 2.4, C.vm, "", t + 90); }
      lab += L(pt(60, mIn + 12), "visceral ms (bap)", 470, 300);
    }
    lab += L(pt(128, mIn + 5), "ms", 150, 300);
    const pmgT = tip + (n === 7 ? 3 : 10), pmgI = n === 7 ? 14 : 30;
    const [px, py] = pt(pmgT, pmgI);
    if (n <= 11) {
      const d = `M${P2(pt(tip + 1, 0))}L${P2([px, py])}`;
      gut += line(d, C.fore, 8) + lumen(d, 8);
      gut += circ(px, py, n === 7 ? 13 : 16, C.endo, outline) + circ(px, py, n === 7 ? 6 : 8, "var(--yolk)");
      if (n >= 9) lab += L(pt(tip + 1, 4), "proctodeum", ...(n === 9 ? [450, 18] : [300, 18]));
    } else {
      gut += line(`M${P2(pt(tip + 1, 0))}L${P2(pt(tip + 8, 26))}`, C.fore, 8);
      gut += path(band(tip + 10, 14, 40, 52), C.endo, outline);
      gut += line(arc(tip + 10, 14, 53), C.vm, 2.2);
      const [mx, my] = pt(tip + 12, 46);
      gut += tube(`M${f(mx)},${f(my)} q 18,10 34,6`, C.mt, 2.6) + tube(`M${f(mx)},${f(my)} q 10,-16 26,-22`, C.mt, 2.6);
      lab += label(mx + 30, my + 6, "Malpighian buds", 610, 120);
    }
    if (n <= 9) [[-4, -3], [4, -2], [0, 4], [-6, 4], [6, 5]].forEach(([dx, dy]) => (germ += circ(px + dx, py + dy, 3.2, C.germ, outline)));
    else if (n === 10) [[-12, 8], [-4, 15], [6, 14], [12, 6], [0, 2]].forEach(([dx, dy]) => (germ += circ(px + dx, py + dy, 3.2, C.germ, outline)));
    else { const [gx, gy] = pt(tip + 20, 44); [[0, 0], [7, 3], [-6, 4], [2, 9]].forEach(([dx, dy]) => (germ += circ(gx + dx, gy + dy, 3.2, C.germ, outline))); }
    lab += label(px, py, "pmg", ...(n === 7 ? [620, 110] : n <= 8 ? [505, 20] : n === 12 ? [470, 20] : [400, 20]));
    if (n >= 10 && n <= 11) lab += label(px - 8, py + 14, "pc (migrating)", 520, 300);
    if (n === 7) { const [ax, ay] = pt(150, 8); gut += circ(ax, ay, 7, C.endo, outline); lab += label(ax, ay, "amg", 30, 290); }
    else if (n <= 11) { const [ax, ay] = pt(162, 34); gut += circ(ax, ay, 13, C.endo, outline) + circ(ax + 3, ay, 5, "var(--yolk)"); lab += label(ax, ay, "amg", 24, 290); }
    else { gut += path(band(168, 98, 40, 52), C.endo, outline) + line(arc(166, 98, 53), C.vm, 2.2); lab += L(pt(140, 46), "amg", 30, 290); }
    if (n >= 10) {
      const d = `M${P2(pt(151, -1))}Q${P2(pt(156, 18))} ${P2(pt(n >= 11 ? 166 : 160, n >= 11 ? 38 : 30))}`;
      gut += tube(d, C.fore, 7) + lumen(d, 7);
      lab += L(pt(155, 12), "stomodeum (st)", 20, 230);
    } else if (n === 9) lab += L(pt(151, 2), "stomodeal plate", 30, 250);
    if (n >= 11) {
      [140, 133, 126].forEach((t) => { const [x, y] = pt(t, 5); ecto += ell(x, y, 7, 5.5, C.ecto, outline, t + 90); });
      const [cx, cy] = pt(160, 4); ecto += ell(cx, cy, 8, 6, C.ecto, outline, 250);
      lab += L(pt(133, 5), "md · mx · lb", 110, 300) + L(pt(160, 4), "cl", 8, 200);
      const [sx, sy] = pt(128, 14);
      gut += n === 11 ? circ(sx, sy, 3.5, C.sg, outline) : tube(`M${f(sx)},${f(sy)} l 22,-5`, C.sg, 5);
      lab += label(sx, sy, n === 11 ? "salivary placode" : "salivary gland", 60, 300);
    }
    if (n >= 11) {
      const ts = []; for (let i = 0; i < 10; i++) ts.push(118 - i * ((118 - (tip + 24)) / 9));
      ts.forEach((t) => { const [x, y] = pt(t, 6); trach += ell(x, y, 2.4, 3.4, "#1c3d63", "", t + 90); });
      lab += L(pt(ts[4], 6), "tracheal pits (tp)", 560, 300);
    }
    lab += L(pt(70, 3), "germ band (gb)", 420, 300);
    lab += L(pt(195, 6), "procephalon", 14, 70);
    if (n === 12) lab += L(pt(-100, 3), "amnioserosa", 250, 18);
    return s + G("ext", ext) + G("ecto", ecto) + G("meso", meso) + G("cns", cns) + G("gut", gut) + G("germ", germ) + G("trach", trach) + lab;
  }

  /* =====================================================
     VENTRAL VIEW, STAGES 9–12 (anterior left, midline horizontal)
     Optical plane just beneath the ventral surface: the neuroectoderm
     and the neuroblasts delaminating from it in waves.
     ===================================================== */
  // [row 1-7 (anterior → posterior in the hemisegment), column 1-6 (medial → lateral), wave]
  // Schematic layout of ~30 NBs per hemisegment; wave 3 lumps SIII with the later small waves.
  const NB_MAP = [[1,1,1],[2,5,1],[3,2,1],[3,5,1],[4,2,1],[5,2,1],[5,3,1],[5,6,1],[7,1,1],[7,4,1],
    [1,2,2],[2,2,2],[3,3,2],[4,4,2],[6,1,2],[6,2,2],[7,2,2],
    [1,3,3],[2,1,3],[2,4,3],[3,1,3],[3,4,3],[4,1,3],[4,3,3],[5,4,3],[5,5,3],[6,4,3],[7,3,3]];
  function ventralView(n, id) {
    const r = rng(500 + n);
    let s = yolk(id, 4), ecto = "", cns = "", gut = "", trach = "", segTxt = "", lab = "";
    // the more posterior segments curve round the pole onto the dorsal side (less so once retraction starts)
    const names = ["md", "mx", "lb", "T1", "T2", "T3", "A1", "A2", "A3", "A4"].concat(n === 12 ? ["A5", "A6"] : []);
    const sa = 0.285, sb = n === 12 ? 0.95 : 0.93, sw = (sb - sa) / names.length;
    // ventral epidermis seen from below, neuroectoderm either side of the midline
    ecto += path(eggPath(1.5), C.ecto, 'opacity=".16"');
    ecto += path(bRect(0.06, 0.975, -0.56, 0.56), C.neuro, 'opacity=".12"');
    for (let i = 0; i < names.length; i++) {
      const [x, y] = B(sa + sw * (i + 0.5), -0.66);
      segTxt += `<text x="${f(x)}" y="${f(y + 3)}" text-anchor="middle" class="seg-name">${names[i]}</text>`;
      if (n >= 10 && i > 0) { const d = bp([[sa + sw * i, -0.93], [sa + sw * i - 0.004, 0], [sa + sw * i, 0.93]]); ecto += line(d, "rgba(255,255,255,.6)", 2) + line(d, "rgba(20,20,40,.38)", 0.85); }
    }
    // ventral midline (mesectoderm-derived)
    const mid = bp([[0.27, 0], [0.6, 0], [0.985, 0]]);
    cns += line(mid, C.neuroD, 3.4, 'opacity=".55"');
    // neuroblasts by wave, mirrored either side of the midline
    const maxW = n === 9 ? 1 : n === 10 ? 2 : 3, nbR = n === 12 ? 1.75 : 2.05;
    const pick = {};
    for (let i = 0; i < names.length; i++) NB_MAP.forEach(([row, col, w]) => {
      if (w > maxW) return;
      [-1, 1].forEach((side) => {
        const sv = sa + sw * i + sw * (0.09 + (0.82 * (row - 0.5)) / 7), dv = side * (0.08 + (col - 1) * 0.08); // gap at each segment border
        const [x, y] = B(sv, dv), [wf, wo] = NB_WAVE[w - 1];
        cns += circ(x, y, nbR, wf, outline + wo);
        const key = `${w}${side}`; if (i === (w === 1 ? 4 : w === 2 ? 6 : 8) && !pick[key]) pick[key] = [x, y];
      });
    });
    // procephalic neuroblasts
    const pn = n === 9 ? 7 : n === 10 ? 12 : 18;
    for (let i = 0; i < pn; i++) [-1, 1].forEach((side) => { const [x, y] = B(0.1 + r() * 0.13, side * (0.12 + r() * 0.45)); cns += circ(x, y, nbR, i < 7 ? C.neuroD : C.neuro, outline + (i >= 12 ? ' fill-opacity=".45"' : "")); });
    // head: cephalic furrow, stomodeum, clypeolabrum
    if (n <= 10) { [-1, 1].forEach((sd) => { const cf = bp([[0.272, sd * 0.95], [0.258, sd * 0.62], [0.262, sd * 0.3]]); ecto += line(cf, "rgba(20,20,40,.42)", 1.7); }); lab += L(B(0.258, 0.62), "cephalic furrow (cf)", 150, 300); }
    const [sx, sy] = B(0.205, 0);
    if (n === 9) { ecto += ell(sx, sy, 9, 13, C.ectoD, 'opacity=".45"'); lab += label(sx, sy, "stomodeal plate", 120, 300); }
    else { gut += ell(sx, sy, 6, 9, C.fore, outline) + ell(sx, sy, 2.5, 5, "rgba(20,20,40,.55)"); lab += label(sx, sy, "stomodeum (st)", 120, 300); }
    if (n >= 11) { const [cx, cy] = B(0.15, 0); ecto += ell(cx, cy, 8, 12, C.ecto, outline); lab += label(cx, cy, "clypeolabrum (cl)", 40, 20); }
    // salivary placodes (labial segment) and tracheal pits (T2 onward, lateral edge)
    if (n >= 11) {
      [-1, 1].forEach((side) => { const [x, y] = B(sa + sw * 2.5, side * 0.6); gut += n === 11 ? circ(x, y, 4.2, C.sg, outline) : ell(x, y, 7, 3.6, C.sg, outline); });
      lab += L(B(sa + sw * 2.5, 0.6), n === 11 ? "salivary placode" : "salivary gland invaginating", 120, 300);
      for (let i = 4; i < names.length; i++) [-1, 1].forEach((side) => { const [x, y] = B(sa + sw * (i + 0.5), side * 0.8); trach += ell(x, y, 3.2, 2.2, "#1c3d63", ""); });
      lab += L(B(sa + sw * 7.5, -0.8), "tracheal pits (tp)", 400, 20);
    }
    lab += L(B(0.62, 0), "ventral midline", 470, 300);
    lab += L(B(0.42, -0.45), "neuroectoderm", 300, 20);
    lab += L(B(0.15, -0.35), "pnb", 60, 20);
    if (pick["1-1"]) lab += L(pick["1-1"], "SI neuroblasts (stage 9)", 330, 20);
    if (pick["21"]) lab += L(pick["21"], "SII (stage 10)", 380, 300);
    if (pick["3-1"]) lab += L(pick["3-1"], "SIII + later (stage 11)", 470, 20);
    lab += L(B(0.975, 0), n <= 11 ? "germ band continues dorsally" : "A8 still dorsal", 560, 300);
    return s + G("ecto", ecto + segTxt) + G("cns", cns) + G("gut", gut) + G("trach", trach) + lab;
  }

  /* =====================================================
     STAGES 13–17: organogenesis (body coordinates)
     ===================================================== */
  const SEG = (i) => 0.19 + i * 0.0655; // segment boundaries T1 … A8 (i = 0 … 11)
  function late(n, id) {
    const r = rng(101 + n);
    let s = yolk(id, 4), ext = "", ecto = "", cns = "", meso = "", gut = "", germ = "", trach = "", lab = "";
    const open = { 13: [-124, -56], 14: [-104, -76] }[n];
    // fat body (beneath the gut)
    const sc = n === 13 ? 0.7 : 1;
    meso += path(bp([[0.33, -0.55], [0.5, -0.66 * sc], [0.7, -0.6 * sc], [0.8, -0.45], [0.62, -0.38], [0.42, -0.4]], true), C.fat, 'opacity=".95"');
    meso += path(bp([[0.36, 0.42], [0.55, 0.52 * sc + 0.05], [0.74, 0.46], [0.78, 0.34], [0.58, 0.32], [0.4, 0.3]], true), C.fat, 'opacity=".95"');
    lab += L(B(0.6, -0.55), "fat body (fb)", 540, 18);
    // midgut
    const mgC = 0.52, mgD = -0.04, mgS0 = 0.25, mgS1 = 0.8;
    const cons = n === 15 ? [0.52] : n === 16 ? [0.4, 0.52, 0.64] : [];
    const hh = (sv) => { const u = (sv - mgC) / ((mgS1 - mgS0) / 2); let v = (n <= 14 ? 0.58 : 0.5) * Math.sqrt(Math.max(0, 1 - u * u)); cons.forEach((c) => (v *= 1 - 0.62 * Math.exp(-(((sv - c) / 0.022) ** 2)))); return v; };
    if (n <= 16) {
      const top = [], bot = [];
      for (let i = 0; i <= 60; i++) { const sv = mgS0 + ((mgS1 - mgS0) * i) / 60; top.push([sv, mgD - hh(sv)]); bot.push([sv, mgD + hh(sv)]); }
      const d = bp(top.concat(bot.reverse()), true);
      gut += line(d, C.vm, 12) + path(d, `url(#yolkg-${id})`) + path(d, `url(#gran-${id})`) + line(d, C.endo, 7.5) + line(d, C.endoD, 0.7);
      lab += L(B(0.47, mgD + hh(0.47)), "midgut (mg)", 360, 300);
      if (n >= 15) lab += L(B(0.52, mgD - hh(0.52)), "constriction", 330, 18);
    } else {
      const d = bp([[0.27, 0.05], [0.33, -0.35], [0.42, -0.42], [0.48, -0.1], [0.44, 0.3], [0.52, 0.45], [0.6, 0.2], [0.57, -0.25], [0.66, -0.42], [0.74, -0.15], [0.7, 0.25], [0.78, 0.3]]);
      gut += line(d, C.vm, 21) + line(d, C.endo, 17) + line(d, "var(--yolk)", 6) + line(d, C.endoD, 0.6, 'opacity=".5"');
      lab += L(B(0.44, 0.3), "midgut loops (mg)", 360, 300);
    }
    if (n >= 15) {
      const ccs = n === 17 ? [[0.52, 0.45], [0.56, 0.36], [0.6, 0.22], [0.48, 0.38]] : [[0.43, mgD - hh(0.45) + 0.05], [0.46, mgD - hh(0.47) + 0.06], [0.44, mgD + hh(0.45) - 0.05], [0.47, mgD + hh(0.47) - 0.06], [0.49, mgD - hh(0.49) + 0.06]];
      ccs.forEach(([a, b]) => { const [x, y] = B(a, b); gut += circ(x, y, 2.4, C.cc, outline); });
      lab += L(B(ccs[1][0], ccs[1][1]), "copper cells (lab, exex)", 470, 300);
    }
    if (n >= 16) {
      [[0.27, -0.25, 0.22, -0.4], [0.27, 0.22, 0.22, 0.36]].forEach(([a, b, c, d2]) => (gut += tube(bp([[a, b], [(a + c) / 2, (b + d2) / 2 + 0.02], [c, d2]]), C.endo, 6)));
      lab += L(B(0.22, -0.4), "gastric caeca", 120, 18);
    }
    // foregut
    const mouth = n === 13 ? [0.1, 0.72] : n === 14 ? [0.07, 0.5] : [0.035, 0.22];
    const fg = bp([mouth, [mouth[0] + 0.07, mouth[1] * 0.6], [0.21, 0.02], [0.255, 0.0]]);
    gut += tube(fg, C.fore, 7) + lumen(fg, 7);
    if (n >= 16) { const [x, y] = B(0.25, 0); gut += circ(x, y, 8, C.fore, outline) + circ(x, y, 3, "rgba(255,255,255,.5)"); lab += label(x, y, "proventriculus", 230, 300); }
    lab += L(B(mouth[0] + 0.06, mouth[1] * 0.65), "esophagus", 14, 250);
    // hindgut + anal pads
    const hg = n <= 15 ? bp([[0.79, 0.04], [0.84, -0.25], [0.9, -0.3], [0.94, -0.05], [0.975, 0.2]]) : bp([[0.79, 0.04], [0.83, 0.35], [0.88, 0.1], [0.86, -0.3], [0.92, -0.35], [0.95, -0.05], [0.977, 0.2]]);
    gut += tube(hg, C.fore, 7) + lumen(hg, 7);
    if (n >= 15) { const [x, y] = B(0.97, 0.45); ecto += ell(x, y, 5, 3.5, C.ectoD, outline, -60); }
    lab += L(B(0.9, -0.3), "hindgut (hg)", 620, 70);
    // Malpighian tubules
    const mtl = n === 13 ? 0.6 : 1;
    [[[0.79, 0.06], [0.72, 0.35], [0.79 - 0.2 * mtl, 0.55], [0.79 - 0.3 * mtl, 0.5]], [[0.79, 0.02], [0.73, -0.25], [0.79 - 0.18 * mtl, -0.55], [0.79 - 0.27 * mtl, -0.5]], [[0.8, 0.08], [0.86, 0.5], [0.9, 0.6]]].forEach((pts) => (gut += tube(bp(pts), C.mt, 2.8)));
    lab += L(B(0.79 - 0.2 * mtl, 0.55), "Malpighian tubules (mp)", 520, 300);
    // salivary glands
    const sgP = n === 13 ? [[0.11, 0.72], [0.2, 0.68], [0.3, 0.6]] : n === 14 ? [[0.08, 0.55], [0.2, 0.52], [0.3, 0.42]] : [[0.05, 0.3], [0.13, 0.4], [0.24, 0.36], [0.33, 0.2]];
    gut += tube(bp(sgP), C.sg, 6) + lumen(bp(sgP), 6);
    lab += L(B(sgP[2][0], sgP[2][1]), "salivary gland (sg)", 150, 300);

    // CNS
    const brain = { 13: [0.13, -0.42], 14: [0.145, -0.36], 15: [0.165, -0.31], 16: [0.18, -0.28], 17: [0.185, -0.27] }[n]; // brain sinks back as the head involutes
    const [bx, by] = B(...brain);
    cns += path(`M${f(bx - 28)},${f(by + 4)} C ${f(bx - 30)},${f(by - 26)} ${f(bx + 22)},${f(by - 30)} ${f(bx + 28)},${f(by - 4)} C ${f(bx + 32)},${f(by + 20)} ${f(bx - 24)},${f(by + 28)} ${f(bx - 28)},${f(by + 4)} Z`, C.neuro, outline);
    cns += ell(bx - 16, by - 12, 9, 7, C.neuroD, 'opacity=".55"');
    if (n >= 14) cns += ell(bx + 4, by + 4, 12, 7, C.neuroD, 'opacity=".6"');
    lab += label(bx, by, "brain (br)", 40, 22) + label(bx - 16, by - 12, "optic lobe", 120, 14);
    const vEnd = { 13: 0.93, 14: 0.86, 15: 0.78, 16: 0.68, 17: 0.58 }[n], vS = 0.2, dV = 0.66;
    const nm = 14, segL = (vEnd - vS) / nm;
    cns += line(bp([[brain[0] + 0.03, brain[1] + 0.25], [0.16, 0.3], [vS + 0.01, dV]]), C.neuro, 6);
    for (let i = 0; i < nm; i++) {
      const [x, y] = B(vS + segL * (i + 0.5), dV - 0.02);
      const w = Math.max(5, (segL * RX * 2) / 2 - 0.5);
      cns += ell(x, y, w, n >= 16 ? 7.5 : 8.5, C.neuro, outline);
      if (n >= 14) cns += ell(x, y - 3, w * 0.92, 2, C.neuroD, 'opacity=".65"');
    }
    lab += L(B(vS + segL * 6, dV + 0.06), "ventral nerve cord (vnc)", 250, 300);
    if (n >= 15) for (let i = 3; i < nm; i++) {
      const a = B(vS + segL * (i + 0.5), dV - 0.04), b = B(SEG(Math.min(11, i - 2)) + 0.03, 0.1);
      cns += line(`M${P2(a)}L${P2(b)}`, C.neuro, 0.8, 'opacity=".7"');
    }
    for (let i = 3; i < 11; i++) {
      const sc2 = SEG(i) + 0.03;
      [[-0.66, 3], [-0.06, 5], [0.48, 4]].forEach(([d, k], j) => { for (let q = 0; q < k; q++) { const [x, y] = B(sc2 + (q - k / 2) * 0.004, d + (j === 1 ? q * 0.01 : 0)); cns += circ(x, y, 1.3, C.neuroD); } });
    }
    lab += L(B(SEG(6) + 0.03, -0.06), "PNS (lch5 chordotonal)", 600, 25);
    if (n >= 16) { const [x, y] = B(0.21, -0.55); cns += ell(x, y, 6, 4, C.hemo, outline); lab += label(x, y, "ring gland", 200, 14); }

    // trachea
    const dtD = -0.5;
    if (n === 13) {
      for (let i = 1; i <= 10; i++) { const [x, y] = B(SEG(i) + 0.03, -0.18); trach += line(`M${f(x)},${f(y)} l -6,-10 M${f(x)},${f(y)} l 6,-10 M${f(x)},${f(y)} l 0,12`, C.trach, 2.2) + circ(x, y, 2.8, C.trach, outline); }
      lab += L(B(SEG(5) + 0.03, -0.18), "tracheal metameres branching", 430, 14);
    } else {
      const segs = []; for (let i = 1; i <= 10; i++) segs.push(SEG(i) + 0.03);
      if (n === 14) segs.forEach((sv) => (trach += tube(bp([[sv - 0.025, dtD], [sv + 0.025, dtD]]), C.trach, 2.4)));
      else {
        const dt = bp([[0.2, dtD], [0.5, dtD - 0.04], [0.8, dtD], [0.96, -0.3]]);
        trach += n === 17 ? line(dt, "#33536e", 5) + line(dt, "#f2f8fc", 3) : tube(dt, C.trach, 2.8);
        trach += line(bp([[0.22, 0.32], [0.6, 0.36], [0.9, 0.3]]), C.trach, 1.2, 'opacity=".9"');
        segs.forEach((sv) => { trach += line(bp([[sv, dtD - 0.02], [sv + 0.01, -0.78]]), C.trach, 1.2) + line(bp([[sv, dtD + 0.02], [sv - 0.01, -0.12], [sv, 0.3]]), C.trach, 1.0, 'opacity=".8"'); });
        const [sx, sy] = B(0.975, -0.28); trach += circ(sx, sy, 4.5, "#33536e") + circ(sx, sy, 2, n === 17 ? "#f2f8fc" : C.trach);
        lab += label(sx, sy, "posterior spiracle", 618, 100);
      }
      lab += L(B(0.62, dtD - 0.03), n >= 15 ? (n === 17 ? "dorsal trunk (air-filled)" : "dorsal trunk (tr)") : "dorsal trunk fusing", 430, 14);
    }

    // dorsal vessel
    if (n <= 14) {
      const d = n === 13 ? -0.7 : -0.85;
      for (let sv = 0.25; sv < 0.86; sv += 0.012) { const [x, y] = B(sv, d); meso += circ(x, y, 1.8, C.vm); }
      lab += L(B(0.4, d), "cardioblasts (leading edge)", 200, 30);
    } else {
      meso += line(bp([[0.2, -0.9], [0.62, -0.92]]), C.meso, 3) + line(bp([[0.62, -0.92], [0.86, -0.88]]), C.meso, 6);
      for (let sv = 0.24; sv < 0.86; sv += 0.025) { const [x, y] = B(sv, -0.8); meso += circ(x, y, 1.6, "rgba(220,120,110,.7)"); }
      lab += L(B(0.75, -0.9), "dorsal vessel (dv)", 520, 14);
    }

    // somatic muscles
    const ms = n === 13 ? 0.4 : n === 14 ? 0.7 : 1;
    let mus = "";
    for (let i = 1; i < 11; i++) {
      const a = SEG(i), w = 0.0655;
      for (let k = 0; k < 3; k++) mus += line(bp([[a + 0.008 + k * 0.012, -0.86], [a + 0.008 + k * 0.012 + w * 0.5 * ms, -0.86 + 0.3 * ms]]), C.meso, 2);
      for (let k = 0; k < 4; k++) mus += line(bp([[a + 0.012 + k * 0.011, -0.3 * ms], [a + 0.012 + k * 0.011, 0.3 * ms]]), C.meso, 1.8);
      for (let k = 0; k < 3; k++) mus += line(bp([[a + 0.008 + k * 0.013, 0.86], [a + 0.008 + k * 0.013 + w * 0.55 * ms, 0.86 - 0.28 * ms]]), C.meso, 2);
    }
    meso += `<g opacity=".55">${mus}</g>`;
    lab += L(B(SEG(9) + 0.03, 0.1), n >= 15 ? "body-wall muscles" : "myotubes (fusing)", 610, 200);

    // gonad
    const [gx, gy] = B(0.72, -0.28);
    if (n === 13) [[0, 0], [7, 3], [-5, 4], [3, -4]].forEach(([dx, dy]) => (germ += circ(gx + dx, gy + dy, 3, C.germ, outline)));
    else germ += ell(gx, gy, 11, 8, C.germD, outline) + [[-4, -2], [3, -3], [0, 3], [5, 2], [-5, 3]].map(([dx, dy]) => circ(gx + dx, gy + dy, 2.4, C.germ)).join("");
    lab += label(gx, gy, n === 13 ? "pole cells + SGPs" : "gonad (go)", 620, 40);

    // hemocytes & oenocytes
    for (let i = 0; i < 16; i++) { const [x, y] = B(0.12 + r() * 0.78, -0.6 + r() * 1.1); ext += circ(x, y, 1.6, C.hemo, 'opacity=".9"'); }
    for (let i = 3; i < 10; i++) { const [x, y] = B(SEG(i) + 0.04, -0.3); ecto += circ(x, y, 1.6, C.mt) + circ(x + 3, y + 1, 1.6, C.mt); }

    // epidermis + amnioserosa
    if (open) {
      ecto += cells(open[1], open[0] + 360, 0, 9, 150, C.ecto, { nucPos: 0.4, nucR: 1.3 });
      ecto += cells(open[1], open[1] + 3, 0, 11, 1, C.ectoD, { nuc: false }) + cells(open[0] - 3, open[0], 0, 11, 1, C.ectoD, { nuc: false });
      ext += cells(open[0], open[1], 0, 6, Math.round((open[1] - open[0]) / 7), C.extra, { flat: true, nucPos: 0.5, nucR: 1.5 });
      lab += L(pt((open[0] + open[1]) / 2, 3), "amnioserosa (as) · dorsal closure", 330, 12);
    } else ecto += cells(0, 360, 0, 9, 170, C.ecto, { nucPos: 0.4, nucR: 1.3 });
    for (let i = 0; i < 12; i++) [-1, 1].forEach((sg) => {
      if (open && sg < 0) return;
      const a = B(SEG(i), sg * 1.01), b = B(SEG(i), sg * 0.9);
      ecto += line(`M${P2(a)}L${P2(b)}`, "var(--yolk)", 2) + line(`M${P2(a)}L${P2(b)}`, "rgba(20,20,40,.45)", 0.8);
    });
    // head involution (13-16): gnathal lobes converge on the mouth, the dorsal ridge sweeps forward over
    // the procephalon, and the procephalic epidermis folds inward as the dorsal pouch
    const gnath = { 13: [[0.06, 0.72, 6], [0.1, 0.84, 6], [0.14, 0.9, 6]], 14: [[0.045, 0.55, 5.5], [0.075, 0.7, 5.5], [0.105, 0.8, 5.5]], 15: [[0.035, 0.36, 4.5], [0.05, 0.5, 4.5], [0.07, 0.6, 4.5]] }[n];
    if (gnath) { gnath.forEach(([a, b, rr]) => { const [x, y] = B(a, b); ecto += ell(x, y, rr, rr * 0.82, C.ecto, outline); }); lab += L(B(gnath[1][0], gnath[1][1]), n === 15 ? "gnathal lobes (closing on mouth)" : "gnathal lobes", 20, 290); }
    const ridge = { 13: 0.235, 14: 0.18, 15: 0.12, 16: 0.075 }[n];
    if (ridge) {
      const fold = bp([[ridge, -1], [ridge + 0.02, -0.86], [ridge + 0.045, -0.72]]);
      ecto += line(fold, C.edge, 4.6) + line(fold, C.ectoD, 3);
      if (n >= 14) {
        const pouch = bp([[ridge + 0.045, -0.72], [Math.min(0.1, ridge), -0.72], [0.05, -0.45], [0.038, -0.2], [mouth[0] + 0.015, mouth[1] - 0.06]]); // in front of the brain
        ecto += line(pouch, C.ectoD, 1.6, 'stroke-dasharray="3 2.2" opacity=".85"');
        lab += L(B(0.05, -0.45), "dorsal pouch", 60, 22);
      }
      lab += L(B(ridge + 0.02, -0.86), "dorsal ridge", 90, 22);
    }
    if (n >= 14 && n <= 15) { // direction of involution: ridge moves forward, head tissue moves back and in
      const arrow = (p, q) => { const [x1, y1] = B(...p), [x2, y2] = B(...q), a = Math.atan2(y2 - y1, x2 - x1), h = 5;
        return `<path d="M${f(x1)},${f(y1)}L${f(x2)},${f(y2)}" stroke="var(--accent)" stroke-width="1.4" fill="none"/><path d="M${f(x2)},${f(y2)}L${f(x2 - h * Math.cos(a - 0.45))},${f(y2 - h * Math.sin(a - 0.45))}L${f(x2 - h * Math.cos(a + 0.45))},${f(y2 - h * Math.sin(a + 0.45))}Z" fill="var(--accent)"/>`; };
      lab += `<g class="lbl lbl-arrow">${arrow([ridge + 0.09, -0.82], [ridge + 0.035, -0.86])}${arrow([0.06, -0.02], [0.12, -0.02])}</g>`;
      lab += L(B(0.09, -0.02), "head involution", 30, 120);
    }
    if (n >= 16) {
      [[[0.025, 0.24], [0.05, 0.2], [0.07, 0.22]], [[0.06, 0.14], [0.12, 0.1], [0.17, 0.0]], [[0.06, 0.3], [0.12, 0.28], [0.17, 0.2]], [[0.09, 0.12], [0.09, 0.28]]]
        .forEach((p) => (ecto += line(bp(p), n === 17 ? "#2a1f12" : "#6b5232", n === 17 ? 2.2 : 1.6)));
      lab += L(B(0.06, 0.2), "head skeleton", 14, 200);
      ecto += line(eggPath(0.5), C.cut, n === 17 ? 1.8 : 1.1);
    }
    if (n === 17) {
      for (let i = 3; i < 11; i++) for (let q = 0; q < 6; q++) { const a = B(SEG(i) + 0.004 + q * 0.004, 0.995), b = B(SEG(i) + 0.006 + q * 0.004, 0.94); ecto += line(`M${P2(a)}L${P2(b)}`, "#3d2a14", 0.9); }
      lab += L(B(SEG(7) + 0.01, 0.99), "denticle belts", 470, 304);
    }
    return s + G("meso", meso) + G("gut", gut) + G("cns", cns) + G("trach", trach) + G("germ", germ) + G("ext", ext) + G("ecto", ecto) + lab;
  }

  /* =====================================================
     TRANSVERSE SECTION (mid-trunk, dorsal up)
     ===================================================== */
  const sp = (ang, rr) => [SX + rr * Math.cos(rad(ang)), SY + rr * Math.sin(rad(ang))];
  function ring(a0, a1, r0, r1, n, fill, o = {}) {
    let s = "";
    for (let i = 0; i < n; i++) {
      const ta = a0 + ((a1 - a0) * i) / n, tb = a0 + ((a1 - a0) * (i + 1)) / n, tm = (ta + tb) / 2;
      const fl = typeof fill === "function" ? fill(tm) : fill;
      s += `<path d="M${P2(sp(ta, r1))}L${P2(sp(tb, r1))}L${P2(sp(tb, r0))}L${P2(sp(ta, r0))}Z" fill="${fl}" stroke="${C.cellLine}" stroke-width=".55"/>`;
      if (o.nuc !== false) { const [x, y] = sp(tm, r0 + (r1 - r0) * (o.nucPos ?? 0.6)); s += circ(x, y, o.nucR ?? 1.5, C.nuc); }
    }
    return s;
  }
  const dvd = (a) => Math.abs(((((a - 90) % 360) + 540) % 360) - 180); // angular distance from ventral midline
  function section(n, id) {
    const r = rng(300 + n);
    let x = "", lab = "";
    const S = (p, text, lx, ly) => (lab += label(p[0], p[1], text, lx, ly));
    if (n <= 4) {
      if (n === 2) for (let i = 0; i < 6; i++) { const [a, b] = sp(r() * 360, r() * 40); x += circ(a, b, 8, "rgba(255,255,255,.5)") + circ(a, b, 3, "rgba(60,60,80,.55)"); }
      if (n === 3) for (let i = 0; i < 14; i++) { const [a, b] = sp(i * 25.7, 58 + r() * 14); x += circ(a, b, 2.6, "rgba(60,60,80,.55)"); }
      if (n === 4) { x += `<circle cx="${SX}" cy="${SY}" r="${SR - 6}" fill="none" stroke="rgba(255,255,255,.5)" stroke-width="10"/>`; for (let a = 0; a < 360; a += 9) { const [p, q] = sp(a, SR - 6); x += circ(p, q, 2.3, "rgba(60,60,80,.55)"); } }
      S([SX, SY + 20], n === 4 ? "yolk + cortical nuclei" : n === 1 ? "yolk (no nuclei in this plane)" : "yolk", SX, SY + SR + 18);
    } else if (n <= 6) {
      const fate = (a) => { const d = dvd(a); return d < 36 ? C.meso : d < 41 ? C.neuroD : d < 82 ? C.neuro : d < 146 ? C.ecto : C.extra; };
      if (n === 5) x += ring(0, 360, SR - 15, SR, 72, fate);
      else {
        x += ring(126, 414, SR - 15, SR, 62, fate);
        const lp = sp(126, SR - 4), rp = sp(54, SR - 4), c = [SX, SY + SR - 64];
        const d = `M${P2(lp)}Q${P2(c)} ${P2(rp)}`;
        x += line(d, C.edge, 17) + line(d, C.meso, 15) + line(d, "rgba(255,255,255,.55)", 15, 'stroke-dasharray="1 4.5"');
        S([SX, SY + SR - 34], "ventral furrow", SX + 50, SY + SR + 18);
      }
      S(sp(90, SR - 7), "ms", SX - 40, SY + SR + 18); S(sp(150, SR - 7), "NE", SX - SR - 26, SY + 60); S(sp(205, SR - 7), "dEc", SX - SR - 26, SY - 40); S(sp(270, SR - 7), "as", SX + 40, 46);
    } else if (n <= 8) {
      x += ring(0, 360, SR - 14, SR, 70, (a) => { const d = dvd(a); return d < 75 ? C.neuro : d < 140 ? C.ecto : C.extra; });
      if (n === 7) x += ell(SX, SY + SR - 24, 18, 8, C.meso, outline);
      else x += ring(40, 140, SR - 26, SR - 15, 22, C.meso, { nucPos: 0.5 });
      S([SX, SY + SR - 22], n === 7 ? "mesoderm tube" : "mesoderm spreading", SX + 40, SY + SR + 18); S(sp(160, SR - 6), "NE", SX - SR - 24, SY + 50); S(sp(270, SR - 4), "as", SX + 40, 46);
    } else if (n <= 11) {
      const nbN = n === 9 ? 4 : n === 10 ? 6 : 8;
      x += ring(0, 360, SR - 13, SR, 72, C.ecto);
      [90, 270].forEach((c) => {
        const wv = { 4: [0, 0, 0, 0], 6: [0, 1, 0, 0, 1, 0], 8: [0, 2, 1, 0, 0, 1, 2, 0] }[nbN];
        for (let i = 0; i < nbN; i++) { const a = c - 34 + (68 * (i + 0.5)) / nbN; const [p, q] = sp(a, SR - 18), [wf, wo] = NB_WAVE[wv[i]]; x += circ(p, q, 3.8, wf, outline + wo); }
        x += ring(c - 72, c + 72, SR - 30, SR - 23, 34, (a) => (n === 11 && Math.abs(a - c) > 52 ? C.vm : C.meso), { nucPos: 0.5, nucR: 1.2 });
      });
      S(sp(90, SR - 18), "vnb", SX + 46, SY + SR + 18); S(sp(270, SR - 18), "folded posterior gb", SX + 30, 46); S(sp(120, SR - 27), "ms", SX - 58, SY + SR + 18); S(sp(180, SR - 6), "ecto", SX - SR - 26, SY);
      if (n === 11) S(sp(30, SR - 27), "visceral ms", SX + SR + 4, SY + 76);
    } else if (n === 12) {
      x += ring(-35, 215, SR - 13, SR, 52, C.ecto) + ring(215, 325, SR - 5, SR, 9, C.extra, { nucR: 1.2, nucPos: 0.5 });
      x += ell(SX, SY + SR - 25, 34, 9, C.neuro, outline);
      for (let i = 0; i < 9; i++) x += circ(SX - 28 + i * 7, SY + SR - 25, 2.2, C.neuroD);
      x += ring(30, 150, SR - 42, SR - 34, 26, C.meso, { nucPos: 0.5, nucR: 1.1 });
      [180, 0].forEach((c) => {
        x += line(`M${P2(sp(c - 28, SR - 48))}A ${SR - 48} ${SR - 48} 0 0 1 ${P2(sp(c + 28, SR - 48))}`, C.vm, 3);
        x += line(`M${P2(sp(c - 26, SR - 54))}A ${SR - 54} ${SR - 54} 0 0 1 ${P2(sp(c + 26, SR - 54))}`, C.endo, 6);
      });
      S([SX, SY + SR - 25], "vnc primordium", SX + 50, SY + SR + 18); S(sp(180, SR - 54), "midgut rudiment", SX - SR - 8, SY - 60); S(sp(270, SR - 3), "as", SX + 40, 46);
    } else {
      const op = n === 13 ? [235, 305] : n === 14 ? [255, 285] : null;
      if (op) { x += ring(op[1], op[0] + 360, SR - 9, SR, 70, C.ecto, { nucR: 1.2 }) + ring(op[0], op[1], SR - 4, SR, 6, C.extra, { nucR: 1.1, nucPos: 0.5 }); [op[0] + 3, op[1] - 3].forEach((a) => { const [p, q] = sp(a, SR - 14); x += circ(p, q, 3.2, C.vm, outline); }); }
      else x += ring(0, 360, SR - 8, SR, 80, C.ecto, { nucR: 1.1 });
      if (n >= 16) x += `<circle cx="${SX}" cy="${SY}" r="${SR - 0.5}" fill="none" stroke="${C.cut}" stroke-width="${n === 17 ? 2 : 1.2}"/>`;
      if (n === 17) for (let a = 55; a <= 125; a += 5) { const p = sp(a, SR - 1), q = sp(a, SR - 6); x += line(`M${P2(p)}L${P2(q)}`, "#3d2a14", 1); }
      [[200, 56], [340, 56], [150, 54], [30, 54]].forEach(([a, rr]) => { const [p, q] = sp(a, rr); x += ell(p, q, n >= 15 ? 14 : 11, n >= 15 ? 20 : 15, C.fat, "", a); });
      [[45, 70], [110, 135], [165, 195], [-15, 15], [212, 232], [308, 328]].forEach(([a0, a1]) => { for (let a = a0; a <= a1; a += 6) { const [p, q] = sp(a, SR - 14); x += ell(p, q, 2.8, 2, C.meso, "", a); } });
      const vs = { 13: [26, 13], 14: [25, 12], 15: [22, 11], 16: [18, 10], 17: [11, 7] }[n];
      x += ell(SX, SY + SR - 26, vs[0], vs[1], C.neuro, outline);
      if (n >= 14) x += ell(SX, SY + SR - 30, vs[0] * 0.75, vs[1] * 0.35, C.neuroD, 'opacity=".65"');
      const gutRing = (cx, cy, rr) => circ(cx, cy, rr + 3.5, C.vm) + circ(cx, cy, rr, C.endo) + circ(cx, cy, rr - 6, "var(--yolk)");
      const gutArc = (cx, cy, rr, gap) => { // midgut sheet spreading round the yolk, still open dorsally
        const a0 = 270 + gap / 2, a1 = 270 - gap / 2 + 360, k = 40; let d = "";
        for (let i = 0; i <= k; i++) { const a = rad(a0 + ((a1 - a0) * i) / k); d += (i ? "L" : "M") + P2([cx + rr * Math.cos(a), cy + rr * Math.sin(a)]); }
        return d;
      };
      if (n <= 14) { const g = n === 13 ? 96 : 40; x += line(gutArc(SX, SY + 2, 35.8, g), C.vm, 3.6) + line(gutArc(SX, SY + 2, 31, g), C.endo, 6.4); }
      else if (n <= 16) x += gutRing(SX, SY + 2, n === 15 ? 30 : 26);
      else x += gutRing(SX - 22, SY, 17) + gutRing(SX + 24, SY + 12, 15);
      const air = n === 17;
      [222, 318].forEach((a) => { const [p, q] = sp(a, 55); x += circ(p, q, 5, air ? "#33536e" : C.trach, outline) + (air ? circ(p, q, 3.2, "#f2f8fc") : ""); });
      if (!op) { x += circ(SX, SY - SR + 17, 7, C.meso, outline) + circ(SX, SY - SR + 17, 3, "rgba(255,255,255,.6)") + circ(SX - 12, SY - SR + 20, 3, "rgba(220,120,110,.75)") + circ(SX + 12, SY - SR + 20, 3, "rgba(220,120,110,.75)"); }
      S([SX, SY + SR - 26], n === 17 ? "vnc (condensed tip)" : "vnc", SX + 46, SY + SR + 18); S(n <= 14 ? [SX - 31 * Math.cos(rad(30)), SY + 2 + 31 * Math.sin(rad(30))] : [SX + (n === 17 ? -22 : 0), SY + 2], n <= 14 ? "midgut (open dorsally)" : "midgut", SX - SR - 16, SY + 74); S(sp(222, 55), "trachea", SX - SR - 22, SY - 50); S(sp(340, 56), "fat body", SX + SR + 6, SY - 20); S(sp(120, SR - 14), "muscles", SX - 64, SY + SR + 18);
      if (op) S(sp(270, SR - 2), "as + cardioblasts", SX + 30, 46); else S([SX, SY - SR + 17], "dorsal vessel", SX + 30, 46);
    }
    const [lx] = B(SEC_S, 0), [, ty] = B(SEC_S, -1), [, by] = B(SEC_S, 1);
    return `<g data-layer="section">
      <text x="${W - 6}" y="${SY}" transform="rotate(90 ${W - 6} ${SY})" text-anchor="middle" class="svg-label-strong sec-title">TRANSVERSE SECTION</text>
      <circle cx="${SX}" cy="${SY}" r="${SR + 3}" fill="none" stroke="${C.shell}" stroke-width="2.5"/>
      ${circ(SX, SY, SR, `url(#yolkg-${id})`)}${circ(SX, SY, SR, `url(#gran-${id})`)}
      <g clip-path="url(#sclip-${id})">${tagLayers(x)}</g>${lab}
      <text x="${SX - SR - 8}" y="${SY + 4}" text-anchor="end" class="svg-label" opacity=".7">L</text><text x="${SX}" y="${SY - SR - 7}" text-anchor="middle" class="svg-label" opacity=".7">D</text>
      <line x1="${f(lx)}" y1="${f(ty - 8)}" x2="${f(lx)}" y2="${f(by + 8)}" stroke="var(--accent)" stroke-width="1.2" stroke-dasharray="4 3"/>
    </g>`;
  }

  /* =====================================================
     PUBLIC API
     ===================================================== */
  window.EMBRYO_LAYERS = [["ecto", "Ectoderm / epidermis"], ["cns", "Nervous system"], ["meso", "Mesoderm & muscles"], ["gut", "Gut & annexes"], ["trach", "Trachea"], ["germ", "Germline"], ["ext", "Extra-embryonic"]];
  window.renderEmbryo = function (n, opts = {}) {
    const id = "e" + n + "-" + Math.random().toString(36).slice(2, 7);
    LB = [];
    const ventral = opts.view === "ventral" && n >= 9 && n <= 12;
    if (ventral) { RYV = 103; RYD = 103; } // ventral view: bilaterally symmetric outline
    try {
    let body;
    if (ventral) body = ventralView(n, id);
    else if (n <= 4) body = early(n, id);
    else if (n <= 6) body = blasto(n, id);
    else if (n <= 12) body = germBand(n, id);
    else body = late(n, id);
    const showSec = opts.section !== false;
    const pad = opts.labels !== false || opts.pad; // room for three label rows above and below
    const [vy, vh] = pad ? [-18, H + 36] : [0, H];
    const vb = `0 ${vy} ${showSec ? W : 640} ${vh}`;
    const shell = `<path d="${eggPath(-3)}" fill="none" stroke="${C.shell}" stroke-width="1" opacity=".6"/><path d="${eggPath(0)}" fill="none" stroke="${C.shell}" stroke-width="2.6"/>`;
    const axes = opts.axes === false ? "" : `<g class="svg-label" opacity=".75"><text x="4" y="${CY + 4}">A</text><text x="${CX + RX + 8}" y="${CY + 4}">P</text></g>`;
    const rules = (opts.hide || []).map((k) => `#${id}-g [data-layer="${k}"]{display:none}`).join("") + (opts.labels === false ? `#${id}-g .lbl{display:none}` : "");
    return `<svg viewBox="${vb}" role="img" aria-label="Schematic ${ventral ? "ventral" : "lateral"} view and transverse section of a stage ${n} Drosophila embryo" class="embryo-svg${ventral ? " ventral" : ""}">
      ${defs(id)}<style>#${id}-g .lbl-text text{paint-order:stroke;stroke:var(--card);stroke-width:3.2px;stroke-linejoin:round}#${id}-g .seg-name{font:600 7.5px var(--mono);fill:var(--ink-3);letter-spacing:.02em}${rules}</style>
      <g id="${id}-g">${body}${shell}${axes}${showSec ? section(n, id) : ""}${layoutLabels()}</g>
    </svg>`;
    } finally { RYV = 110; RYD = 96; }
  };
  window.EMBRYO_VENTRAL = (n) => n >= 9 && n <= 12;
})();
