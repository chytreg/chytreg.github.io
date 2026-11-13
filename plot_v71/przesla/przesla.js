
let uid = 0;
/* spans: [{layers, slope:[h1,h2]|null}] ; opts.dims for single-span dimensioning */
/* deski pochylone: geometria przęsła z top h1 -> h2 na długości poziomej w */
function inclineGeom(h1, h2, w) {
  const rise = h2 - h1, hv = BH * Math.hypot(w, rise) / w;
  const N = Math.floor(h1 / hv + 1e-9), bL = h1 - N * hv;
  return { rise, hv, N, bL, w, slopeLen: Math.hypot(w, rise), offset: BH * Math.abs(rise) / w };
}
/* najdłuższa pozioma długość (pełne cm), z której pochyloną deskę z pionowymi końcami da się wyciąć z deski 200 cm */
function maxInclineWidth(rise) {
  let w = BL; while (w > 100 && Math.hypot(w, rise) + BH * Math.abs(rise) / w > BL) w -= 1; return w;
}

function figure(spans, opts = {}) {
  const id = "f" + (uid++);
  let pl = 0; const P = [0];
  spans.forEach(sp => { sp._w = sp.width || BL; sp._x0 = pl + PW - INS; pl += sp._w + PW - 2 * INS; P.push(pl); });
  const tops = spans.map(s => {
    if (s.incline) return s.incline.slice();
    const t = stats(s.layers).total; return s.slope ? [Math.min(s.slope[0], t), Math.min(s.slope[1], t)] : [t, t];
  });
  const posts = [];
  for (let j = 0; j <= spans.length; j++) {
    const l = j > 0 ? tops[j - 1][1] : 0, r = j < spans.length ? tops[j][0] : 0;
    posts.push(Math.max(l, r) + POST_EXTRA);
  }
  const maxP = Math.max(...posts);
  const fs = opts.fs || 7.5;
  /* dolny margines: przy wymiarach osi mieści linię wymiarową (3,4 fs) i podpis pod nią (do ok. 5,2 fs) */
  const ML = opts.dims ? 34 : 14, MR = opts.dims ? 34 : 14, MT = 10, MB = opts.dims ? 30 : (opts.axes ? Math.ceil(fs * 5.6) + 4 : 22);
  const W = ML + P[P.length - 1] + PW + MR, H = MT + maxP + MB;
  const Y = h => MT + maxP - h, X = x => ML + x;
  const grain = (r, x0, w, a, h1, h2) => {
    let g = "";
    for (let k = 0; k < 3; k++) {
      const f = 0.2 + 0.6 * r(), xs = x0 + w * 0.3 * r(), xe = x0 + w * (0.6 + 0.4 * r());
      const yAt = x => a + f * BH + (h2 - h1) * (x - x0) / w;
      const ys = Y(yAt(xs)), ye = Y(yAt(xe));
      g += `<path d="M${X(xs)} ${ys} C ${X(xs + (xe - xs) / 3)} ${ys + (ye - ys) / 3 + (r() - .5) * 2.4}, ${X(xs + 2 * (xe - xs) / 3)} ${ys + 2 * (ye - ys) / 3 + (r() - .5) * 2.4}, ${X(xe)} ${ye}" fill="none" stroke="${WOOD.grain}" stroke-width="0.35"/>`;
    }
    return g;
  };
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${opts.label || "Rysunek przęsła"}">`;
  s += `<defs>`;
  spans.forEach((sp, i) => {
    const x0 = sp._x0, w = sp._w;
    let h = tops[i];
    if (sp.incline) { const g = inclineGeom(h[0], h[1], w); sp._inc = g; h = [g.bL, g.bL + g.rise]; }
    s += `<clipPath id="${id}c${i}"><polygon points="${X(x0)},${Y(-1)} ${X(x0 + w)},${Y(-1)} ${X(x0 + w)},${Y(h[1])} ${X(x0)},${Y(h[0])}"/></clipPath>`;
  });
  s += `</defs>`;
  spans.forEach((sp, i) => {
    const x0 = sp._x0, w = sp._w, r = rng(i * 7 + (sp.layers ? sp.layers.length : 5) * 13 + (opts.seed || 1));
    const bands = sp.incline ? Array.from({ length: Math.ceil((sp._inc.bL + sp._inc.rise) / BH) }, (_, k) => [k * BH, k * BH + BH]) : boards(sp.layers);
    s += `<g clip-path="url(#${id}c${i})">`;
    for (const [a, b] of bands) {
      s += `<rect x="${X(x0)}" y="${Y(b)}" width="${w}" height="${BH}" fill="${WOOD.board}" stroke="${WOOD.edge}" stroke-width="0.5"/>`;
      s += grain(r, x0, w, a, 0, 0);
    }
    s += `</g>`;
    if (sp.incline) {
      const g = sp._inc;
      for (let k = 0; k < g.N; k++) {
        const l = g.bL + k * g.hv;
        s += `<polygon points="${X(x0)},${Y(l)} ${X(x0 + w)},${Y(l + g.rise)} ${X(x0 + w)},${Y(l + g.rise + g.hv)} ${X(x0)},${Y(l + g.hv)}" fill="${WOOD.board}" stroke="${WOOD.edge}" stroke-width="0.5"/>`;
        s += grain(r, x0, w, l, 0, g.rise);
      }
      s += `<line x1="${X(x0)}" y1="${Y(g.bL)}" x2="${X(x0 + w)}" y2="${Y(g.bL + g.rise)}" stroke="var(--cut)" stroke-width="0.9" stroke-dasharray="4 3"/>`;
    }
    if (sp.slope) s += `<line x1="${X(x0)}" y1="${Y(tops[i][0])}" x2="${X(x0 + w)}" y2="${Y(tops[i][1])}" stroke="var(--cut)" stroke-width="0.9" stroke-dasharray="4 3"/>`;
    if (sp.width && sp.width !== BL && !opts.dims) s += `<text x="${X(x0 + w / 2)}" y="${Y(0) + fs * 1.6}" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="${fs}" fill="var(--cut)">deski ${w} cm</text>`;
  });
  posts.forEach((ph, j) => {
    s += `<rect x="${X(P[j])}" y="${Y(ph)}" width="${PW}" height="${ph}" fill="${WOOD.post}" stroke="${WOOD.postEdge}" stroke-width="0.6"/>`;
    if (!opts.dims) s += `<text x="${X(P[j] + PW / 2)}" y="${Y(0) + fs * 1.6}" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="${fs}" fill="var(--muted)">≥${ph}</text>`;
  });
  s += `<line x1="${X(-8)}" y1="${Y(0)}" x2="${X(P[P.length - 1] + PW + 8)}" y2="${Y(0)}" stroke="${WOOD.ground}" stroke-width="1.4"/>`;
  if (opts.axes) {
    for (let j = 0; j < spans.length; j++) {
      const a = P[j] + PW / 2, b = P[j + 1] + PW / 2, dy = Y(0) + fs * 3.4;
      s += `<g stroke="var(--dim)" fill="var(--dim)" font-family="IBM Plex Mono, monospace" font-size="${fs}"><line x1="${X(a)}" y1="${dy}" x2="${X(b)}" y2="${dy}" stroke-width="0.5"/><line x1="${X(a)}" y1="${dy - 3}" x2="${X(a)}" y2="${dy + 3}" stroke-width="0.5"/><line x1="${X(b)}" y1="${dy - 3}" x2="${X(b)}" y2="${dy + 3}" stroke-width="0.5"/><text x="${X((a + b) / 2)}" y="${dy + fs * 1.4}" text-anchor="middle" stroke="none" fill="var(--fg)">osie ${b - a} cm</text></g>`;
    }
  }

  if (opts.dims) {
    const sp = spans[0], t = tops[0][1];
    const rx = X(P[1] + PW) + 5;
    let y = 0;
    s += `<g font-family="IBM Plex Mono, monospace" font-size="${fs}" fill="var(--dim)" stroke="var(--dim)">`;
    for (const l of sp.layers) {
      const h = l === "D" ? BH : l;
      s += `<line x1="${rx}" y1="${Y(y)}" x2="${rx + 4}" y2="${Y(y)}" stroke-width="0.5"/>`;
      s += `<text x="${rx + 6}" y="${Y(y + h / 2) + fs * 0.35}" stroke="none">${h}</text>`;
      y += h;
    }
    s += `<line x1="${rx}" y1="${Y(y)}" x2="${rx + 4}" y2="${Y(y)}" stroke-width="0.5"/>`;
    s += `<line x1="${rx + 2}" y1="${Y(0)}" x2="${rx + 2}" y2="${Y(y)}" stroke-width="0.5"/>`;
    const lx = X(0) - 9;
    s += `<line x1="${lx}" y1="${Y(0)}" x2="${lx}" y2="${Y(t)}" stroke-width="0.7"/>`;
    s += `<line x1="${lx - 3}" y1="${Y(0)}" x2="${lx + 3}" y2="${Y(0)}" stroke-width="0.7"/><line x1="${lx - 3}" y1="${Y(t)}" x2="${lx + 3}" y2="${Y(t)}" stroke-width="0.7"/>`;
    s += `<text transform="translate(${lx - 4} ${Y(t / 2)}) rotate(-90)" text-anchor="middle" font-weight="500" stroke="none" fill="var(--fg)" font-size="${fs * 1.15}">${t} cm</text>`;
    const dy = Y(0) + 12, x0 = X(sp._x0);
    s += `<line x1="${x0}" y1="${dy}" x2="${x0 + BL}" y2="${dy}" stroke-width="0.5"/><line x1="${x0}" y1="${dy - 3}" x2="${x0}" y2="${dy + 3}" stroke-width="0.5"/><line x1="${x0 + BL}" y1="${dy - 3}" x2="${x0 + BL}" y2="${dy + 3}" stroke-width="0.5"/>`;
    s += `<text x="${x0 + BL / 2}" y="${dy + fs * 1.5}" text-anchor="middle" stroke="none">deska 200 · słupek ≥ ${posts[0]}</text>`;
    s += `</g>`;
  }
  return s + `</svg>`;
}

function card(v, removable) {
  const st = stats(v.layers);
  const top = v.slope ? `${Math.min(v.slope[0], st.total)} → ${Math.min(v.slope[1], st.total)} cm` : `${st.total} cm`;
  const gapTxt = st.gaps.length ? `${st.gaps.length} × ${[...new Set(st.gaps)].join("/")} cm` : "brak";
  const el = document.createElement("article");
  el.className = "card";
  el.innerHTML = `<header><h3>${v.k}</h3><span class="h">${top}</span></header>
    <p class="sub">${v.name}</p>
    <div class="fig">${figure([{ layers: v.layers, slope: v.slope || null }], { dims: !v.slope, label: "Wariant " + v.k })}</div>
    <div class="pattern">${v.layers.map(l => l === "D" ? "25" : l).join(" | ")}</div>
    <div class="stats">
      <div>desek<b>${st.n}</b></div>
      <div>prześwity<b>${gapTxt}</b></div>
      <div>waga<b>${st.n * WEIGHT} kg</b></div>
    </div>`;
  if (removable) {
    const b = document.createElement("button");
    b.className = "ghost rm"; b.type = "button"; b.textContent = "Usuń";
    b.addEventListener("click", () => { custom = custom.filter(c => c !== v); save(); renderGrid(); });
    el.querySelector("header").appendChild(b);
  }
  return el;
}

let custom = [];
try { custom = JSON.parse(localStorage.getItem("plot-custom") || "[]"); } catch (e) { custom = []; }
function save() { try { localStorage.setItem("plot-custom", JSON.stringify(custom)); } catch (e) {} }

function renderGrid() {
  const g = document.getElementById("variants");
  g.innerHTML = "";
  [...VARIANTS].sort((a, b) => a.k.localeCompare(b.k)).forEach(v => g.appendChild(card(v, false)));
  custom.forEach(v => g.appendChild(card(v, true)));
}

function cutReport(layers, h1, h2, BL = 200) {
  const out = [];
  boards(layers).forEach(([a, b], i) => {
    const lo = Math.min(h1, h2), hi = Math.max(h1, h2);
    if (b <= lo) return;
    if (a >= hi) { out.push({ i: i + 1, txt: "usunięta w całości" }); return; }
    const hAt = x => Math.max(0, Math.min(BH, h1 + (h2 - h1) * x / BL - a));
    const hl = hAt(0), hr = hAt(BL);
    let txt = `wysokość ${fmt(hl, 1)} cm przy lewym końcu, ${fmt(hr, 1)} cm przy prawym`;
    if (hl === 0 || hr === 0) {
      const xz = (a - h1) / (h2 - h1) * BL;
      const len = hl === 0 ? BL - xz : xz;
      txt = `trójkąt: długość ${fmt(len, 1)} cm, wysokość ${fmt(Math.max(hl, hr), 1)} cm`;
    } else if (hl < BH || hr < BH) {
      const xf = (b - h1) / (h2 - h1) * BL;
      if (xf > 0 && xf < BL) txt = `ścięty róg: ${fmt(h2 > h1 ? xf : BL - xf, 1)} × ${fmt(BH - Math.min(hl, hr), 1)} cm`;
    }
    out.push({ i: i + 1, range: `${a}–${b} cm`, txt });
  });
  return out;
}



function renderRun1() {
  const A = VARIANTS[0], E = VARIANTS[4], F = VARIANTS[5], w = Math.round(25 / ((175 - 145) / BL));
  const up = { layers: F.layers, slope: [150, 175], width: w }, down = { layers: F.layers, slope: [175, 150], width: w };
  const seq = [{ layers: A.layers }, { layers: A.layers }, up, { layers: F.layers }, down, { layers: A.layers }, { layers: A.layers }, { layers: E.layers }, { layers: E.layers }];
  document.getElementById("run1").innerHTML = figure(seq, { fs: 10, label: "Odcinek ogrodzenia B B przejście C przejście B B A A", seed: 11, axes: true });
  const axes = seq.map(sp => (sp.width || BL) + PW - 2 * INS);
  const len = axes.reduce((a, b) => a + b, 0) + PW;
  const nA = 4 * stats(A.layers).n, nF = 1 * stats(F.layers).n, nE = 2 * stats(E.layers).n, nT = 2 * 7;
  const n = nA + nF + nE + nT;
  const wt = (nA + nF + nE) * WEIGHT + Math.round(nT * WEIGHT * w / BL);
  const c = document.getElementById("run1sum");
  c.innerHTML = "";
  c.appendChild(cutCard("Długość odcinka", "", `${fmt(len / 100, 2)} m od zewnętrznej krawędzi pierwszego do ostatniego słupka · ${seq.length} przęseł, ${seq.length + 1} słupków`));
  c.appendChild(cutCard("Deski", "", `${n} szt. · ok. ${fmt(wt)} kg<br>B: ${nA} · C: ${nF} · A: ${nE} · przejścia: ${nT} (12 prostych skróconych do ${w} cm, 2 na trójkąty)`));
  c.appendChild(cutCard("Słupki nad gruntem", "", `≥150: 6 szt. (przęsła B i A) · ≥155: 2 szt. (przy B na styku z przejściami) · ≥180: 2 szt. (przęsło C). Skrajne słupki zakończeniowe (typ C), pozostałe przelotowe (typ H).`));
  c.appendChild(cutCard("Rozstaw osi", "", `204 cm w przęsłach B, C, A · ${w + PW - 2 * INS} cm w obu przejściach`));
  document.getElementById("run1notes").innerHTML = `
    <li>Na obu końcach przejść jest uskok 5 cm: przęsła B mają 145 cm, a przejście zaczyna się od 150 cm.</li>
    <li>Przejście w górę i w dół potrzebują trójkątów o przeciwnym skosie. Z jednej deski ciętej po przekątnej dostaniesz oba tylko przy fakturze z obu stron, dlatego w zestawieniu są 2 deski na trójkąty.</li>
    <li>Prześwity zmieniają się przy słupkach: B ma przerwy 10 cm, C i przejścia są pełne, A ma przerwy 5 cm. Między B a A wysokość jest ta sama (145 cm), zmienia się tylko rytm prześwitów.</li>`;
}

function renderTransition3() {
  const A = VARIANTS[0], F = VARIANTS[5], hA = 145, h1 = 150, h2 = 175, slope = (175 - 145) / BL;
  const w = Math.round((h2 - h1) / slope);
  const axis = w + PW - 2 * INS;
  document.getElementById("transition3").innerHTML =
    figure([{ layers: A.layers }, { layers: F.layers, slope: [h1, h2], width: w }, { layers: F.layers }], { fs: 9, label: "Przejście B do C krótszym przęsłem", seed: 7, axes: true }) +
    `<p class="note" style="margin-top:8px">Skos ${h1} → ${h2} cm na długości ${w} cm: spadek ${fmt((h2 - h1) / w * 100, 1)}% (${fmt(Math.atan((h2 - h1) / w) * 180 / Math.PI, 1)}°).</p>`;
  const c = document.getElementById("cuts3");
  c.innerHTML = "";
  c.appendChild(cutCard("Deski 1–6", "0–150 cm", `proste, skrócone do ${w} cm, cięcie poprzeczne pod kątem prostym`));
  cutReport(F.layers, h1, h2, w).forEach(r => c.appendChild(cutCard(`Deska ${r.i}`, r.range, `${r.txt}: skrócona do ${w} cm i cięta po przekątnej, od narożnika do narożnika`)));
  c.appendChild(cutCard("Przęsło przejściowe", "", `7 desek, wszystkie skrócone o ${BL - w} cm · ok. ${Math.round(7 * WEIGHT * w / BL)} kg · rozstaw osiowy słupków ${axis} cm zamiast ${BL + PW - 2 * INS} cm`));
  document.getElementById("notes3").innerHTML = `
    <li>Przy lewym słupku przejścia góra jest na ${h1} cm, czyli o ${h1 - hA} cm wyżej niż przęsło B (${hA} cm). Ten uskok ukrywa się przy słupku, który musi mieć co najmniej ${h1 + POST_EXTRA} cm nad gruntem.</li>
    <li>Jedno cięcie po przekątnej daje dwa trójkąty ${w} × 25 cm, ale po obróceniu oba mają skos w tę samą stronę. Na lustrzane przejście (skos w dół) drugi trójkąt nadaje się tylko wtedy, gdy deska ma fakturę drewna z obu stron. Inaczej potrzebna jest osobna deska cięta po drugiej przekątnej.</li>
    <li>Szpic trójkąta wchodzi w lewy rowek i ma tam niecały centymetr wysokości, więc łatwo się wykruszy. Można go stępić: przekątną prowadzić od wysokości 2–3 cm zamiast od samego narożnika.</li>
    <li>Trójkąt leży na 6. desce na całej długości i siedzi w obu rowkach. Klej na styku i tak zalecany.</li>`;
}


function parse() {
  const raw = document.getElementById("cfgLayers").value.trim();
  if (!raw) return { err: "Wpisz co najmniej jedną deskę, np. D D D." };
  const toks = raw.split(/[\s,|;+]+/).filter(Boolean);
  const layers = [];
  for (const t of toks) {
    if (/^[dp]$/i.test(t)) layers.push("D");
    else if (/^\d+([.,]\d+)?$/.test(t)) { const v = parseFloat(t.replace(",", ".")); if (v <= 0) return { err: `Prześwit musi być większy od zera: „${t}”.` }; layers.push(v); }
    else return { err: `Nie rozumiem „${t}”. Użyj D dla deski i liczby dla prześwitu.` };
  }
  if (!layers.includes("D")) return { err: "Układ musi mieć co najmniej jedną deskę (D)." };
  const f = document.getElementById("cfgFrom").value, to = document.getElementById("cfgTo").value;
  let slope = null;
  if (f !== "" || to !== "") {
    if (f === "" || to === "") return { err: "Podaj obie wysokości skosu albo zostaw oba pola puste." };
    slope = [parseFloat(f), parseFloat(to)];
  }
  const name = document.getElementById("cfgName").value.trim() || "Własny";
  const st = stats(layers);
  return { v: { k: name, name: slope ? `skos ${slope[0]} → ${slope[1]} cm` : "układ własny", layers, slope } };
}

function preview() {
  const p = parse(), err = document.getElementById("cfgErr"), box = document.getElementById("cfgPreview");
  if (p.err) { err.textContent = p.err; err.hidden = false; return null; }
  err.hidden = true;
  box.innerHTML = "";
  box.appendChild(card(p.v, false));
  return p.v;
}

document.getElementById("cfgForm").addEventListener("submit", e => {
  e.preventDefault();
  const v = preview();
  if (!v) return;
  custom.push(v); save(); renderGrid();
});
["cfgLayers", "cfgFrom", "cfgTo", "cfgName"].forEach(id => document.getElementById(id).addEventListener("input", preview));
document.getElementById("cfgReset").addEventListener("click", () => { custom = []; save(); renderGrid(); });

renderGrid();
renderTransition3();
renderRun1();
preview();
