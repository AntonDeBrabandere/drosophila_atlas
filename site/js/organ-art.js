/* ==========================================================
   Organ close-ups: four schematic panels per organ system,
   each a zoomed-in view at a key stage. Original drawings,
   colour-coded with the same tokens as the stage schematics.
   Every panel draws into a 320 × 200 viewBox.
   ========================================================== */
(function () {
  const W = 320, H = 200;
  const f = (n) => (+n).toFixed(1);
  const PT = (p) => f(p[0]) + "," + f(p[1]);
  const V = (k) => `var(--${k})`;
  const NUC = "rgba(20,20,30,.34)", CL = "rgba(255,255,255,.55)";
  const OL = 'stroke="rgba(30,25,20,.32)" stroke-width=".8"';
  const TCOL = { hb: "#d9a441", Kr: "#de7a4c", pdm: "#c25a8a", cas: "#7a6cc4", grh: "#4b8fc4" };
  let UID = 0;
  function rng(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

  /* ---------- geometry ---------- */
  function sample(P, n, closed) {
    const m = P.length, segs = closed ? m : m - 1;
    const get = (i) => (closed ? P[((i % m) + m) % m] : P[Math.max(0, Math.min(m - 1, i))]);
    const out = [];
    for (let k = 0; k <= n; k++) {
      const t = (k / n) * segs, i = Math.min(segs - 1, Math.floor(t)), u = t - i;
      const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
      const cr = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u * u + (-a + 3 * b - 3 * c + d) * u * u * u);
      out.push([cr(p0[0], p1[0], p2[0], p3[0]), cr(p0[1], p1[1], p2[1], p3[1])]);
    }
    return out;
  }
  function normals(S, closed) {
    const n = S.length;
    return S.map((p, i) => {
      const a = closed ? S[(i - 1 + n - 1) % (n - 1)] : S[Math.max(0, i - 1)], b = closed ? S[(i + 1) % (n - 1)] : S[Math.min(n - 1, i + 1)];
      const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
      return [-dy / l, dx / l];
    });
  }
  const smooth = (P, closed) => "M" + sample(P, 14 * (closed ? P.length : P.length - 1), closed).map(PT).join("L") + (closed ? "Z" : "");
  const polar = (cx, cy, r, deg) => [cx + r * Math.cos((deg * Math.PI) / 180), cy + r * Math.sin((deg * Math.PI) / 180)];
  const circlePts = (cx, cy, r, k = 36, ry = r) => Array.from({ length: k }, (_, i) => [cx + r * Math.cos((2 * Math.PI * i) / k), cy + ry * Math.sin((2 * Math.PI * i) / k)]);
  const arcPts = (cx, cy, r, a0, a1, k = 24) => Array.from({ length: k + 1 }, (_, i) => polar(cx, cy, r, a0 + ((a1 - a0) * i) / k));

  /* ---------- primitives ---------- */
  const pth = (d, fill, ex = "") => `<path d="${d}" fill="${fill}" ${ex}/>`;
  const ln = (P, c, w, ex = "") => `<path d="${smooth(P)}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" ${ex}/>`;
  const seg = (x1, y1, x2, y2, c, w, ex = "") => `<path d="M${f(x1)},${f(y1)}L${f(x2)},${f(y2)}" stroke="${c}" stroke-width="${w}" stroke-linecap="round" fill="none" ${ex}/>`;
  const circ = (x, y, r, fill, ex = "") => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${fill}" ${ex}/>`;
  const ell = (x, y, rx, ry, fill, ex = "", rot = 0) => `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(rx)}" ry="${f(ry)}" fill="${fill}" ${rot ? `transform="rotate(${f(rot)} ${f(x)} ${f(y)})"` : ""} ${ex}/>`;
  const rect = (x, y, w, h, fill, ex = "") => `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" fill="${fill}" ${ex}/>`;
  // a cell with nucleus
  const cell = (x, y, r, fill, o = {}) => circ(x, y, r, fill, (o.ol ?? OL) + (o.op ? ` fill-opacity="${o.op}"` : "")) + (o.nuc === false ? "" : circ(x + (o.nx || 0), y + (o.ny || 0), r * (o.nr || 0.4), o.nucFill || NUC));
  const ecell = (x, y, rx, ry, fill, rot = 0, o = {}) => ell(x, y, rx, ry, fill, (o.ol ?? OL) + (o.op ? ` fill-opacity="${o.op}"` : ""), rot) + (o.nuc === false ? "" : ell(x, y, Math.min(rx, ry) * 0.42, Math.min(rx, ry) * 0.36, NUC, "", rot));
  const hexPath = (x, y, r) => "M" + Array.from({ length: 6 }, (_, k) => PT(polar(x, y, r, 30 + 60 * k))).join("L") + "Z";
  // epithelium: n cells along curve P, thickness th (number or fn of t) to side ±1 of the curve
  function epi(P, n, th, fill, o = {}) {
    const closed = !!o.closed, S = sample(P, n, closed), N = normals(S, closed), sd = o.side ?? 1;
    const T = (t) => (typeof th === "function" ? th(t) : th);
    let s = "";
    for (let i = 0; i < n; i++) {
      const a = S[i], b = S[i + 1], na = N[i], nb = N[i + 1], ta = T(i / n), tb = T((i + 1) / n);
      const a2 = [a[0] + na[0] * ta * sd, a[1] + na[1] * ta * sd], b2 = [b[0] + nb[0] * tb * sd, b[1] + nb[1] * tb * sd];
      const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      const fl = typeof fill === "function" ? fill(i / n, mid, i) : fill;
      if (!fl) continue;
      s += `<path d="M${PT(a)}L${PT(b)}L${PT(b2)}L${PT(a2)}Z" fill="${fl}" stroke="${CL}" stroke-width=".6"${o.op ? ` fill-opacity="${o.op}"` : ""}/>`;
      if (o.nuc !== false) {
        const q = o.nucPos ?? 0.5, tm = (ta + tb) / 2, nm = [(na[0] + nb[0]) / 2, (na[1] + nb[1]) / 2];
        const nf = typeof o.nucFill === "function" ? o.nucFill(i / n, mid) : o.nucFill || NUC;
        s += circ(mid[0] + nm[0] * tm * q * sd, mid[1] + nm[1] * tm * q * sd, o.nucR ?? Math.max(1.1, Math.min(2.6, tm * 0.17)), nf);
      }
    }
    return s;
  }
  // tube with darker edge and optional lumen
  const tube = (P, w, fill, o = {}) => ln(P, "rgba(30,25,20,.35)", w + 2) + ln(P, fill, w, o.op ? `stroke-opacity="${o.op}"` : "") + (o.lumen === false ? "" : ln(P, "rgba(255,255,255,.5)", Math.max(1, w * 0.25)));
  function arrow(P, o = {}) {
    const c = o.c || V("accent"), w = o.w || 1.4, S = sample(P, 20 * (P.length - 1)), e = S[S.length - 1], b = S[S.length - 3];
    const a = Math.atan2(e[1] - b[1], e[0] - b[0]), h = o.h || 5.5;
    return `<path d="M${S.map(PT).join("L")}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" ${o.dash ? 'stroke-dasharray="3 2.5"' : ""}/>` +
      `<path d="M${PT(e)}L${PT([e[0] - h * Math.cos(a - 0.42), e[1] - h * Math.sin(a - 0.42)])}L${PT([e[0] - h * Math.cos(a + 0.42), e[1] - h * Math.sin(a + 0.42)])}Z" fill="${c}"/>`;
  }
  const arcStroke = (cx, cy, r, a0, a1, c, w) => ln(arcPts(cx, cy, r, a0, a1, 16), c, w);

  /* ---------- labels ---------- */
  let LBL = [];
  const md = (t) => t.replace(/\*([^*]+)\*/g, '<tspan font-style="italic">$1</tspan>');
  // label with optional leader from anchor (ax, ay) to text at (tx, ty)
  function lb(ax, ay, tx, ty, text, o = {}) { LBL.push({ ax, ay, tx, ty, text, o }); return ""; }
  const note = (x, y, text, o = {}) => lb(null, null, x, y, text, { note: true, ...o });
  function drawLabels() {
    let lines = "", texts = "";
    LBL.forEach(({ ax, ay, tx, ty, text, o }) => {
      let a = o.a || (ax == null ? "start" : tx < ax - 4 ? "end" : tx > ax + 4 ? "start" : "middle");
      // keep the text inside the frame (estimated width)
      const w = text.replace(/\*/g, "").length * (o.note ? 3.9 : 4.6) + 2;
      const left = a === "start" ? tx : a === "end" ? tx - w : tx - w / 2;
      if (left < 3) { tx = 3; a = "start"; } else if (left + w > W - 3) { tx = W - 3; a = "end"; }
      if (ax != null) {
        const ex = a === "end" ? tx + 2 : a === "start" ? tx - 2 : tx, ey = a === "middle" ? (ty > ay ? ty - 9 : ty + 3) : ty - 3;
        lines += `<path d="M${f(ax)},${f(ay)}L${f(ex)},${f(ey)}" stroke="var(--ink-3)" stroke-width=".6" fill="none"/>` + circ(ax, ay, 1.5, V("ink"), 'stroke="var(--card)" stroke-width=".7"');
      }
      texts += `<text x="${f(tx)}" y="${f(ty)}" text-anchor="${a}" class="${o.note ? "art-note" : "art-label"}${o.bold ? " art-bold" : ""}"${o.c ? ` style="fill:${o.c}"` : ""}>${md(text)}</text>`;
    });
    return lines + texts;
  }
  // hexagonal surface view of an epithelium; colour(i, j) → fill or null
  function hexField(cols, rows, x0, y0, r, colour) {
    const w = Math.sqrt(3) * r, cen = {};
    let s = "";
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const x = x0 + i * w + (j % 2) * (w / 2), y = y0 + j * 1.5 * r; cen[i + "," + j] = [x, y];
      const [fill, op] = colour(i, j);
      s += pth(hexPath(x, y, r - 0.6), fill, `fill-opacity="${op}" stroke="${CL}" stroke-width=".8"`) + circ(x, y, r * 0.28, NUC);
    }
    return { s, cen };
  }
  const hexNb = (i, j) => (j % 2 === 0 ? [[i - 1, j], [i + 1, j], [i - 1, j - 1], [i, j - 1], [i - 1, j + 1], [i, j + 1]] : [[i - 1, j], [i + 1, j], [i, j - 1], [i + 1, j - 1], [i, j + 1], [i + 1, j + 1]]);

  /* =====================================================
     PANELS: organ id → [{st, t, cap, draw()}]
     ===================================================== */
  const ART = {};

  /* ---------------- CNS ---------------- */
  ART.cns = [
    { st: "5–8", t: "Proneural clusters", cap: "Proneural genes (*ac*/*sc*) mark clusters of 4–6 neuroectoderm cells. Delta–Notch lateral inhibition lets one cell per cluster become the neuroblast; its neighbours stay epidermal.",
      draw() {
        const cl = [[3, 1], [8, 3]], inC = (i, j) => cl.some(([a, b]) => (a === i && b === j) || hexNb(a, b).slice(0, 5).some(([p, q]) => p === i && q === j));
        const isNB = (i, j) => cl.some(([a, b]) => a === i && b === j);
        const hf = hexField(12, 6, 32, 42, 13, (i, j) => (i === 0 ? [V("neuro-d"), 0.18] : isNB(i, j) ? [V("neuro-d"), 1] : inC(i, j) ? [V("neuro"), 0.7] : [V("neuro"), 0.22]));
        let s = hf.s;
        const [nx, ny] = hf.cen["8,3"];
        hexNb(8, 3).slice(0, 4).forEach(([p, q]) => { const [x, y] = hf.cen[p + "," + q]; s += arrow([[nx + (x - nx) * 0.3, ny + (y - ny) * 0.3], [nx + (x - nx) * 0.78, ny + (y - ny) * 0.78]], { w: 1.2, h: 4 }); });
        const [ax, ay] = hf.cen["3,1"];
        lb(hf.cen["0,2"][0], hf.cen["0,2"][1], 14, 190, "mesectoderm (future midline)");
        lb(ax, ay, 110, 18, "neuroblast-to-be (high Delta)");
        lb(hf.cen["4,1"][0], hf.cen["4,1"][1] + 6, 210, 18, "proneural cluster (*ac*/*sc*)");
        lb(nx + 16, ny + 4, 300, 190, "Delta → Notch: neighbours stay epidermal", { a: "end" });
        note(312, 30, "surface view · anterior left", { a: "end" });
        return s;
      } },
    { st: "9", t: "Delamination", cap: "The selected cell constricts apically, becomes bottle-shaped and moves inside, beneath the epithelium. There it rounds up and enlarges into a neuroblast while the sheet closes over it.",
      draw() {
        let s = rect(0, 132, W, 68, V("yolk"), 'opacity=".7"');
        s += epi([[0, 40], [320, 40]], 24, 26, V("neuro"), { op: 0.45, nucPos: 0.45 });
        s += pth("M101,40 L110,40 C 113,55 121,63 118,76 A 12 12 0 1 1 93,76 C 90,63 98,55 101,40 Z", V("neuro-d"), OL) + circ(105.5, 78, 4.4, NUC);
        s += cell(212, 88, 17, V("neuro-d"), { nr: 0.36 });
        s += epi([[0, 120], [320, 120]], 26, 12, V("meso"), { op: 0.85, nucR: 1.3 });
        s += arrow([[128, 92], [160, 100], [190, 94]], { w: 1.2, dash: true });
        lb(48, 54, 48, 22, "neuroectoderm", { a: "middle" });
        lb(105, 46, 140, 22, "apical constriction → bottle cell");
        lb(160, 99, 160, 112, "time", { a: "middle", note: true });
        lb(224, 98, 268, 168, "neuroblast (enlarging)");
        lb(70, 126, 40, 168, "mesoderm");
        note(312, 34, "outside", { a: "end" }); note(312, 114, "inside", { a: "end" }); note(312, 194, "yolk", { a: "end" });
        return s;
      } },
    { st: "10–11", t: "Asymmetric division, temporal series", cap: "Each NB divides asymmetrically: Par/Insc sit apically, Miranda–Prospero–Numb go basally into the small GMC. GMCs inherit the temporal factor active at their birth: *hb* → *Kr* → *pdm* → *cas* → *grh*. Each GMC divides once more into two neurons (or glia).",
      draw() {
        let s = epi([[0, 12], [320, 12]], 30, 10, V("neuro"), { op: 0.35, nucR: 1 });
        const cx = 70, cy = 64, r = 22;
        s += cell(cx, cy, r, TCOL.cas);
        s += arcStroke(cx, cy, r + 0.5, 205, 335, V("accent"), 4.2) + arcStroke(cx, cy, r + 0.5, 30, 150, V("germ-d"), 4.2);
        const pairs = [["pdm", 106, 132], ["Kr", 146, 152], ["hb", 190, 168]];
        s += ln([[cx, cy + r], [76, 108], [110, 132], [150, 151], [192, 167]], "var(--ink-3)", 0.8, 'stroke-dasharray="2 2.5"');
        s += cell(76, 108, 8, TCOL.cas);
        pairs.forEach(([g, x, y]) => { s += cell(x - 6, y + 2, 6.5, TCOL[g]) + cell(x + 7, y - 3, 6.5, TCOL[g]); });
        const genes = ["hb", "Kr", "pdm", "cas", "grh"];
        genes.forEach((g, i) => {
          const x = 150 + i * 32;
          s += `<rect x="${x}" y="70" width="27" height="16" rx="8" fill="${TCOL[g]}" ${g === "cas" ? 'stroke="var(--ink)" stroke-width="1.6"' : ""}/>` + `<text x="${x + 13.5}" y="81.5" text-anchor="middle" class="art-chip">${g}</text>`;
          if (i) s += arrow([[x - 4.5, 78], [x - 0.5, 78]], { c: "var(--ink-3)", w: 1, h: 3 });
        });
        note(150, 98, "temporal TFs in the NB, in order");
        lb(cx, cy - r - 2, 112, 40, "apical: Par / Insc");
        lb(cx - 12, cy + r - 2, 10, 128, "basal: Mira · Pros · Numb", { a: "start" });
        lb(84, 108, 112, 112, "GMC born in the *cas* window");
        lb(152, 150, 210, 136, "neurons from earlier GMCs");
        lb(196, 165, 236, 186, "first-born: *hb* neurons");
        lb(cx + r, cy - 6, 112, 58, "neuroblast (now *cas*)");
        return s;
      } },
    { st: "13–17", t: "Axon scaffold", cap: "Pioneer axons build a ladder: two longitudinal connectives plus an anterior and a posterior commissure per segment, crossing over midline glia. Motor axons leave in the intersegmental (ISN) and segmental (SN) nerves. From stage 16 the cord condenses.",
      draw() {
        const r = rng(7);
        let s = "";
        for (let i = 0; i < 150; i++) { const top = i % 2, x = 6 + r() * 308, y = top ? 48 + r() * 24 : 128 + r() * 24; s += circ(x, y, 2.4, V("neuro"), 'fill-opacity=".45"'); }
        s += seg(0, 100, 320, 100, "var(--ink-3)", 0.6, 'stroke-dasharray="3 3"');
        [0, 1, 2].forEach((k) => {
          const x0 = 10 + k * 100;
          [x0 + 22, x0 + 82].forEach((x, j) => [-1, 1].forEach((sd) => { s += ln([[x, 100 + sd * 18], [x - 4 + j * 8, 100 + sd * 50], [x - 10 + j * 18, 100 + sd * 82]], V("neuro-d"), 1.6); }));
          [x0 + 38, x0 + 66].forEach((x) => { s += seg(x, 82, x, 118, V("neuro"), 6.5) + ell(x, 100, 5, 3.4, V("extra"), OL); });
          s += `<text x="${x0 + 52}" y="168" text-anchor="middle" class="art-chip-dark">A${k + 1}</text>`;
        });
        s += seg(0, 82, 320, 82, V("neuro"), 6.5) + seg(0, 118, 320, 118, V("neuro"), 6.5);
        lb(48, 90, 14, 14, "anterior commissure", { a: "start" });
        lb(126, 50, 128, 14, "ISN", { a: "middle" });
        lb(194, 52, 196, 14, "SN", { a: "middle" });
        lb(262, 60, 300, 14, "cortex (cell bodies)", { a: "end" });
        lb(76, 110, 30, 192, "posterior commissure", { a: "start" });
        lb(148, 100, 156, 192, "midline glia", { a: "start" });
        lb(250, 118, 306, 192, "connective (neuropil)", { a: "end" });
        note(312, 176, "ventral view · anterior left", { a: "end" });
        return s;
      } }
  ];

  /* ---------------- PNS ---------------- */
  ART.pns = [
    { st: "10–11", t: "Sensory organ precursors", cap: "Proneural genes mark clusters in the lateral ectoderm: *ac*/*sc* for external sense organs, *atonal* for chordotonal organs. Notch signalling selects one sensory organ precursor (SOP) per cluster.",
      draw() {
        const es = [[2, 2], [9, 4]], ch = [[6, 1]];
        const hit = (L, i, j) => L.some(([a, b]) => (a === i && b === j) || hexNb(a, b).slice(0, 5).some(([p, q]) => p === i && q === j));
        const sop = (L, i, j) => L.some(([a, b]) => a === i && b === j);
        const hf = hexField(12, 6, 32, 42, 13, (i, j) => (sop(es, i, j) ? [V("neuro-d"), 1] : sop(ch, i, j) ? [V("ecto-d"), 1] : hit(es, i, j) ? [V("neuro"), 0.6] : hit(ch, i, j) ? [V("trach"), 0.75] : [V("ecto"), 0.28]));
        let s = hf.s;
        const [cx, cy] = hf.cen["6,1"];
        hexNb(6, 1).slice(0, 4).forEach(([p, q]) => { const [x, y] = hf.cen[p + "," + q]; s += arrow([[cx + (x - cx) * 0.3, cy + (y - cy) * 0.3], [cx + (x - cx) * 0.78, cy + (y - cy) * 0.78]], { w: 1.2, h: 4 }); });
        lb(...hf.cen["2,2"], 20, 190, "SOP of an external sense organ");
        lb(hf.cen["3,2"][0] + 4, hf.cen["3,2"][1] + 4, 110, 18, "*ac*/*sc* cluster");
        lb(cx, cy, 200, 18, "SOP of a chordotonal organ (*ato*)");
        lb(hf.cen["11,3"][0], hf.cen["11,3"][1], 300, 190, "lateral epidermis", { a: "end" });
        note(312, 30, "surface view", { a: "end" });
        return s;
      } },
    { st: "12", t: "SOP lineage", cap: "The SOP (pI) divides asymmetrically, with Numb going to pIIb. In an external sense organ pIIa gives socket and shaft cells; pIIb gives glia plus pIIIb, which makes the sheath and the neuron.",
      draw() {
        const N = { pI: [160, 32, 11, V("neuro-d")], pIIa: [95, 82, 9, V("ecto")], pIIb: [225, 82, 9, V("neuro")], socket: [58, 140, 8, V("ecto-d")], shaft: [132, 140, 8, V("ecto")], pIIIb: [200, 130, 8, V("neuro")], glia: [272, 132, 8, "var(--ink-3)"], neuron: [176, 176, 8, V("neuro-d")], sheath: [226, 176, 8, V("neuro")] };
        const E = [["pI", "pIIa"], ["pI", "pIIb"], ["pIIa", "socket"], ["pIIa", "shaft"], ["pIIb", "pIIIb"], ["pIIb", "glia"], ["pIIIb", "neuron"], ["pIIIb", "sheath"]];
        let s = E.map(([a, b]) => seg(N[a][0], N[a][1], N[b][0], N[b][1], "var(--ink-3)", 1)).join("");
        Object.entries(N).forEach(([k, [x, y, r, c]]) => { s += cell(x, y, r, c, { op: k === "sheath" ? 0.55 : null }); });
        s += arcStroke(160, 32, 11.6, 10, 80, V("germ-d"), 3.4);
        const name = { pI: "SOP (pI)", pIIa: "pIIa", pIIb: "pIIb", socket: "socket", shaft: "shaft", pIIIb: "pIIIb", glia: "glia", neuron: "neuron", sheath: "sheath" };
        Object.entries(N).forEach(([k, [x, y, r]]) => { if (k === "pI") note(x + 16, y + 4, name[k], { c: "var(--ink)" }); else if (k === "neuron" || k === "sheath") note(x, y + r + 11, name[k], { a: "middle", c: "var(--ink)" }); else note(x + (k === "pIIa" ? -14 : 14), y + 3, name[k], { a: k === "pIIa" || k === "socket" ? "end" : "start", c: "var(--ink)" }); });
        lb(168, 40, 236, 50, "Numb crescent");
        note(10, 194, "external sense organ (es) lineage");
        return s;
      } },
    { st: "13–15", t: "Clusters and axons", cap: "The sensory organs of each abdominal hemisegment gather in dorsal, lateral and ventral clusters. Their axons fasciculate into the ISN and SN and grow ventrally into the CNS.",
      draw() {
        let s = `<rect x="40" y="12" width="240" height="150" rx="10" fill="${V("ecto")}" fill-opacity=".1" stroke="var(--line)" stroke-dasharray="4 3"/>`;
        s += rect(0, 172, W, 20, V("neuro"), 'opacity=".85" rx="6"');
        s += ln([[150, 38], [170, 70], [176, 110], [180, 172]], V("neuro-d"), 1.7) + ln([[130, 92], [160, 98], [174, 102]], V("neuro-d"), 1.4);
        s += ln([[196, 128], [184, 140], [182, 150]], V("neuro-d"), 1.2) + ln([[148, 150], [140, 160], [134, 172]], V("neuro-d"), 1.7);
        [[142, 34], [152, 30], [160, 38]].forEach(([x, y]) => (s += cell(x, y, 4.2, V("neuro-d"))));
        s += cell(170, 26, 3.6, V("ecto-d"));
        for (let k = 0; k < 5; k++) s += ecell(108 + k * 7, 92, 2.6, 8.5, V("neuro"), 10);
        [[192, 126], [200, 132], [196, 120]].forEach(([x, y]) => (s += cell(x, y, 3.8, V("neuro-d"))));
        [[140, 150], [150, 146], [158, 152], [146, 156]].forEach(([x, y]) => (s += cell(x, y, 3.8, V("neuro-d"))));
        lb(150, 30, 120, 16, "dorsal cluster (da, es)", { a: "end" });
        lb(112, 92, 30, 74, "lateral cluster (lch5)", { a: "start" });
        lb(200, 128, 250, 120, "v′ cluster");
        lb(140, 152, 60, 150, "v cluster", { a: "end" });
        lb(176, 110, 250, 92, "ISN");
        lb(136, 168, 90, 172, "SN", { a: "end" });
        lb(260, 182, 300, 196, "ventral nerve cord", { a: "end" });
        note(312, 24, "one hemisegment · dorsal up", { a: "end" });
        return s;
      } },
    { st: "16–17", t: "Mature sensory neurons", cap: "Chordotonal organs such as lch5 (five scolopidia) are stretch receptors. Multidendritic (da) neurons tile the body wall with branched dendrites; class IV neurons have the most complex arbors.",
      draw() {
        let s = epi([[0, 12], [320, 12]], 30, 10, V("ecto"), { op: 0.5, nucR: 1 });
        s += cell(64, 28, 5, V("ecto-d"));
        for (let k = 0; k < 5; k++) {
          const xb = 40 + k * 12, xt = 56 + k * 4;
          s += ln([[64, 30], [xt, 50], [xt + (xb - xt) * 0.3, 76]], V("ecto-d"), 2.4);
          s += ell(xt + (xb - xt) * 0.35, 86, 2.6, 9, V("ecto"), OL, (xb - xt) * 0.4);
          s += ln([[xt + (xb - xt) * 0.4, 94], [xb, 140]], V("neuro-d"), 1.1) + ecell(xb, 150, 4.5, 7, V("neuro-d"));
          s += ln([[xb, 157], [60 + k * 2, 185], [62, 200]], V("neuro-d"), 0.9);
        }
        const r = rng(11);
        const branch = (x, y, ang, len, d) => {
          if (d === 0 || len < 4) return "";
          const x2 = x + len * Math.cos(ang), y2 = y + len * Math.sin(ang);
          let o = seg(x, y, x2, y2, V("neuro-d"), Math.max(0.5, d * 0.45));
          o += branch(x2, y2, ang - 0.45 - r() * 0.3, len * 0.72, d - 1) + branch(x2, y2, ang + 0.45 + r() * 0.3, len * 0.72, d - 1);
          return o;
        };
        [-2.4, -1.57, -0.75, 0.0, Math.PI].forEach((a) => (s += branch(222, 112, a, 26, 5)));
        s += cell(222, 112, 6, V("neuro-d")) + ln([[222, 118], [220, 160], [214, 200]], V("neuro-d"), 1.2);
        lb(64, 28, 96, 30, "attachment cell");
        lb(56, 52, 100, 54, "cap cells");
        lb(66, 86, 100, 80, "scolopales");
        lb(40, 150, 14, 120, "lch5 neurons", { a: "start" });
        lb(228, 110, 262, 186, "class IV da neuron");
        lb(258, 80, 300, 40, "dendrites", { a: "end" });
        lb(218, 170, 196, 190, "axon → CNS", { a: "end" });
        return s;
      } }
  ];

  /* ---------------- SNS ---------------- */
  const foregutWalls = (Pd, Pv, fillD, fillV) => epi(Pd, 34, 12, fillD, { side: -1, nucR: 1.4 }) + epi(Pv, 34, 12, fillV, { side: 1, nucR: 1.4 });
  ART.sns = [
    { st: "11", t: "SNS anlage", cap: "The dorsal wall of the invaginating stomodeum (future foregut) expresses the proneural gene *l(1)sc*. Notch signalling restricts it to the domains that will form the stomatogastric nervous system.",
      draw() {
        let s = ell(130, 40, 70, 24, V("neuro"), 'fill-opacity=".3"');
        const Pd = [[22, 132], [70, 126], [140, 116], [220, 106], [286, 102]], Pv = [[22, 166], [70, 162], [140, 150], [220, 140], [286, 136]];
        s += foregutWalls(Pd, Pv, (t, m) => (m[0] > 100 && m[0] < 210 ? V("neuro") : V("fore")), V("fore"));
        s += epi([[286, 102], [300, 119], [286, 136]], 6, 12, V("fore"), { side: -1, nucR: 1.3 });
        s += epi([[2, 92], [12, 120], [22, 132]], 6, 12, V("ecto"), { side: -1, nucR: 1.3 }) + epi([[22, 166], [12, 180], [2, 198]], 6, 12, V("ecto"), { side: 1, nucR: 1.3 });
        lb(130, 34, 196, 18, "brain (procephalic neuroectoderm)");
        lb(160, 106, 210, 70, "SNS anlage: *l(1)sc* in the dorsal wall");
        lb(230, 124, 270, 190, "lumen", { a: "middle" });
        lb(80, 168, 80, 196, "stomodeum (foregut epithelium)", { a: "start" });
        lb(18, 150, 6, 74, "mouth", { a: "start" });
        note(312, 190, "sagittal · anterior left", { a: "end" });
        return s;
      } },
    { st: "12", t: "Three invaginations", cap: "Three pouches fold out of the dorsal wall of the stomodeum, EP1 to EP3 from anterior to posterior; Notch and Wg/Hh signalling pattern them.",
      draw() {
        const Pd = [[0, 112], [55, 112], [68, 106], [72, 80], [88, 66], [104, 80], [108, 106], [125, 112], [140, 106], [144, 80], [160, 66], [176, 80], [180, 106], [195, 112], [210, 106], [214, 80], [230, 66], [246, 80], [250, 106], [265, 112], [320, 112]];
        let s = epi(Pd, 90, 11, (t, m) => (m[1] < 105 ? V("neuro") : V("fore")), { side: -1, nucR: 1.3 });
        s += epi([[0, 152], [320, 152]], 30, 12, V("fore"), { side: 1, nucR: 1.4 });
        [[88, "EP1"], [160, "EP2"], [230, "EP3"]].forEach(([x, t]) => note(x, 44, t, { a: "middle", bold: true, c: "var(--ink)" }));
        lb(160, 132, 160, 140, "lumen", { a: "middle", note: true });
        lb(40, 108, 30, 190, "stomodeal epithelium", { a: "start" });
        lb(176, 84, 270, 30, "pouch cells (*l(1)sc*)", { a: "start" });
        note(312, 190, "dorsal up · anterior left", { a: "end" });
        return s;
      } },
    { st: "13", t: "Delamination and migration", cap: "The pouches pinch off from the foregut. Their cells delaminate and migrate along the foregut to the sites of the future ganglia.",
      draw() {
        let s = foregutWalls([[0, 120], [320, 120]], [[0, 158], [320, 158]], V("fore"), V("fore"));
        [[78, 62, 13], [150, 56, 12]].forEach(([x, y, r]) => (s += epi(circlePts(x, y, r, 12), 12, 7, V("neuro"), { closed: true, nucR: 1.2 })));
        const r = rng(5);
        for (let i = 0; i < 14; i++) { const x = 190 + i * 8 + r() * 6, y = 92 + r() * 14 - i * 0.6; s += cell(x, y, 3.8, V("neuro")); }
        s += arrow([[200, 80], [250, 76], [300, 82]], { w: 1.3 });
        lb(78, 62, 40, 24, "pouch vesicle pinching off", { a: "start" });
        lb(230, 94, 210, 136, "migrating SNS precursors", { a: "start" });
        lb(160, 139, 100, 194, "foregut", { a: "middle", note: true });
        note(312, 194, "anterior left", { a: "end" });
        return s;
      } },
    { st: "14–16", t: "Stomatogastric ganglia", cap: "The frontal ganglion sits on the pharynx and connects to the brain. The recurrent nerve runs back along the oesophagus to the hypocerebral and proventricular ganglia, which control foregut muscles and the proventriculus.",
      draw() {
        let s = ell(150, 38, 72, 22, V("neuro"), 'fill-opacity=".45"');
        s += tube([[14, 140], [60, 138], [92, 134]], 16, V("fore")) + tube([[92, 134], [160, 140], [222, 142]], 8, V("fore"));
        s += cell(246, 146, 16, V("fore"), { nuc: false }) + circ(246, 146, 6, "rgba(255,255,255,.5)") + tube([[260, 152], [290, 160], [320, 166]], 18, V("endo"));
        s += ln([[80, 112], [100, 80], [118, 56]], V("neuro-d"), 1.3) + ln([[84, 112], [112, 84], [134, 58]], V("neuro-d"), 1.3);
        s += ln([[82, 114], [130, 118], [178, 120], [236, 126]], V("neuro-d"), 1.5);
        s += cell(82, 114, 7, V("neuro-d")) + cell(180, 120, 5.5, V("neuro-d")) + cell(238, 126, 5.5, V("neuro-d"));
        lb(150, 34, 230, 16, "brain");
        lb(82, 114, 30, 98, "frontal ganglion", { a: "end" });
        lb(130, 118, 118, 94, "recurrent nerve", { a: "middle" });
        lb(180, 120, 186, 94, "hypocerebral ganglion", { a: "start" });
        lb(238, 126, 300, 112, "proventricular g.", { a: "end" });
        lb(40, 140, 30, 176, "pharynx", { a: "middle" });
        lb(160, 140, 140, 176, "oesophagus", { a: "middle" });
        lb(246, 156, 246, 192, "proventriculus", { a: "middle" });
        lb(300, 162, 312, 140, "midgut", { a: "end" });
        return s;
      } }
  ];

  /* ---------------- TRACHEA ---------------- */
  const SEGS10 = ["T2", "T3", "A1", "A2", "A3", "A4", "A5", "A6", "A7", "A8"];
  ART.trachea = [
    { st: "10", t: "Tracheal placodes", cap: "*trachealess* (*trh*) and *ventral veinless* (*vvl*) define ten placodes per side in the lateral ectoderm, from T2 to A8, each of about 80 cells.",
      draw() {
        let s = rect(10, 36, 300, 36, V("ecto"), 'opacity=".25"') + rect(10, 72, 300, 56, V("ecto"), 'opacity=".45"') + rect(10, 128, 300, 34, V("neuro"), 'opacity=".22"');
        for (let k = 0; k <= 10; k++) s += seg(10 + k * 30, 36, 10 + k * 30, 162, "rgba(20,20,40,.35)", 0.9);
        SEGS10.forEach((n, k) => {
          const x = 25 + k * 30;
          s += ell(x, 100, 10, 14, V("trach"), OL);
          for (let q = 0; q < 6; q++) s += circ(x - 5 + (q % 3) * 5, 94 + Math.floor(q / 3) * 10, 1.3, NUC);
          s += `<text x="${x}" y="176" text-anchor="middle" class="art-chip-dark">${n}</text>`;
        });
        lb(145, 100, 150, 20, "tracheal placode (*trh*, *vvl*)", { a: "middle" });
        lb(290, 50, 300, 194, "dorsal ectoderm", { a: "end" });
        lb(40, 145, 14, 194, "ventral neuroectoderm", { a: "start" });
        note(10, 28, "lateral view · anterior left");
        return s;
      } },
    { st: "11", t: "Invagination", cap: "Placode cells constrict apically and sink in as a sac, the tracheal pit, which stays open to the surface (the future spiracular branch). The cells no longer divide; all later growth comes from cell shape changes and migration.",
      draw() {
        const P = [[0, 44], [100, 44], [124, 50], [133, 72], [128, 106], [140, 140], [160, 152], [180, 140], [192, 106], [187, 72], [196, 50], [220, 44], [320, 44]];
        let s = rect(0, 0, W, 44, "transparent");
        const r = rng(3);
        for (let i = 0; i < 18; i++) { const x = r() * 320, y = 70 + r() * 120; if (Math.abs(x - 160) > 52 || y > 170) s += ecell(x, y, 6, 3.5, V("meso"), r() * 180, { op: 0.6 }); }
        s += epi(P, 64, 14, (t, m) => (m[0] > 116 && m[0] < 204 && m[1] > 47 ? V("trach") : V("ecto")), { side: 1, nucR: 1.5 });
        const S = sample(P, 64); S.forEach((p, i) => { if (p[0] > 118 && p[0] < 202 && i % 2 === 0) s += circ(p[0], p[1], 1.4, V("accent")); });
        lb(60, 52, 40, 24, "epidermis", { a: "middle" });
        lb(160, 60, 160, 22, "pit (opens to the outside)", { a: "middle" });
        lb(184, 128, 240, 160, "tracheal sac (*trh*, *btl*)");
        lb(126, 66, 70, 100, "apical myosin", { a: "end" });
        lb(40, 150, 30, 190, "mesoderm", { a: "start" });
        note(312, 36, "outside", { a: "end" });
        return s;
      } },
    { st: "12–13", t: "Primary branches", cap: "Branchless (FGF), made by small cell clusters around each sac, attracts Breathless (FGFR)-expressing tracheal cells. Each metamere buds a stereotyped set of primary branches.",
      draw() {
        const B = { DB: [[160, 94], [158, 60], [150, 26]], DTa: [[154, 94], [120, 82], [82, 78]], DTp: [[166, 94], [200, 82], [238, 78]], VB: [[168, 104], [206, 110], [246, 120]], LTa: [[154, 108], [126, 134], [100, 158]], LTp: [[166, 110], [192, 140], [214, 160]], GB: [[160, 112], [160, 148], [158, 182]] };
        let s = "";
        Object.values(B).forEach((P) => {
          s += tube(P, 9, V("trach"), { lumen: false });
          const S = sample(P, 6); S.slice(1).forEach((p) => (s += circ(p[0], p[1], 1.5, NUC)));
          const e = P[2], d = P[1], ux = e[0] - d[0], uy = e[1] - d[1], l = Math.hypot(ux, uy);
          [[0, 0], [3, 3], [-3, 3]].forEach(([a, b]) => (s += circ(e[0] + (ux / l) * 13 + a, e[1] + (uy / l) * 13 + b, 2.6, V("accent"), 'fill-opacity=".85"')));
        });
        s += ell(160, 102, 15, 12, V("trach"), OL) + circ(160, 102, 2, NUC);
        const pos = { DB: [150, 26, 140, 16, "end"], DTa: [82, 78, 60, 64, "end"], DTp: [238, 78, 262, 64, "start"], VB: [246, 120, 268, 132, "start"], LTa: [100, 158, 80, 172, "end"], LTp: [214, 160, 234, 176, "start"], GB: [158, 182, 140, 194, "end"] };
        Object.entries(pos).forEach(([k, [ax, ay, tx, ty, a]]) => lb(ax, ay, tx, ty, k, { a, bold: true }));
        lb(150 + 0, 26 - 13 + 0, 210, 16, "Bnl (FGF) source", { a: "start" });
        note(10, 194, "one metamere · dorsal up");
        return s;
      } },
    { st: "14–17", t: "Fusion into a network", cap: "Fusion cells (*escargot*) at branch tips meet their partners from the neighbouring metamere or the other side, joining the dorsal trunk, lateral trunk and dorsal anastomoses. Terminal cells grow fine branches (st 16) and the tubes fill with air (st 17).",
      draw() {
        let s = "";
        s += seg(0, 14, 320, 14, "var(--ink-3)", 0.6, 'stroke-dasharray="3 3"');
        [60, 160, 260].forEach((x) => { s += tube([[x, 72], [x - 4, 44], [x + 8, 16]], 5, V("trach")) + circ(x + 8, 16, 2.6, V("ecto-d")); s += tube([[x, 72], [x + 6, 110], [x, 150]], 4, V("trach")); });
        s += tube([[0, 72], [320, 72]], 11, V("trach")) + tube([[0, 150], [320, 150]], 5, V("trach"));
        [110, 210].forEach((x) => { s += circ(x - 3, 72, 2.6, V("ecto-d")) + circ(x + 3, 72, 2.6, V("ecto-d")) + circ(x, 150, 2.2, V("ecto-d")); });
        const r = rng(9);
        [[90, 172], [200, 176]].forEach(([x, y]) => {
          s += cell(x, y, 4, V("trach"));
          for (let k = 0; k < 6; k++) { const a = -0.3 + r() * 3.7; s += ln([[x, y], [x + 14 * Math.cos(a), y + 10 * Math.sin(a) + 2], [x + 26 * Math.cos(a), y + 16 * Math.sin(a) + 4]], V("trach"), 0.8); }
          s += seg(x, y - 4, x - 6, 152, V("trach"), 1.6);
        });
        lb(40, 72, 30, 98, "dorsal trunk", { a: "middle" });
        lb(107, 72, 122, 100, "fusion cells (*esg*)", { a: "start" });
        lb(168, 16, 200, 34, "dorsal branches fuse across the midline", { a: "start" });
        lb(266, 110, 300, 100, "connective", { a: "end" });
        lb(300, 150, 310, 132, "lateral trunk", { a: "end" });
        lb(90, 172, 40, 194, "terminal cell", { a: "start" });
        note(312, 194, "dorsal up · anterior left", { a: "end" });
        return s;
      } }
  ];

  /* ---------------- EPIDERMIS ---------------- */
  function closureView(hFn, o = {}) {
    const cx = 160, cy = 100, x0 = 20, x1 = 300, step = 9;
    const id = "dc" + ++UID;
    const top = (x) => cy - hFn((x - x0) / (x1 - x0)), bot = (x) => cy + hFn((x - x0) / (x1 - x0));
    const eye = [];
    for (let x = x0; x <= x1; x += 4) eye.push([x, top(x)]);
    for (let x = x1; x >= x0; x -= 4) eye.push([x, bot(x)]);
    let s = `<defs><clipPath id="${id}"><path d="M${eye.map(PT).join("L")}Z"/></clipPath></defs>`;
    const r = rng(21);
    let as = "";
    for (let y = 40; y < 162; y += 16) for (let x = x0; x < x1; x += 19) as += ell(x + (y % 32 ? 9 : 0) + r() * 4, y + r() * 4, 10, 8, V("extra"), 'stroke="rgba(255,255,255,.7)" stroke-width=".8"') + circ(x + (y % 32 ? 9 : 0) + 2, y + 2, 2.2, NUC);
    s += `<g clip-path="url(#${id})">${as}</g>`;
    for (let x = 0; x < W; x += step) {
      [[top, 8, -1], [bot, 192, 1]].forEach(([fb, edge, sd]) => {
        const xa = x, xb = x + step, ya = fb(Math.max(x0, Math.min(x1, xa))), yb = fb(Math.max(x0, Math.min(x1, xb)));
        const lea = ya + sd * 10, leb = yb + sd * 10;
        const stripe = o.stripes && Math.floor((x + 4) / 40) % 2 === 0 && ((x + 4) % 40) < 9;
        s += `<path d="M${f(xa)},${f(lea)}L${f(xb)},${f(leb)}L${f(xb)},${edge}L${f(xa)},${edge}Z" fill="${stripe ? V("ecto-d") : V("ecto")}" fill-opacity="${stripe ? 0.75 : 0.5}" stroke="${CL}" stroke-width=".6"/>`;
        s += `<path d="M${f(xa)},${f(ya)}L${f(xb)},${f(yb)}L${f(xb)},${f(leb)}L${f(xa)},${f(lea)}Z" fill="${V("ecto-d")}" fill-opacity=".85" stroke="${CL}" stroke-width=".6"/>`;
        s += circ(xa + step / 2, (ya + lea) / 2, 1.5, NUC) + circ(xa + step / 2, (lea + edge) / 2 + sd * 6, 1.5, NUC);
      });
    }
    s += `<path d="M${eye.slice(0, eye.length / 2).map(PT).join("L")}" fill="none" stroke="var(--ink)" stroke-width="1.4" opacity=".65"/><path d="M${eye.slice(eye.length / 2).map(PT).join("L")}" fill="none" stroke="var(--ink)" stroke-width="1.4" opacity=".65"/>`;
    return s;
  }
  ART.epidermis = [
    { st: "10–11", t: "Segment polarity stripes", cap: "*engrailed* (*en*, posterior compartment) and *wingless* (*wg*, the row just anterior) face each other at every parasegment boundary. Hh from the *en* cells keeps *wg* on, and Wg keeps *en* on.",
      draw() {
        let s = "";
        const cw = 13, x0 = 17;
        for (let c = 0; c < 22; c++) {
          const k = c % 5, fill = k === 2 ? V("accent") : k >= 3 ? V("ecto-d") : V("ecto"), op = k === 2 ? 0.6 : k >= 3 ? 0.8 : 0.3;
          for (let rr = 0; rr < 6; rr++) s += rect(x0 + c * cw, 50 + rr * 18, cw - 0.8, 17.2, fill, `fill-opacity="${op}" stroke="${CL}" stroke-width=".6"`) + circ(x0 + c * cw + 6, 58.6 + rr * 18, 1.6, NUC);
          if (k === 3) s += seg(x0 + c * cw - 0.4, 44, x0 + c * cw - 0.4, 164, "var(--ink)", 1.1, 'stroke-dasharray="3 2.5"');
          if (k === 4) s += seg(x0 + (c + 1) * cw - 0.4, 50, x0 + (c + 1) * cw - 0.4, 158, "rgba(20,20,40,.55)", 1.8);
        }
        const xw = x0 + 7 * cw + 6, xe = x0 + 8 * cw + 6;
        s += arrow([[xe, 168], [(xw + xe) / 2, 178], [xw, 168]], { w: 1.2, h: 4 }) + arrow([[xw, 186], [(xw + xe) / 2, 196], [xe, 186]], { c: V("ecto-d"), w: 1.2, h: 4 });
        note(xe + 12, 178, "Hh"); note(xe + 12, 196, "Wg", {});
        lb(x0 + 2 * cw + 6, 56, 44, 22, "*wg*", { a: "middle" });
        lb(x0 + 3.5 * cw + 6, 56, 104, 22, "*en*", { a: "middle" });
        lb(x0 + 3 * cw, 46, 170, 22, "parasegment boundary", { a: "start" });
        lb(x0 + 5 * cw, 150, 30, 190, "segmental groove", { a: "end" });
        note(312, 36, "surface view · anterior left", { a: "end" });
        return s;
      } },
    { st: "13", t: "Dorsal closure begins", cap: "The lateral epidermis spreads dorsally over the amnioserosa. Leading-edge cells assemble an actomyosin cable and send out filopodia; JNK signalling turns on *dpp* there, and the contracting amnioserosa pulls the sheets together.",
      draw() {
        let s = closureView((u) => 52 * Math.pow(Math.sin(Math.PI * u), 0.85));
        [90, 160, 230].forEach((x) => { s += arrow([[x, 26], [x, 40]], { w: 1.4 }) + arrow([[x, 174], [x, 160]], { w: 1.4 }); });
        lb(160, 100, 160, 104, "amnioserosa", { a: "middle", note: true, c: "var(--ink)" });
        lb(120, 52, 60, 34, "leading edge (JNK → *dpp*)", { a: "end" });
        lb(200, 48, 260, 32, "actomyosin cable");
        lb(250, 172, 290, 196, "lateral epidermis", { a: "end" });
        lb(22, 100, 14, 128, "canthus", { a: "start" });
        note(10, 196, "dorsal view · anterior left");
        return s;
      } },
    { st: "15", t: "Zipping and seam", cap: "The sheets meet first at the canthi and zip towards the middle. Filopodia match each segment with its partner on the other side, so the *en* stripes line up across the seam. The amnioserosa is internalised and dies.",
      draw() {
        let s = closureView((u) => (u > 0.38 && u < 0.62 ? 15 * Math.sin((Math.PI * (u - 0.38)) / 0.24) : 0), { stripes: true });
        s += seg(20, 100, 120, 100, "var(--ink)", 1, 'stroke-dasharray="3 2.5" opacity=".7"') + seg(200, 100, 300, 100, "var(--ink)", 1, 'stroke-dasharray="3 2.5" opacity=".7"');
        s += arrow([[100, 100], [122, 100]], { w: 1.6 }) + arrow([[220, 100], [198, 100]], { w: 1.6 });
        lb(160, 100, 160, 22, "last amnioserosa cells", { a: "middle" });
        lb(70, 101, 50, 196, "seam", { a: "middle" });
        lb(100, 98, 100, 36, "zipping", { a: "middle", note: true });
        lb(247, 70, 280, 22, "*en* stripes match across the seam", { a: "end" });
        return s;
      } },
    { st: "16–17", t: "Cuticle and denticle belts", cap: "Epidermal cells secrete the larval cuticle. Ventrally, the anterior part of each abdominal segment carries a belt of six denticle rows; the rest is naked cuticle (specified by *wg*). Tendon cells (*stripe*) anchor the muscles.",
      draw() {
        let s = rect(14, 8, 292, 84, V("cuticle"), 'fill-opacity=".16" rx="6"');
        for (let k = 0; k < 3; k++) {
          const x0 = 18 + k * 97;
          for (let rr = 0; rr < 6; rr++) for (let y = 16; y < 86; y += 6.5) {
            const x = x0 + 4 + rr * 6.4, dir = rr === 0 || rr === 4 ? -1 : 1;
            s += `<path d="M${f(x)},${f(y)}l${dir * 4},1.6l${-dir * 4},1.6z" fill="var(--ink)" fill-opacity=".72"/>`;
          }
          s += seg(x0 + 95, 10, x0 + 95, 90, "rgba(20,20,40,.35)", 0.8);
        }
        s += rect(0, 128, W, 6, V("cuticle"), 'fill-opacity=".95"') + rect(0, 124, W, 4, V("cuticle"), 'fill-opacity=".55"');
        for (let y = 135; y < 150; y += 3) s += seg(0, y, W, y, V("cuticle"), 0.8, 'opacity=".7"');
        s += epi([[0, 152], [320, 152]], 26, 24, (t, m) => (m[0] > 196 && m[0] < 210 ? V("ecto-d") : V("ecto")), { side: 1, op: 0.75, nucR: 1.8 });
        s += pth("M190,180 L216,180 L222,198 L184,198 Z", V("meso"), 'fill-opacity=".85"');
        lb(30, 40, 30, 106, "denticle belt (6 rows)", { a: "start" });
        lb(80, 60, 140, 106, "naked cuticle (*wg*)", { a: "start" });
        lb(260, 126, 316, 118, "envelope · epicuticle", { a: "end" });
        lb(60, 142, 14, 120, "procuticle (chitin)", { a: "start" });
        lb(60, 164, 30, 196, "epidermis", { a: "middle" });
        lb(203, 160, 250, 172, "tendon cell (*sr*)");
        lb(208, 192, 250, 196, "muscle");
        return s;
      } }
  ];

  /* ---------------- GUT ---------------- */
  ART.gut = [
    { st: "7", t: "Endoderm at both poles", cap: "The anterior midgut (amg) invaginates at the front end of the ventral furrow; the posterior midgut (pmg) forms a cup at the posterior pole that carries the pole cells inside. Both are endoderm (*srp*, *hkb*).",
      draw() {
        const cx = 160, cy = 100, rx = 140, ry = 62, tp = -0.38, ta = Math.PI - 0.5;
        const wd = (t, c) => Math.atan2(Math.sin(t - c), Math.cos(t - c)); // wrapped angular distance
        const rr = (t) => 1 - 0.32 * Math.exp(-((wd(t, tp) / 0.17) ** 2)) - 0.2 * Math.exp(-((wd(t, ta) / 0.13) ** 2));
        const P = Array.from({ length: 90 }, (_, k) => { const t = (2 * Math.PI * k) / 90; return [cx + rx * rr(t) * Math.cos(t), cy + ry * rr(t) * Math.sin(t)]; });
        let s = ell(cx, cy, rx + 4, ry + 4, "none", `stroke="${V("shell")}" stroke-width="2"`) + ell(cx, cy, rx - 4, ry - 4, V("yolk"));
        const pc = [cx + rx * 0.7 * Math.cos(tp), cy + ry * 0.7 * Math.sin(tp)], ac = [cx + rx * 0.82 * Math.cos(ta), cy + ry * 0.82 * Math.sin(ta)];
        s += epi(P, 160, 11, (t, m) => (Math.hypot(m[0] - pc[0], m[1] - pc[1]) < 36 ? V("endo") : Math.hypot(m[0] - ac[0], m[1] - ac[1]) < 22 ? V("endo") : m[1] > 140 && m[0] > 70 && m[0] < 250 ? V("meso") : V("ecto")), { closed: true, nucR: 1.2 });
        [[0, 0], [9, -4], [8, 6], [-6, -8], [16, 2]].forEach(([a, b]) => (s += cell(pc[0] + 16 + a, pc[1] - 4 + b, 4.4, V("germ"))));
        lb(ac[0] + 4, ac[1], 20, 192, "anterior midgut (amg)", { a: "start" });
        lb(pc[0] - 4, pc[1] - 4, 236, 18, "posterior midgut (pmg)", { a: "end" });
        lb(pc[0] + 22, pc[1] - 6, 316, 18, "pole cells", { a: "end" });
        lb(190, 160, 214, 192, "ventral furrow (mesoderm)", { a: "middle" });
        note(10, 18, "sagittal · anterior left, dorsal up");
        return s;
      } },
    { st: "10–12", t: "Fore-, mid- and hindgut", cap: "Foregut (stomodeum) and hindgut (proctodeum) are ectodermal tubes. The endodermal midgut rudiments grow from their tips and migrate along the visceral mesoderm towards each other; Malpighian tubules bud at the midgut–hindgut junction.",
      draw() {
        let s = ell(160, 100, 95, 45, V("yolk"), `stroke="${V("shell")}" stroke-width=".6"`);
        s += ln(arcPts(160, 100, 106, 190, 350, 30).map(([x, y]) => [x, 100 + (y - 100) * 0.53]), V("vm"), 3) + ln(arcPts(160, 100, 106, 10, 170, 30).map(([x, y]) => [x, 100 + (y - 100) * 0.53]), V("vm"), 3);
        const arm = (a0, a1) => arcPts(160, 100, 100, a0, a1, 14).map(([x, y]) => [x, 100 + (y - 100) * 0.5]);
        [[190, 248], [170, 112], [350, 292], [10, 68]].forEach(([a0, a1]) => { const P = arm(a0, a1); s += ln(P, V("endo"), 8) + arrow([P[P.length - 3], P[P.length - 1].map((v, i) => v + (P[P.length - 1][i] - P[P.length - 3][i]) * 0.9)], { w: 1.3, h: 4.5 }); });
        s += tube([[12, 108], [44, 104], [70, 100]], 14, V("fore")) + ell(70, 100, 9, 16, V("endo"), OL);
        s += tube([[308, 96], [276, 98], [252, 98]], 14, V("fore")) + ell(252, 98, 9, 16, V("endo"), OL);
        [[[256, 88], [262, 70], [270, 58]], [[248, 88], [240, 70], [234, 60]], [[256, 110], [264, 128], [272, 140]], [[248, 110], [242, 128], [236, 140]]].forEach((P) => (s += tube(P, 3.6, V("mt"), { lumen: false })));
        lb(30, 106, 30, 140, "foregut (stomodeum)", { a: "start" });
        lb(70, 92, 40, 30, "amg", { a: "middle", bold: true });
        lb(252, 90, 286, 30, "pmg", { a: "middle", bold: true });
        lb(118, 55, 90, 18, "midgut rudiments migrate", { a: "start" });
        lb(200, 152, 150, 190, "visceral mesoderm", { a: "middle" });
        lb(290, 98, 300, 176, "hindgut", { a: "end" });
        lb(268, 60, 316, 40, "Malpighian tubule buds", { a: "end" });
        lb(160, 100, 160, 104, "yolk", { a: "middle", note: true });
        return s;
      } },
    { st: "13–15", t: "Midgut closes, first constriction", cap: "The rudiments fuse and spread around the yolk into a closed sac. Visceral-mesoderm signals (Dpp under PS7, Wg in PS8) induce *labial* in the endoderm below – the future copper cells – and the middle constriction forms.",
      draw() {
        const cx = 165, h = (x) => 50 * Math.sqrt(Math.max(0, 1 - ((x - cx) / 100) ** 2)) * (1 - 0.42 * Math.exp(-(((x - cx) / 13) ** 2)));
        const top = [], bot = [];
        for (let x = 66; x <= 264; x += 6) { top.push([x, 100 - h(x)]); bot.push([x, 100 + h(x)]); }
        const outline = top.concat(bot.reverse());
        let s = pth(smooth(outline, true), V("yolk"));
        s += epi(outline, 110, 10, (t, m) => (Math.abs(m[0] - cx) < 24 ? V("cc") : V("endo")), { closed: true, nucR: 1.3 });
        s += `<path d="${smooth(outline.map(([x, y]) => [cx + (x - cx) * 1.03, 100 + (y - 100) * 1.08]), true)}" fill="none" stroke="${V("vm")}" stroke-width="3"/>`;
        s += tube([[8, 104], [40, 102], [56, 100]], 12, V("fore")) + cell(60, 100, 11, V("fore"), { nuc: false }) + circ(60, 100, 4, "rgba(255,255,255,.5)");
        s += tube([[264, 100], [290, 106], [316, 114]], 12, V("fore"));
        [[[266, 94], [276, 64], [290, 44]], [[262, 94], [256, 64], [250, 40]], [[266, 108], [280, 140], [296, 160]], [[262, 108], [256, 140], [248, 166]]].forEach((P) => (s += tube(P, 3.4, V("mt"), { lumen: false })));
        s += arrow([[cx - 6, 34], [cx - 6, 58]], { w: 1.3 }) + arrow([[cx + 8, 34], [cx + 8, 58]], { w: 1.3, c: V("ecto-d") });
        lb(cx - 6, 34, 120, 18, "Dpp (PS7)", { a: "end" }); lb(cx + 8, 34, 180, 18, "Wg (PS8)", { a: "start" });
        lb(cx, 136, 150, 192, "*lab*⁺ copper-cell precursors", { a: "middle" });
        lb(100, 62, 60, 40, "midgut epithelium", { a: "end" });
        lb(220, 144, 250, 186, "visceral mesoderm");
        lb(60, 100, 40, 140, "proventriculus forming", { a: "middle" });
        lb(300, 112, 310, 130, "hindgut", { a: "end" });
        lb(276, 60, 316, 18, "Malpighian tubules", { a: "end" });
        return s;
      } },
    { st: "16–17", t: "Regionalised gut", cap: "Three constrictions make four midgut chambers, and gastric caeca bud at the front of the midgut. The *lab*⁺ copper-cell region lies in the middle midgut, a regional plan the BGI larval midgut map refines further.",
      draw() {
        const cons = [137, 180, 222], hh = (x) => 14 * (1 - 0.55 * cons.reduce((a, c) => a + Math.exp(-(((x - c) / 5) ** 2)), 0)) * Math.min(1, Math.sqrt(Math.max(0, x - 95) / 7), Math.sqrt(Math.max(0, 262 - x) / 7));
        const top = [], bot = [];
        for (let x = 95; x <= 262; x += 2) { top.push([x, 100 - hh(x)]); bot.push([x, 100 + hh(x)]); }
        let s = "";
        [[[98, 90], [90, 70], [84, 52]], [[104, 88], [104, 66], [100, 50]], [[98, 110], [90, 130], [84, 148]], [[104, 112], [104, 134], [100, 150]]].forEach((P) => (s += tube(P, 7, V("endo"))));
        s += `<path d="M${top.map(PT).join("L")}L${bot.reverse().map(PT).join("L")}Z" fill="${V("endo")}" stroke="${V("vm")}" stroke-width="2.2"/>`;
        s += rect(184, 92, 34, 16, V("cc"), 'rx="4" fill-opacity=".9"');
        s += seg(100, 100, 258, 100, "rgba(255,255,255,.45)", 2.4);
        s += tube([[12, 100], [66, 100]], 7, V("fore")) + ell(78, 100, 11, 13, V("fore"), OL) + circ(78, 100, 4, "rgba(255,255,255,.5)");
        s += tube([[262, 100], [308, 100]], 9, V("fore"));
        [[[264, 96], [240, 60], [210, 40]], [[266, 96], [258, 56], [236, 30]], [[264, 104], [282, 140], [304, 170]], [[266, 104], [268, 146], [286, 182]]].forEach((P) => (s += tube(P, 3.4, V("mt"), { lumen: false })));
        [[116, "1"], [158, "2"], [201, "3"], [242, "4"]].forEach(([x, t]) => note(x, 126, t, { a: "middle", bold: true, c: "var(--ink)" }));
        lb(40, 100, 40, 76, "pharynx · oesophagus", { a: "middle" });
        lb(78, 112, 60, 160, "proventriculus", { a: "middle" });
        lb(86, 54, 60, 30, "gastric caeca", { a: "end" });
        lb(201, 108, 180, 170, "copper cells (*lab*)", { a: "middle" });
        note(178, 140, "midgut chambers", { a: "middle" });
        lb(300, 100, 310, 124, "hindgut", { a: "end" });
        lb(236, 30, 236, 14, "Malpighian tubules", { a: "middle" });
        return s;
      } }
  ];

  /* ---------------- EARLY MESODERM ---------------- */
  ART.mesoderm = [
    { st: "5", t: "Dorsal gradient → *twi*/*sna*", cap: "A ventral-to-dorsal gradient of nuclear Dorsal (Toll pathway) switches on *twist* and *snail* in the ventral-most ~18 cell rows. *sna* represses neuroectodermal genes there; lower Dorsal levels set up the neuroectoderm.",
      draw() {
        const cx = 92, cy = 104, R = 72;
        const ang = (m) => { let a = (Math.atan2(m[1] - cy, m[0] - cx) * 180) / Math.PI; let d = Math.abs(a - 90); return d > 180 ? 360 - d : d; };
        let s = circ(cx, cy, R + 4, "none", `stroke="${V("shell")}" stroke-width="2"`) + circ(cx, cy, R - 12, V("yolk"));
        s += epi(circlePts(cx, cy, R, 40), 64, 13, (t, m) => { const d = ang(m); return d < 46 ? V("meso") : d < 82 ? V("neuro") : d < 146 ? V("ecto") : V("extra"); }, { closed: true, nucR: 2.2, nucFill: (t, m) => `rgba(20,20,30,${(0.1 + 0.75 * Math.exp(-((ang(m) / 55) ** 2))).toFixed(2)})` });
        const gx = 196, gw = 112, gy = 42, gh = 100;
        s += seg(gx, gy + gh, gx + gw, gy + gh, "var(--ink-3)", 0.8) + seg(gx, gy, gx, gy + gh, "var(--ink-3)", 0.8);
        const C = []; for (let d = 0; d <= 180; d += 6) C.push([gx + (gw * d) / 180, gy + gh - gh * 0.95 * Math.exp(-((d / 55) ** 2))]);
        s += ln(C, "var(--ink)", 1.8);
        [[0.7, "*twi*, *sna*"], [0.3, "*sog*, *brk*"]].forEach(([L, t]) => { const y = gy + gh - gh * L; s += seg(gx, y, gx + gw, y, "var(--ink-3)", 0.7, 'stroke-dasharray="3 2"'); note(gx + gw, y - 3, t, { a: "end" }); });
        [[0, 46, V("meso")], [46, 82, V("neuro")], [82, 146, V("ecto")], [146, 180, V("extra")]].forEach(([a, b, c]) => (s += rect(gx + (gw * a) / 180, gy + gh + 4, (gw * (b - a)) / 180, 6, c)));
        note(gx, gy - 6, "nuclear Dorsal"); note(gx, gy + gh + 22, "ventral"); note(gx + gw, gy + gh + 22, "dorsal", { a: "end" });
        lb(cx, cy + R - 6, 40, 196, "mesoderm (*twi*, *sna*)", { a: "middle" });
        lb(cx - 56, cy + 40, 6, 150, "neuroectoderm", { a: "start" });
        lb(cx - 64, cy - 30, 6, 40, "dorsal ectoderm", { a: "start" });
        lb(cx, cy - R + 6, 120, 18, "amnioserosa (*zen*)", { a: "start" });
        return s;
      } },
    { st: "6", t: "Ventral furrow", cap: "Mesoderm cells constrict apically (Fog → RhoGEF2 → Rho → myosin II), lengthen and then shorten into wedges, folding the ventral plate inward as a furrow.",
      draw() {
        const P = [[0, 66], [50, 116], [100, 142], [134, 150], [148, 140], [152, 110], [160, 92], [168, 110], [172, 140], [186, 150], [220, 142], [270, 116], [320, 66]];
        let s = rect(0, 0, W, 200, V("yolk"), 'opacity=".35"');
        s += epi(P, 70, 22, (t, m) => (m[0] > 104 && m[0] < 216 ? V("meso") : m[0] < 26 || m[0] > 294 ? V("ecto") : V("neuro")), { side: -1, nucR: 1.7 });
        const S = sample(P, 70); S.forEach((p, i) => { if (p[0] > 122 && p[0] < 198 && i % 2 === 0) s += circ(p[0], p[1], 1.6, V("accent")); });
        lb(160, 98, 160, 30, "ventral furrow", { a: "middle" });
        lb(120, 128, 60, 74, "mesoderm (*twi*, *sna*)", { a: "end" });
        lb(176, 148, 250, 186, "apical myosin II (Fog → RhoGEF2)");
        lb(60, 108, 20, 150, "neuroectoderm", { a: "start" });
        note(312, 198, "outside: ventral surface", { a: "end" });
        note(312, 14, "inside", { a: "end" });
        return s;
      } },
    { st: "8", t: "EMT and spreading", cap: "The invaginated tube flattens, cells lose epithelial polarity (EMT, *snail*) and divide, then spread dorsally as a monolayer under the ectoderm, guided by FGF (Pyramus/Thisbe → Heartless).",
      draw() {
        const cx = 160, cy = 100, R = 88;
        let s = circ(cx, cy, R - 10, V("yolk"));
        s += epi(circlePts(cx, cy, R, 44), 70, 11, (t, m) => (m[1] > cy + 40 ? V("neuro") : V("ecto")), { closed: true, nucR: 1.3 });
        [[20, 160, 66], [0, 20, 64], [160, 180, 64]].forEach(([a0, a1, rr]) => { for (let a = a0; a <= a1; a += 8) { const [x, y] = polar(cx, cy, rr, a); s += ecell(x, y, 6, 3.4, V("meso"), a + 90); } });
        [[-8, 64], [188, 64]].forEach(([a, rr]) => { const [x, y] = polar(cx, cy, rr, a); s += ecell(x, y, 6, 3.4, V("meso"), a + 90, { op: 0.8 }); });
        s += arrow(arcPts(cx, cy, 56, 18, -24, 8), { w: 1.3 }) + arrow(arcPts(cx, cy, 56, 162, 204, 8), { w: 1.3 });
        for (let a = -60; a <= 240; a += 14) { if (a > 30 && a < 150) continue; const [x, y] = polar(cx, cy, R - 4, a); s += circ(x, y, 1.6, V("accent")); }
        lb(...polar(cx, cy, 66, 90), 160, 196, "mesoderm monolayer (Heartless)", { a: "middle" });
        lb(...polar(cx, cy, R - 4, -32), 270, 16, "FGF ligands Pyr / Ths in ectoderm", { a: "start" });
        lb(...polar(cx, cy, 56, -24), 230, 52, "spreading dorsally", { a: "start" });
        lb(...polar(cx, cy, R, 200), 20, 150, "ectoderm", { a: "start" });
        lb(cx, cy - 12, cx, cy - 8, "yolk", { a: "middle", note: true });
        note(10, 16, "transverse section");
        return s;
      } },
    { st: "10–11", t: "Subdivision", cap: "Two signals subdivide each hemisegment: Dpp from the dorsal ectoderm (dorsal–ventral) and the A/P stripes (Wg and Slp in the 'A' domain, En/Hh and low Twist in 'P'). Their combinations specify heart, visceral muscle, somatic muscle and fat body.",
      draw() {
        const id = "dg" + ++UID, r = rng(4);
        let s = `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--accent)" stop-opacity=".9"/><stop offset="1" stop-color="var(--accent)" stop-opacity="0"/></linearGradient></defs>`;
        s += rect(30, 46, 12, 120, `url(#${id})`, 'rx="3"');
        s += rect(70, 24, 110, 12, V("accent"), 'fill-opacity=".5" rx="3"') + rect(180, 24, 110, 12, V("ecto-d"), 'fill-opacity=".55" rx="3"');
        const Q = [[70, 46, V("accent"), "heart (*tin*, *eve*)"], [180, 46, V("vm"), "visceral muscle (*bap*, *bin*)"], [70, 106, V("meso"), "somatic muscle (*slp*, high Twi)"], [180, 106, V("fat"), "fat body (*srp*)"]];
        Q.forEach(([x, y, c, t]) => {
          s += rect(x, y, 110, 60, c, 'fill-opacity=".12" stroke="var(--line)"');
          for (let i = 0; i < 9; i++) for (let j = 0; j < 4; j++) s += cell(x + 9 + i * 11.5 + r() * 2, y + 9 + j * 14 + r() * 2, 4.6, c, { op: 0.4 });
          note(x + 55, y + 34, t, { a: "middle", c: "var(--ink)", bold: true });
        });
        note(125, 33, "Wg · Slp ('A')", { a: "middle", c: "var(--ink)" }); note(235, 33, "En · Hh ('P')", { a: "middle", c: "var(--ink)" });
        note(36, 40, "Dpp", { a: "middle" });
        note(58, 78, "D", { a: "middle", bold: true }); note(58, 140, "V", { a: "middle", bold: true });
        note(10, 194, "one hemisegment, unrolled (schematic)");
        return s;
      } }
  ];

  /* ---------------- SOMATIC MUSCLE ---------------- */
  const capsule = (x1, y1, x2, y2, w, fill, ex = "") => seg(x1, y1, x2, y2, "rgba(30,25,20,.35)", w + 1.6) + seg(x1, y1, x2, y2, fill, w, ex);
  ART.somatic = [
    { st: "11", t: "Founders and fusion-competent myoblasts", cap: "Within each promuscle cluster (*l′sc*), lateral inhibition singles out a founder cell (FC) that expresses an identity transcription factor (*Kr*, *slou*, *eve*, *lb* …). The remaining myoblasts are fusion-competent (FCMs: *lmd*, *sns*).",
      draw() {
        let s = "";
        const r = rng(2);
        [[96, 100, V("accent")], [226, 96, V("trach")]].forEach(([cx, cy, ring]) => {
          s += ell(cx, cy, 58, 44, V("meso"), 'fill-opacity=".08" stroke="var(--line)" stroke-dasharray="3 3"');
          for (let k = 0; k < 13; k++) { const a = (2 * Math.PI * k) / 13 + r() * 0.3, d = 22 + r() * 14; s += cell(cx + d * Math.cos(a), cy + d * 0.8 * Math.sin(a), 7, V("meso"), { op: 0.55 }); }
          s += cell(cx, cy, 11, V("vm")) + circ(cx, cy, 13.5, "none", `stroke="${ring}" stroke-width="2.6"`);
        });
        lb(96, 88, 20, 22, "founder cell (Duf/Rst + identity TF, e.g. *Kr*)", { a: "start" });
        lb(226, 110, 316, 190, "a founder with another identity (e.g. *slou*)", { a: "end" });
        lb(70, 128, 20, 190, "FCMs (*lmd*, *sns*)", { a: "start" });
        lb(154, 98, 160, 152, "promuscle clusters (*l′sc*)", { a: "middle" });
        return s;
      } },
    { st: "12–13", t: "Myoblast fusion", cap: "FCMs bind the founder or growing myotube through Duf/Rst ↔ Sns/Hbs adhesion, push actin-rich, podosome-like protrusions into it and fuse. The syncytium keeps the founder's identity programme.",
      draw() {
        let s = capsule(80, 100, 240, 100, 28, V("meso"));
        [100, 124, 150, 174, 200, 222].forEach((x) => (s += ell(x, 100, 4.4, 3.2, NUC)));
        [[96, 66], [140, 62], [206, 66], [110, 140], [168, 142], [232, 136], [270, 98], [52, 104]].forEach(([x, y]) => (s += cell(x, y, 8.5, V("meso"), { op: 0.55 })));
        s += cell(170, 76, 8.5, V("meso"), { op: 0.55 });
        s += `<path d="M164,82 L168,90 L171,82 L174,90 L177,82" fill="none" stroke="${V("accent")}" stroke-width="1.8"/>`;
        s += arrow([[96, 76], [104, 84]], { w: 1.2, h: 4 }) + arrow([[110, 130], [118, 118]], { w: 1.2, h: 4 }) + arrow([[232, 128], [224, 117]], { w: 1.2, h: 4 }) + arrow([[264, 98], [252, 99]], { w: 1.2, h: 4 });
        lb(176, 86, 230, 22, "actin focus (podosome-like)", { a: "start" });
        lb(164, 80, 110, 22, "Duf/Rst ↔ Sns/Hbs", { a: "end" });
        lb(150, 104, 150, 186, "myotube: fused nuclei, founder identity", { a: "middle" });
        lb(52, 104, 30, 160, "FCM", { a: "middle" });
        return s;
      } },
    { st: "14–15", t: "Finding tendons", cap: "Myotube tips extend filopodia to find tendon cells in the epidermis (*stripe*). The muscle–tendon junction is built with integrins (PS1 on the tendon side, PS2 on the muscle) and Thrombospondin.",
      draw() {
        let s = epi([[0, 22], [320, 22]], 26, 22, (t, m) => ((m[0] > 46 && m[0] < 66) || (m[0] > 254 && m[0] < 274) ? V("ecto-d") : V("ecto")), { side: 1, op: 0.75, nucR: 1.7 });
        s += pth("M60,46 C 80,56 92,62 122,64 L198,64 C 228,62 240,56 262,46 C 244,66 232,84 198,86 L122,86 C 88,84 76,66 60,46 Z", V("meso"), OL);
        [98, 126, 154, 182, 210].forEach((x) => (s += ell(x, 75, 4, 2.8, NUC)));
        s += seg(56, 46, 66, 46, "var(--ink)", 2.4) + seg(254, 46, 266, 46, "var(--ink)", 2.4);
        s += capsule(112, 132, 214, 140, 14, V("meso"));
        [130, 160, 190].forEach((x) => (s += ell(x, 135 + (x - 130) * 0.08, 3.4, 2.4, NUC)));
        [[214, 140, 236, 118], [214, 140, 244, 128], [214, 140, 246, 142], [112, 132, 92, 112], [112, 132, 84, 124], [112, 132, 86, 140]].forEach(([a, b, c, d]) => (s += seg(a, b, c, d, V("meso"), 0.9)));
        lb(56, 36, 30, 196, "tendon cell (*sr*)", { a: "start" });
        lb(264, 46, 296, 196, "integrin junction (PS1/PS2, Tsp)", { a: "end" });
        lb(160, 72, 160, 112, "attached myotube", { a: "middle", note: true, c: "var(--ink)" });
        lb(240, 126, 270, 166, "filopodia searching", { a: "start" });
        lb(150, 32, 150, 14, "epidermis", { a: "middle" });
        return s;
      } },
    { st: "16–17", t: "~30 muscles per hemisegment", cap: "Every abdominal hemisegment repeats the same pattern of about 30 uniquely identifiable body-wall muscles (simplified here; internal view). They begin to contract at stage 17.",
      draw() {
        let s = rect(70, 12, 222, 178, V("ecto"), 'fill-opacity=".07" rx="6"') + seg(70, 12, 70, 190, "var(--ink-3)", 0.8, 'stroke-dasharray="3 3"') + seg(292, 12, 292, 190, "var(--ink-3)", 0.8, 'stroke-dasharray="3 3"');
        const M = [[82, 22, 280, 34, 6], [82, 34, 280, 50, 6], [82, 50, 210, 66, 5.5], [170, 72, 280, 60, 5], [178, 84, 280, 74, 5], [262, 18, 268, 82, 4.5],
          [82, 98, 280, 100, 6.5], [190, 108, 190, 146, 5], [202, 108, 202, 146, 5], [214, 108, 214, 146, 5], [226, 108, 226, 146, 5], [104, 112, 164, 146, 5],
          [82, 156, 280, 156, 6], [82, 166, 280, 166, 6], [82, 176, 280, 176, 6], [82, 185, 250, 185, 5], [86, 148, 150, 124, 5], [92, 152, 166, 132, 5], [240, 148, 280, 120, 4.5]];
        M.forEach(([a, b, c, d, w]) => (s += capsule(a, b, c, d, w, V("meso"), 'stroke-opacity=".9"') + seg(a, b, c, d, "rgba(255,255,255,.35)", 0.8)));
        lb(82, 34, 40, 30, "DA1–3", { a: "end" });
        lb(178, 80, 40, 66, "DO1–2", { a: "end" });
        lb(82, 98, 40, 100, "LL1", { a: "end" });
        lb(190, 128, 40, 128, "LT1–4", { a: "end" });
        lb(104, 112, 40, 114, "LO1", { a: "end" });
        lb(90, 150, 40, 146, "VA", { a: "end" });
        lb(82, 166, 40, 172, "VL1–4", { a: "end" });
        note(181, 8, "dorsal", { a: "middle" }); note(181, 199, "ventral", { a: "middle" });
        note(316, 104, "P", { a: "end" }); note(56, 194, "A", { a: "middle" });
        return s;
      } }
  ];

  /* ---------------- VISCERAL MUSCLE ---------------- */
  ART.visceral = [
    { st: "10–11", t: "*bagpipe* clusters", cap: "Under the Dpp-producing dorsal ectoderm, Tinman activates *bagpipe* in eleven metameric clusters of dorsal mesoderm (the 'P' domains). *bap* and *biniou* specify trunk visceral mesoderm.",
      draw() {
        let s = epi([[0, 20], [320, 20]], 40, 20, V("ecto"), { side: 1, op: 0.6, nucR: 1.3 });
        for (let x = 6; x < 320; x += 12) s += circ(x, 30, 1.8, V("accent"));
        s += rect(0, 46, W, 110, V("meso"), 'fill-opacity=".12"');
        for (let k = 0; k < 11; k++) {
          const x = 16 + k * 27;
          s += ell(x, 72, 6, 16, V("meso"), 'fill-opacity=".35"') + ell(x + 13, 72, 7, 16, V("vm"), OL);
          for (let q = 0; q < 3; q++) s += circ(x + 13, 62 + q * 10, 1.5, NUC);
          if (k % 4 === 1) s += arrow([[x + 13, 38], [x + 13, 52]], { w: 1.1, h: 3.6 });
        }
        lb(240, 30, 260, 12, "Dpp (dorsal ectoderm)", { a: "start" });
        lb(56, 72, 60, 128, "*bap* cluster ('P' domain)", { a: "middle" });
        lb(97, 74, 120, 150, "'A' domain (*slp*: somatic / cardiac)", { a: "start" });
        note(10, 194, "lateral view · dorsal up · 11 clusters, PS3–13");
        return s;
      } },
    { st: "12", t: "Trunk band and caudal VM", cap: "The clusters merge into a continuous band of trunk visceral mesoderm (future circular muscles). Caudal visceral mesoderm cells (*HLH54F*) from the posterior tip migrate forward along it, guided by FGF; they will form the longitudinal muscles.",
      draw() {
        let s = epi([[30, 88], [280, 88]], 36, 22, V("vm"), { side: 1, nucR: 1.6 }) + epi([[30, 114], [280, 114]], 36, 10, V("endo"), { side: 1, nucR: 1.2 });
        const r = rng(8);
        for (let i = 0; i < 26; i++) { const t = i / 26, x = 300 - t * 230, dens = r(); if (dens < t * 0.8) continue; s += ecell(x, i % 2 ? 82 : 128, 6, 3, V("hemo"), 0); }
        s += arrow([[300, 66], [200, 66], [120, 66]], { w: 1.3 }) + arrow([[300, 146], [200, 146], [120, 146]], { w: 1.3 });
        lb(80, 98, 50, 30, "trunk visceral mesoderm (*bap*, *bin*)", { a: "start" });
        lb(70, 119, 40, 180, "midgut endoderm", { a: "start" });
        lb(260, 82, 300, 30, "caudal VM (*HLH54F*)", { a: "end" });
        lb(200, 146, 210, 180, "migration forward (FGF)", { a: "start" });
        note(312, 194, "anterior left", { a: "end" });
        return s;
      } },
    { st: "13", t: "Founders and fusion", cap: "Jelly belly (Jeb), secreted by somatic mesoderm, activates the Alk receptor in a row of visceral founder cells. Each founder fuses with an FCM, producing binucleate circular fibres around the midgut.",
      draw() {
        const cx = 160, cy = 102;
        let s = circ(cx, cy, 36, V("yolk"));
        s += epi(circlePts(cx, cy, 46, 30), 34, 10, V("endo"), { closed: true, nucR: 1.3 });
        s += epi(circlePts(cx, cy, 48, 30), 28, 9, (t, m, i) => (i % 2 ? V("meso") : V("vm")), { closed: true, side: -1, nucR: 1.4 });
        [20, 140, 250].forEach((a) => (s += ln(arcPts(cx, cy, 53, a, a + 24, 6), V("vm"), 9) + circ(...polar(cx, cy, 53, a + 6), 1.8, NUC) + circ(...polar(cx, cy, 53, a + 18), 1.8, NUC)));
        [[180, 94], [0, 94]].forEach(([a, rr]) => { const [x, y] = polar(cx, cy, rr, a); s += ell(x, y, 16, 26, V("meso"), 'fill-opacity=".45"'); });
        s += arrow([polar(cx, cy, 80, 180), polar(cx, cy, 62, 180)], { w: 1.3 }) + arrow([polar(cx, cy, 80, 0), polar(cx, cy, 62, 0)], { w: 1.3 });
        lb(...polar(cx, cy, 94, 180), 30, 190, "somatic mesoderm: Jeb", { a: "start" });
        lb(...polar(cx, cy, 53, 260), 120, 20, "binucleate fibre", { a: "end" });
        lb(...polar(cx, cy, 52, 300), 220, 20, "founder (Alk) + FCM", { a: "start" });
        lb(...polar(cx, cy, 44, 70), 240, 190, "midgut endoderm", { a: "start" });
        lb(cx, cy, cx, cy + 4, "yolk", { a: "middle", note: true });
        note(312, 120, "section", { a: "end" });
        return s;
      } },
    { st: "15–16", t: "Hox code shapes the gut", cap: "Hox genes in the visceral mesoderm (*Antp*, *Ubx*, *abd-A*) set where constrictions form and send signals into the endoderm: Dpp from *Ubx* cells (PS7) and Wg from *abd-A* cells (PS8) induce *labial* in the copper-cell region.",
      draw() {
        const cons = [96, 160, 224], hh = (x) => 30 * (1 - 0.5 * cons.reduce((a, c) => a + Math.exp(-(((x - c) / 8) ** 2)), 0)) * Math.min(1, Math.sqrt(Math.max(0, x - 30) / 8), Math.sqrt(Math.max(0, 290 - x) / 8));
        const top = [], bot = [];
        for (let x = 30; x <= 290; x += 2) { top.push([x, 120 - hh(x)]); bot.push([x, 120 + hh(x)]); }
        const id = "vg" + ++UID;
        let s = `<defs><clipPath id="${id}"><path d="M${top.map(PT).join("L")}L${bot.slice().reverse().map(PT).join("L")}Z"/></clipPath></defs>`;
        s += `<path d="M${top.map(PT).join("L")}L${bot.slice().reverse().map(PT).join("L")}Z" fill="${V("endo")}"/>`;
        s += `<g clip-path="url(#${id})">${rect(140, 80, 40, 80, V("cc"), 'fill-opacity=".9"')}${Array.from({ length: 33 }, (_, i) => seg(32 + i * 8, 80, 32 + i * 8, 160, V("vm"), 1.6, 'opacity=".75"')).join("")}${[104, 136].map((y) => seg(30, y, 290, y, V("hemo"), 1.4)).join("")}</g>`;
        s += `<path d="M${top.map(PT).join("L")}L${bot.slice().reverse().map(PT).join("L")}Z" fill="none" stroke="${V("vm")}" stroke-width="1.6"/>`;
        [[60, 140, V("ecto-d"), "*Antp*"], [140, 160, V("accent"), "*Ubx*"], [160, 280, V("germ-d"), "*abd-A*"]].forEach(([a, b, c, t]) => { s += rect(a, 30, b - a, 13, c, 'fill-opacity=".55" rx="3"'); note((a + b) / 2, 40, t, { a: "middle", c: "var(--ink)" }); });
        s += arrow([[150, 46], [152, 84]], { w: 1.3 }) + arrow([[170, 46], [168, 84]], { w: 1.3, c: V("germ-d") });
        note(140, 66, "Dpp", { a: "end" }); note(176, 66, "Wg");
        lb(160, 140, 196, 188, "*lab* → copper cells", { a: "start" });
        lb(96, 108, 60, 188, "constriction", { a: "middle" });
        lb(250, 104, 316, 70, "circular + longitudinal muscle", { a: "end" });
        note(10, 22, "Hox domains in visceral mesoderm");
        return s;
      } }
  ];

  /* ---------------- FAT BODY ---------------- */
  const lateralStrip = () => rect(10, 30, 300, 40, V("meso"), 'fill-opacity=".08"') + rect(10, 70, 300, 70, V("meso"), 'fill-opacity=".14"') + Array.from({ length: 11 }, (_, k) => seg(10 + k * 30, 30, 10 + k * 30, 140, "rgba(20,20,40,.25)", 0.8, 'stroke-dasharray="2 3"')).join("");
  ART.fatbody = [
    { st: "11", t: "*serpent* clusters", cap: "The GATA factor *serpent* marks segmental clusters in the lateral mesoderm ('P' domains of parasegments 4–12), the main source of the fat body.",
      draw() {
        let s = lateralStrip();
        for (let k = 1; k < 10; k++) { const x = 25 + k * 30; s += ell(x, 104, 10, 9, V("fat"), OL); for (let q = 0; q < 4; q++) s += circ(x - 4 + (q % 2) * 8, 100 + Math.floor(q / 2) * 8, 1.5, NUC); }
        for (let k = 0; k < 10; k++) s += `<text x="${25 + k * 30}" y="158" text-anchor="middle" class="art-chip-dark">PS${k + 3}</text>`;
        lb(115, 104, 120, 186, "*srp* clusters", { a: "middle" });
        lb(40, 50, 30, 20, "dorsal mesoderm", { a: "start" });
        note(312, 194, "lateral view · anterior left", { a: "end" });
        return s;
      } },
    { st: "12–13", t: "Clusters coalesce", cap: "The clusters grow and fuse into a continuous lateral band, with dorsal extensions in each segment.",
      draw() {
        let s = lateralStrip();
        const P = []; for (let x = 50; x <= 290; x += 6) P.push([x, 104 + 4 * Math.sin(x / 9)]);
        s += ln(P, V("fat"), 22);
        for (let k = 1; k < 9; k++) { const x = 40 + k * 30; s += tube([[x, 98], [x - 3, 72], [x + 2, 50]], 9, V("fat"), { lumen: false }); }
        const r = rng(6); for (let i = 0; i < 70; i++) s += circ(52 + r() * 236, 96 + r() * 16, 1.4, NUC);
        lb(160, 104, 160, 186, "continuous lateral band", { a: "middle" });
        lb(102, 50, 70, 18, "dorsal extensions", { a: "end" });
        return s;
      } },
    { st: "15–16", t: "A sheet around the gut", cap: "The fat body becomes a one-cell-thick sheet: lateral ribbons plus dorsal and ventral parts that wrap the gut and line the body wall.",
      draw() {
        const cx = 160, cy = 100;
        let s = epi(circlePts(cx, cy, 88, 40), 70, 7, V("ecto"), { closed: true, op: 0.7, nucR: 1.1 });
        for (let a = 0; a < 360; a += 12) s += ecell(...polar(cx, cy, 75, a), 4.5, 2.4, V("meso"), a + 90, { nuc: false });
        [[120, 240], [-60, 60], [235, 305]].forEach(([a0, a1]) => (s += ln(arcPts(cx, cy, 58, a0, a1, 16), V("fat"), 12)));
        s += circ(cx, cy - 4, 34, V("vm")) + circ(cx, cy - 4, 31, V("endo")) + circ(cx, cy - 4, 24, V("yolk"));
        s += ell(cx, cy + 70, 18, 8, V("neuro"), OL) + circ(cx, cy - 78, 5, V("accent"), OL);
        lb(...polar(cx, cy, 58, 180), 20, 190, "lateral fat body", { a: "start" });
        lb(...polar(cx, cy, 58, 270), 90, 16, "dorsal fat body", { a: "end" });
        lb(cx, cy - 4, cx, cy, "gut", { a: "middle", note: true });
        lb(cx, cy - 78, 200, 16, "dorsal vessel", { a: "start" });
        lb(cx, cy + 70, 230, 190, "VNC", { a: "start" });
        lb(...polar(cx, cy, 88, 30), 300, 150, "epidermis", { a: "end" });
        return s;
      } },
    { st: "17", t: "Working fat body", cap: "Large polyploid cells store lipid droplets and glycogen and secrete hemolymph proteins such as the larval serum proteins: the insect counterpart of liver and adipose tissue together.",
      draw() {
        const r = rng(13);
        let s = "";
        const C = [[70, 58], [130, 58], [190, 58], [100, 110], [160, 110], [220, 110], [70, 162], [130, 162], [190, 162]];
        C.forEach(([x, y], i) => {
          s += pth(hexPath(x, y, 33), V("fat"), `stroke="${CL}" stroke-width="1.4"`);
          for (let k = 0; k < 9; k++) { const a = r() * 6.28, d = 6 + r() * 16; s += circ(x + d * Math.cos(a), y + d * Math.sin(a), 2 + r() * 4, "rgba(255,255,255,.75)"); }
          s += circ(x - 6, y + 4, 6.5, "rgba(20,20,30,.55)");
          if (i === 4) for (let k = 0; k < 18; k++) s += circ(x + 8 + r() * 12, y - 10 + r() * 12, 0.9, "rgba(20,20,30,.6)");
        });
        s += arrow([[248, 112], [282, 104]], { w: 1.3 }) + arrow([[248, 124], [284, 132]], { w: 1.3 });
        lb(196, 54, 316, 18, "lipid droplets", { a: "end" });
        lb(154, 114, 110, 196, "polyploid nucleus", { a: "middle" });
        lb(174, 102, 210, 196, "glycogen", { a: "middle" });
        lb(284, 132, 316, 154, "serum proteins (Lsp)", { a: "end" });
        return s;
      } }
  ];

  /* ---------------- HEART ---------------- */
  ART.heart = [
    { st: "11", t: "Where Dpp meets Wg", cap: "Cardiac mesoderm forms where Tinman is kept on by Dpp from the dorsal ectoderm and crossed by Wg stripes: segmental cardiac clusters in the dorsal-most mesoderm.",
      draw() {
        let s = epi([[0, 18], [320, 18]], 40, 20, V("ecto"), { side: 1, op: 0.6, nucR: 1.3 });
        for (let x = 6; x < 320; x += 12) s += circ(x, 28, 1.8, V("accent"));
        s += rect(0, 44, W, 116, V("meso"), 'fill-opacity=".1"');
        for (let k = 0; k < 6; k++) {
          const x = 20 + k * 52;
          s += rect(x, 18, 14, 142, V("germ-d"), 'fill-opacity=".14"');
          s += ell(x + 7, 64, 14, 12, V("accent"), OL);
          for (let q = 0; q < 3; q++) s += circ(x + 1 + q * 6, 64, 1.5, NUC);
        }
        lb(200, 28, 230, 12, "Dpp (dorsal ectoderm)", { a: "start" });
        lb(131, 130, 140, 186, "Wg stripe", { a: "start" });
        lb(79, 64, 60, 110, "cardiac cluster (*tin* maintained)", { a: "start" });
        note(10, 194, "lateral view · dorsal up");
        return s;
      } },
    { st: "12", t: "Cardioblasts and pericardial cells", cap: "Each hemisegment makes six cardioblasts – four *tin*⁺ and two *svp*⁺ (future ostia) – flanked by pericardial cells such as the *eve*⁺ and *odd*⁺ groups.",
      draw() {
        let s = "";
        for (let k = 0; k < 3; k++) {
          const x0 = 22 + k * 97;
          for (let i = 0; i < 6; i++) s += cell(x0 + 8 + i * 14, 100, 6.4, i < 4 ? V("accent") : V("sg"));
          for (let i = 0; i < 5; i++) s += cell(x0 + 14 + i * 14, 74, 5.6, V("meso"), { op: 0.45 }) + cell(x0 + 14 + i * 14, 126, 5.6, V("meso"), { op: 0.45 });
          s += cell(x0 + 30, 54, 5.6, V("meso"), { ol: `stroke="var(--ink)" stroke-width="1.4"` }) + cell(x0 + 43, 54, 5.6, V("meso"), { ol: `stroke="var(--ink)" stroke-width="1.4"` });
          s += seg(x0 + 92, 40, x0 + 92, 150, "rgba(20,20,40,.25)", 0.8, 'stroke-dasharray="2 3"');
        }
        lb(36, 100, 30, 186, "*tin*⁺ cardioblasts", { a: "start" });
        lb(170, 100, 150, 186, "*svp*⁺ cardioblasts (ostia)", { a: "start" });
        lb(60, 126, 300, 160, "pericardial cells (*odd*)", { a: "end" });
        lb(52, 54, 90, 22, "*eve*⁺ pericardial cells", { a: "start" });
        note(312, 194, "dorsal view · one row, three hemisegments", { a: "end" });
        return s;
      } },
    { st: "13–14", t: "Moving dorsally", cap: "During dorsal closure, the left and right rows of cardioblasts migrate dorsally beneath the leading edge of the epidermis.",
      draw() {
        const cx = 160, cy = 220, R = 176;
        let s = circ(cx, cy, R - 30, V("yolk"));
        s += epi(arcPts(cx, cy, R, 196, 254, 16), 26, 12, (t) => (t > 0.86 ? V("ecto-d") : V("ecto")), { nucR: 1.4 }) + epi(arcPts(cx, cy, R, 286, 344, 16), 26, 12, (t) => (t < 0.14 ? V("ecto-d") : V("ecto")), { nucR: 1.4 });
        s += epi(arcPts(cx, cy, R, 255, 285, 6), 5, 6, V("extra"), { nucR: 1.6 });
        [[250, 1], [290, -1]].forEach(([a, sd]) => {
          s += cell(...polar(cx, cy, R - 22, a), 7, V("accent"));
          s += cell(...polar(cx, cy, R - 36, a + sd * 2), 5.4, V("meso"), { op: 0.45 }) + cell(...polar(cx, cy, R - 24, a + sd * 5), 5.4, V("meso"), { op: 0.45 });
          s += arrow(arcPts(cx, cy, R - 50, a - sd * 4, a + sd * 6, 4), { w: 1.3 });
        });
        lb(...polar(cx, cy, R - 22, 250), 60, 104, "cardioblast", { a: "end" });
        lb(...polar(cx, cy, R - 36, 292), 270, 112, "pericardial cells", { a: "start" });
        lb(...polar(cx, cy, R - 3, 270), 160, 18, "amnioserosa", { a: "middle" });
        lb(...polar(cx, cy, R - 6, 246), 70, 40, "leading edge", { a: "end" });
        lb(...polar(cx, cy, R - 6, 220), 20, 160, "epidermis", { a: "start" });
        note(312, 194, "transverse section, dorsal half", { a: "end" });
        return s;
      } },
    { st: "15–17", t: "Lumen and heart tube", cap: "The rows meet. Each cardioblast becomes crescent-shaped and contacts its partner dorsally and ventrally, enclosing a lumen (Slit/Robo keep the inner surface non-adhesive). The posterior heart has inflow ostia (*svp* cells); the anterior aorta is narrower.",
      draw() {
        const cx = 76, cy = 96;
        let s = "";
        [[90, 270], [-90, 90]].forEach(([a0, a1]) => { const o = arcPts(cx, cy, 27, a0, a1, 16), i = arcPts(cx, cy, 12, a1, a0, 16); s += `<path d="M${o.map(PT).join("L")}L${i.map(PT).join("L")}Z" fill="${V("accent")}" ${OL}/>`; });
        s += circ(cx - 19, cy, 3.4, NUC) + circ(cx + 19, cy, 3.4, NUC) + circ(cx, cy - 20, 2.4, "var(--ink)") + circ(cx, cy + 20, 2.4, "var(--ink)");
        for (let a = 0; a < 360; a += 45) s += cell(...polar(cx, cy, 38, a + 22), 5, V("meso"), { op: 0.45 });
        s += tube([[140, 96], [220, 96]], 9, V("accent"), { op: 0.9 }) + tube([[220, 96], [306, 96]], 18, V("accent"), { op: 0.9 });
        [240, 266, 292].forEach((x) => (s += ell(x, 89, 4, 2.2, V("sg"), OL) + ell(x, 103, 4, 2.2, V("sg"), OL)));
        lb(cx, cy, cx, cy + 3, "lumen", { a: "middle", note: true });
        lb(cx - 22, cy - 10, 20, 40, "crescent cardioblast", { a: "start" });
        lb(cx, cy - 20, 110, 30, "dorsal contact", { a: "start" });
        lb(cx, cy + 20, 110, 160, "ventral contact", { a: "start" });
        lb(cx + 34, cy + 22, 60, 186, "pericardial cells", { a: "middle" });
        lb(180, 96, 180, 132, "aorta", { a: "middle" });
        lb(266, 89, 266, 60, "ostia (*svp*)", { a: "middle" });
        lb(300, 104, 300, 132, "heart", { a: "end" });
        note(180, 18, "section (left) · side view, anterior left (right)", { a: "middle" });
        return s;
      } }
  ];

  /* ---------------- GONAD ---------------- */
  ART.gonad = [
    { st: "3–5", t: "Pole cells", cap: "Pole plasm (*oskar*, *vasa*, *nanos* and germ granules) at the posterior pole is packaged into the first cells to form, the pole cells. They stay transcriptionally quiet (*pgc*, *nanos*).",
      draw() {
        const cx = 40, cy = 100, rx = 250, ry = 78;
        let s = `<path d="${smooth(arcPts(0, 0, 1, -90, 90, 24).map(([x, y]) => [cx + (rx + 24) * x, cy + (ry + 8) * y]))}" fill="none" stroke="${V("shell")}" stroke-width="2"/>`;
        s += `<path d="M${arcPts(0, 0, 1, -90, 90, 30).map(([x, y]) => PT([cx + rx * x, cy + ry * y])).join("L")}Z" fill="${V("yolk")}"/>`;
        for (let a = -86; a <= 86; a += 5) { if (Math.abs(a) < 18) continue; const x = cx + (rx - 8) * Math.cos((a * Math.PI) / 180), y = cy + (ry - 8) * Math.sin((a * Math.PI) / 180); s += circ(x, y, 3, "rgba(60,60,80,.55)"); }
        const r = rng(4); for (let i = 0; i < 40; i++) { const a = (-20 + r() * 40) * Math.PI / 180, d = 0.86 + r() * 0.12; s += circ(cx + rx * d * Math.cos(a), cy + ry * d * Math.sin(a), 1.2, V("germ"), 'opacity=".75"'); }
        [[0, 0], [-6, -14], [-6, 14], [4, -26], [4, 26], [-14, 0]].forEach(([dx, dy]) => (s += cell(cx + rx + 10 + dx * 0.4 + (Math.abs(dy) > 20 ? -5 : 0), cy + dy, 6, V("germ"))));
        lb(cx + rx - 10, cy + 6, 220, 186, "pole plasm (*osk*, *vas*, *nos*)", { a: "end" });
        lb(cx + rx + 8, cy - 14, 300, 20, "pole cells", { a: "end" });
        lb(cx + (rx - 8) * Math.cos(-1.1), cy + (ry - 8) * Math.sin(-1.1), 110, 16, "syncytial blastoderm nuclei", { a: "end" });
        lb(cx + (rx + 24) * Math.cos(0.9), cy + (ry + 8) * Math.sin(0.9), 140, 196, "vitelline membrane", { a: "end" });
        note(10, 104, "posterior end →");
        return s;
      } },
    { st: "7–10", t: "Carried in, then through the gut", cap: "The pole cells ride inside on the posterior midgut cup (stages 7–9). At stage 10 they cross the midgut epithelium one by one – transepithelial migration.",
      draw() {
        const P = [[30, 30], [56, 50], [70, 100], [112, 150], [160, 162], [208, 150], [250, 100], [264, 50], [290, 30]];
        let s = epi(P, 40, 14, V("endo"), { side: 1, nucR: 1.5 });
        [[130, 90], [150, 104], [172, 92], [160, 124], [138, 120], [190, 118]].forEach(([x, y]) => (s += cell(x, y, 6.5, V("germ"))));
        s += cell(222, 150, 6.2, V("germ")) + cell(240, 182, 6.5, V("germ"));
        s += arrow([[200, 128], [218, 146]], { w: 1.2, h: 4 }) + arrow([[226, 160], [236, 174]], { w: 1.2, h: 4 });
        lb(140, 120, 70, 186, "pole cells in the pmg lumen", { a: "middle" });
        lb(222, 150, 300, 120, "crossing the epithelium (st 10)", { a: "end" });
        lb(60, 66, 20, 20, "posterior midgut epithelium", { a: "start" });
        lb(240, 182, 300, 196, "out", { a: "end" });
        return s;
      } },
    { st: "11–12", t: "Guided migration", cap: "Out of the gut, the germ cells split into two groups and move into the mesoderm. Wunen lipid phosphatases on the gut repel them; HMGCR in the somatic gonadal precursors attracts them (Tre1 receptor in the germ cells).",
      draw() {
        const id = "hx" + ++UID;
        let s = `<defs><pattern id="${id}" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" stroke="var(--accent)" stroke-width="1.4" stroke-opacity=".55"/></pattern></defs>`;
        s += epi([[50, 148], [270, 148]], 26, 16, V("endo"), { side: 1, nucR: 1.4 }) + rect(50, 164, 220, 6, `url(#${id})`);
        [[54, 72], [266, 72]].forEach(([x, y]) => { s += circ(x, y, 34, V("accent"), 'fill-opacity=".1"') + ell(x, y + 14, 46, 28, V("meso"), 'fill-opacity=".15"'); for (let k = 0; k < 5; k++) s += cell(x - 16 + k * 8, y + (k % 2) * 6, 5, V("meso")); });
        [[150, 136], [170, 136], [130, 122], [190, 122], [108, 106], [212, 106], [88, 92], [232, 92]].forEach(([x, y]) => (s += cell(x, y, 5.8, V("germ"))));
        s += arrow([[136, 116], [96, 84]], { w: 1.3 }) + arrow([[184, 116], [224, 84]], { w: 1.3 });
        lb(60, 168, 30, 196, "Wunen on the gut: repels", { a: "start" });
        lb(266, 66, 300, 22, "SGPs: HMGCR attracts", { a: "end" });
        lb(108, 106, 60, 130, "germ cells (Tre1)", { a: "end" });
        lb(160, 154, 220, 190, "midgut", { a: "start" });
        return s;
      } },
    { st: "13–15", t: "Gonad coalescence", cap: "Somatic gonadal precursors (*eya*, *clift*) from parasegments 10–13 contact the germ cells and wrap them. The gonad compacts into a round organ in A5 holding ~10–12 germ cells; male gonads also recruit male-specific SGPs at the posterior.",
      draw() {
        let s = ell(150, 100, 74, 58, V("meso"), 'fill-opacity=".14" stroke="var(--line)"');
        const G = [[120, 80], [146, 74], [172, 82], [110, 106], [136, 102], [162, 106], [188, 104], [124, 128], [150, 128], [176, 126], [150, 52]];
        G.forEach(([x, y]) => (s += cell(x, y, 11, V("germ"), { nr: 0.35 })));
        [[133, 90], [159, 90], [123, 116], [149, 116], [175, 116], [100, 90], [200, 90], [110, 142], [190, 140], [150, 150], [94, 120], [205, 120], [128, 60], [172, 62]].forEach(([x, y], i) => (s += ecell(x, y, 7, 2.6, V("meso"), i * 37)));
        [[236, 92], [244, 106], [234, 118]].forEach(([x, y]) => (s += cell(x, y, 6, V("hemo"))));
        lb(146, 74, 90, 22, "germ cells (~10–12)", { a: "end" });
        lb(200, 90, 230, 30, "SGPs wrap them (*eya*, *clift*)", { a: "start" });
        lb(244, 106, 300, 160, "male-specific SGPs", { a: "end" });
        note(10, 194, "gonad in A5 · anterior left");
        return s;
      } }
  ];

  /* ---------- public API ---------- */
  window.ORGAN_ART = ART;
  window.renderOrganArt = function (organ, i) {
    const p = (ART[organ] || [])[i];
    if (!p) return "";
    LBL = [];
    const body = p.draw();
    return `<svg viewBox="0 0 ${W} ${H}" class="organ-art" role="img" aria-label="${p.t.replace(/\*/g, "")}, stage ${p.st}">${body}${drawLabels()}</svg>`;
  };
  window.organArtMd = (t) => t.replace(/\*([^*]+)\*/g, "<i>$1</i>");
})();
