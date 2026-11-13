(function () {
  const box = document.getElementById("view3d"), errEl = document.getElementById("v3err");
  if (!window.THREE || !THREE.OrbitControls) { errEl.textContent = "Nie udało się wczytać biblioteki 3D. Odśwież stronę."; errEl.hidden = false; return; }
  const T = THREE, THICK = 3.5, AXIS = BL + PW - 2 * INS;
  /* działka 6/1: kąty i proporcje z podkładu geoportalu, skala z prawego boku = 37,00 m (układ modelu w cm):
     prawy przedni narożnik P1 w (2200, 0), prawy bok wzdłuż -z, front prosty P1–P4.
     Budynek i studnia wodomierzowa: położenie z mapy zasadniczej 1:500 względem prawego przedniego narożnika i prawej granicy */
  const MAP = { P1: [2200.0, 0.0], P4: [-36.9, -154.9], P3: [-43.3, -3704.5], P2: [2200.0, -3700.0] };
  const vec = (a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz); return { dir: [dx / L, dz / L], L }; };
  /* płot frontowy od prawego narożnika do słupka betonowego przy bramie: 5,20 m */
  const FRONT_A = 520, F1 = vec(MAP.P1, MAP.P4);
  const G = [MAP.P1[0] + F1.dir[0] * FRONT_A, MAP.P1[1] + F1.dir[1] * FRONT_A], F2 = vec(G, MAP.P4), BK = vec(MAP.P3, MAP.P2), FA = vec(MAP.P1, MAP.P4);
  const RIGHT_LEN = vec(MAP.P1, MAP.P2).L, FRONT_LEN = FRONT_A + F2.L, BACK_LEN = BK.L;
  const PLOT_W = 2200, PLOT_D = RIGHT_LEN;
  const A = VARIANTS[0], E = VARIANTS[4], F = VARIANTS[5], tw = Math.round(25 / ((175 - 145) / BL));

  /* wypełnienie odcinka wzorem A: pełne przęsła 204 cm, reszta jako jedno krótsze przęsło (≥100 cm) albo dwa równe */
  function fillWith(L, layers) {
    const n = Math.floor(L / AXIS), rem = L - n * AXIS, out = [];
    const span = ax => ax === AXIS ? { layers, fill: true } : { layers, fill: true, width: ax - (PW - 2 * INS) };
    if (rem < 1e-6) { for (let i = 0; i < n; i++) out.push(span(AXIS)); return out; }
    if (rem >= 100) { for (let i = 0; i < n; i++) out.push(span(AXIS)); out.push(span(rem)); return out; }
    for (let i = 0; i < n - 1; i++) out.push(span(AXIS));
    out.push(span((rem + AXIS) / 2), span((rem + AXIS) / 2));
    return out;
  }
  const fillA = L => fillWith(L, A.layers);
  /* brama i furtka: światło przejścia + szerokość słupka = rozstaw osi */
  const mkGate = (name, clear) => ({ gate: true, name, clear, h: 145, axis: clear + PW });
  /* otwory: płot kończy się słupkiem betonowym, brama i każda furtka stoją na własnych słupkach stalowych 10 × 10 cm,
     1 cm od słupka betonowego (i 1 cm między słupkami bramy i furtki). Rozstaw osi słupków betonowych = elementy + 12 */
  const STEEL = 10, SGAP = 1;
  const mkOpening = (name, leaves, extra) => {
    const items = [];
    leaves.forEach(lf => items.push({ gap: SGAP }, { steel: STEEL }, { leaf: lf }, { steel: STEEL }));
    items.push({ gap: SGAP });
    if (extra) { items.push(...extra, { gap: SGAP }); }
    const len = items.reduce((a, it) => a + (it.gap || it.steel || (it.leaf ? it.leaf.clear : 0) || (it.box ? it.box : 0)), 0);
    return { gate: true, name, items, leaves, h: 145, clear: leaves.reduce((a, l) => a + l.clear, 0), axis: len + PW };
  };
  /* front: brama łamana 5 m + furtka 1 m (zawiasy po lewej patrząc z ulicy); prawy bok: furtka za koszami i furtka za skosem */
  /* Paczkoport L-2W tuż za furtką (po lewej patrząc z ulicy), przy jej słupku stalowym, bez słupka betonowego pomiędzy:
     szer. 50, wys. 150, gł. 45 cm; lico od ulicy równo z licem desek ogrodzenia, skrzynka cofnięta w działkę; wrzut od ulicy, odbiór od działki */
  const PACZ = { box: { w: 50, d: 45, h: 150 } };
  const GATE = mkOpening("brama + furtka + paczkoport", [{ kind: "swing", clear: 500, h: 145 }, { kind: "wicket", clear: 100, h: 145, hingeEnd: true }], [{ box: PACZ.box.w, pacz: true }]);
  /* położenie środka paczkoportu wzdłuż odcinka od osi słupka betonowego przy bramie */
  PACZ.at = GATE.axis - PW / 2 - SGAP - PACZ.box.w / 2;
  const WICKET_K = mkOpening("furtka", [{ kind: "wicket", clear: 100, h: 145 }]), WICKET2 = mkOpening("furtka", [{ kind: "wicket", clear: 100, h: 145 }]);
  /* furtka frontowa: zawiasy po lewej patrząc z ulicy (od strony lewego końca frontu), otwiera się w lewo do działki */
  const nF_right = 5;
  /* zatoka na kosze odsunięta o jedno przęsło A od przedniego narożnika:
     wzdłuż płotu rząd 3 × 120 L (65 cm), przejście z drzwiami od drogi, rząd 2 × 240 L (83 cm); w głąb działki 180 cm */
  /* przejście 112 cm w osiach słupków furtki = 100 cm w świetle; od drogi zatoka otwarta, furtka na końcu przejścia od strony działki */
  /* zatoka 220 cm w osiach słupków: między ścianami z desek rząd 3 × 120 L (59), przejście 80 w świetle, rząd 2 × 240 L (77,5) */
  /* (poprzednio K3) zatoka w narożniku: 3,20 m wzdłuż prawego płotu, 2,80 m w głąb.
     Od drogi: przęsło 138, wejście 100 w świetle (112 w osiach), przęsło 70. Od działki: ukośne przęsło od pierwszego słupka frontu,
     furtka 100 w świetle, przęsło 70, ściana boczna 2 × 140 */
  /* zatoka K4: prostokąt 2,64 m wzdłuż prawego płotu × 2,58 m w głąb, bez skosów.
     Od drogi: przęsło 152, wejście 100 w świetle (słupki 152 i 264). Od działki: ściana 26–152, furtka 100 w świetle (152–264).
     Ściana tylna u = 264 ze słupkiem pośrednim. Słupek furtki przy studni: lico 9,6 cm od krawędzi włazu */
  /* układ K5: kubły w jednym rzędzie wzdłuż prawego płotu od przedniego narożnika, uchwytami do drogi.
     W linii płotu otwarcie 303 cm w osiach (291 w świetle) zamknięte linką, od działki bez ściany i bez furtki */
  /* od działki ścianka 110 cm (wzór B bez górnej deski) w linii 92 cm od płotu: od słupka przy płocie frontowym (u 15) do słupka 303 i z powrotem do płotu */
  const K5 = { OPEN: 303, U0: 12, GAP: 5, V0: 8, D: 92, UF: 15 };
  const LOW = ["D", "D", "D", 10, "D"];
  const BAY_BOARDS = 10, BAY_POSTS = 3;
  const ENTRY = { gate: true, name: "kosze, linka", clear: K5.OPEN - PW, h: 145, axis: K5.OPEN, open: true };
  const spanAx = ax => ({ layers: A.layers, width: ax - (PW - 2 * INS) });
  /* od narożnika do skosu maks. 5 przęseł (A, zatoka, reszta A), skos zaczyna się 5 × 204 = 10,20 m od narożnika */
  /* skos przy linii frontu bryły (garaż, 9,40 m od narożnika); przęsło skosu ma 171 cm w osiach (deski 167).
     Skos od 7,76 m, pełne C od 9,47 m (7 cm za frontem garażu), żeby od furtki za skosem do tylnego narożnika
     wyszło równo 7 × 204 bez dwóch krótkich przęseł: 37,00 − 7,76 − 1,71 − 10,20 − 1,71 − 1,34 = 14,28 m */
  const SKOS_START = 776;
  /* między furtką za koszami a skosem równy podział: najmniej przęseł, wszystkie tej samej długości (deski cięte w obu) */
  const fillEven = (L, layers) => { const n = Math.ceil(L / AXIS - 1e-9), ax = L / n; return [...Array(n)].map(() => ax === AXIS ? { layers, fill: true } : { layers, fill: true, width: ax - (PW - 2 * INS) }); };
  const rightHead = [ENTRY, WICKET_K].concat(fillEven(SKOS_START - K5.OPEN - WICKET_K.axis, A.layers))
    .concat([{ layers: F.layers, slope: [150, 175], width: tw }], [...Array(nF_right)].map(() => ({ layers: F.layers, tag: "F" })), [{ layers: F.layers, slope: [175, 150], width: tw }, WICKET2]);
  const run = [{ layers: A.layers }, { layers: A.layers }, { layers: F.layers, slope: [150, 175], width: tw, tag: "F-up" }, { layers: F.layers, tag: "F" },
    { layers: F.layers, slope: [175, 150], width: tw }, { layers: A.layers, tag: "A-low" }, { layers: A.layers }];
  const axisOf = sp => sp.gate ? sp.axis : (sp.width || BL) + PW - 2 * INS;
  const runLen = run.reduce((a, sp) => a + axisOf(sp), 0);
  const eLen = 2 * AXIS;
  /* boki w kolejności obiegu: start w prawym przednim narożniku, front w stronę lewego */
  const sides = [
    { key: "front", group: "front", name: "Front", start: MAP.P1, dir: F1.dir, gateEnd: true, spans: fillEven(FRONT_A, E.layers) },
    { key: "front2", group: "front", name: "Front", start: G, dir: F2.dir, offset: FRONT_A, spans: [GATE, ...fillWith(F2.L - GATE.axis, E.layers)] },
    { key: "back", group: "back", name: "Tył", start: MAP.P3, dir: BK.dir, spans: fillA(BACK_LEN) },
    /* prawy bok liczony od przedniego narożnika w stronę tyłu */
    { key: "right", group: "right", name: "Prawo", start: [PLOT_W, 0], dir: [0, -1], out: -1, spans: [...rightHead, ...fillA(PLOT_D - rightHead.reduce((a, sp) => a + axisOf(sp), 0))] },
  ];

  function woodTexture() {
    const c = document.createElement("canvas"); c.width = 1024; c.height = 128;
    const g = c.getContext("2d"), r = rng(42);
    g.fillStyle = "#D6B282"; g.fillRect(0, 0, 1024, 128);
    for (let i = 0; i < 70; i++) {
      const y = r() * 128, tone = 150 + Math.floor(r() * 50);
      g.strokeStyle = `rgba(${tone},${Math.floor(tone * 0.72)},${Math.floor(tone * 0.42)},${0.25 + r() * 0.35})`;
      g.lineWidth = 0.6 + r() * 1.6;
      g.beginPath(); g.moveTo(0, y);
      for (let x = 0; x <= 1024; x += 64) g.lineTo(x, y + Math.sin(x / (90 + r() * 60) + i) * (1 + r() * 3));
      g.stroke();
    }
    for (let k = 0; k < 4; k++) {
      const x = 80 + r() * 860, y = 20 + r() * 88;
      g.fillStyle = "rgba(120,80,40,0.35)"; g.beginPath(); g.ellipse(x, y, 10 + r() * 8, 4 + r() * 3, 0, 0, Math.PI * 2); g.fill();
    }
    const t = new T.CanvasTexture(c);
    t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(1 / BL, 1 / BH); t.anisotropy = 4;
    return t;
  }
  /* tekstura deski „złoty dąb” ze zdjęcia ogrodzenia (betonowe-drewno.com), deska wyprostowana z perspektywy, wyrównana jasność, końce zszyte (bez widocznej krawędzi przy powtórzeniu); jedno powtórzenie = deska 200 × 25 cm */
  const ZLOTY_DAB = "data:image/jpeg;base64,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";
  const oakTex = (rx, ry) => { const t = new T.TextureLoader().load(ZLOTY_DAB); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(rx, ry); t.anisotropy = 4; return t; };
  /* deski z ExtrudeGeometry mają UV w cm, deski z BoxGeometry (skrzydła, ścianka koszy) UV 0–1 na ściankę */
  const boardMat = new T.MeshStandardMaterial({ map: oakTex(1 / BL, 1 / BH), roughness: 0.85, metalness: 0 });
  const boxBoardMat = new T.MeshStandardMaterial({ map: oakTex(1, 1), roughness: 0.85, metalness: 0 });
  const postMat = new T.MeshStandardMaterial({ color: 0xA8692F, roughness: 0.9 });
  const cornerMat = new T.MeshStandardMaterial({ color: 0x95592A, roughness: 0.9 });
  const steelMat = new T.MeshStandardMaterial({ color: 0x45484D, roughness: 0.55, metalness: 0.4 });

  function clipBelow(poly, x0, sw, h1, h2) {
    const f = p => (h1 + (h2 - h1) * (p[0] - x0) / sw) - p[1];
    const out = [];
    for (let i = 0; i < poly.length; i++) {
      const cur = poly[i], prev = poly[(i + poly.length - 1) % poly.length], fc = f(cur), fp = f(prev);
      const cut = () => { const t = fp / (fp - fc); return [prev[0] + t * (cur[0] - prev[0]), prev[1] + t * (cur[1] - prev[1])]; };
      if (fc >= -1e-9) { if (fp < -1e-9) out.push(cut()); out.push(cur); }
      else if (fp >= -1e-9) out.push(cut());
    }
    return out;
  }

  /* jeden prosty bok: lokalna oś x wzdłuż płotu, słupek 0 w punkcie startu */
  const sliders = [], swingers = [], tickers = [], pickables = [];
  /* elementy klikalne: wszystkie siatki grupy dostają klucz skrzydła, klik przełącza otwarcie */
  const makePickable = (grp, key) => grp.traverse(o => { if (o.isMesh) { o.userData.pick = key; pickables.push(o); } });
  function buildSide(side, skipFirst, skipLast) {
    const g = new T.Group(), inner = new T.Group();
    inner.position.x = -PW / 2; g.add(inner);
    let pl = 0; const P = [0], tops = [];
    side.spans.forEach(sp => {
      if (sp.gate) { pl += sp.axis; P.push(pl); tops.push([sp.h, sp.h]); return; }
      sp._w = sp.width || BL; sp._x0 = pl + PW - INS; pl += sp._w + PW - 2 * INS; P.push(pl);
      const t = stats(sp.layers).total; tops.push(sp.slope ? [sp.slope[0], sp.slope[1]] : [t, t]);
    });
    side.spans.forEach((sp, i) => {
      sp._center = (P[i] + P[i + 1]) / 2;
      if (sp.sliding) {
        /* brama przesuwna szynowa: skrzydło = światło + 20 cm, po stronie działki, otwiera się w prawo patrząc od frontu */
        const L = sp.clear + 20, zIn = 22, lg = new T.Group(), x0c = P[i] + PW - 10;
        const add2 = (w, h, x, y, mat = steelMat, d = 5) => { const m = new T.Mesh(new T.BoxGeometry(w, h, d), mat); m.position.set(x, y, 0); m.castShadow = true; lg.add(m); };
        for (const [a] of boards(E.layers)) add2(L - 12, BH - 1, L / 2, a + BH / 2 + 4, boxBoardMat, THICK);
        add2(6, sp.h, 3, sp.h / 2 + 4); add2(6, sp.h, L - 3, sp.h / 2 + 4); add2(6, sp.h, L / 2, sp.h / 2 + 4);
        add2(L, 4, L / 2, 6); add2(L, 4, L / 2, sp.h + 2);
        for (const wx of [45, L - 45]) { const wh = new T.Mesh(new T.CylinderGeometry(6, 6, 4, 16), steelMat); wh.rotation.x = Math.PI / 2; wh.position.set(wx, 6, 0); lg.add(wh); }
        lg.position.set(x0c, 0, zIn); inner.add(lg);
        const openX = x0c - (sp.clear + 10);
        const rail = new T.Mesh(new T.BoxGeometry(x0c + L - openX, 2, 4), steelMat);
        rail.position.set((openX + x0c + L) / 2, 1, zIn); inner.add(rail);
        sliders.push({ obj: lg, closedX: x0c, openX, target: x0c });
        return;
      }
      /* brama łamana w świetle xa–xb */
      const drawSwing = (sp, xa, xb) => {
        /* brama skrzydłowa łamana: 2 skrzydła po 2,5 m, każde z 2 paneli po 1,25 m; otwierana do działki (lokalne +z),
           po otwarciu panele składają się na sobie i wchodzą w działkę ok. 1,3 m zamiast 2,5 m */
        const half = (xb - xa) / 2 - 1, pan = half / 2 - 1;
        for (const side2 of [0, 1]) {
          const sgn = side2 ? -1 : 1, hx = side2 ? xb : xa;
          const leaf = new T.Group(), fold = new T.Group();
          const panel = (grp, dz) => {
            /* rama antracyt, wypełnienie deskami w kolorze ogrodzenia */
            const add2 = (w, h, x, y, mat = steelMat, d = 5) => { const m = new T.Mesh(new T.BoxGeometry(w, h, d), mat); m.position.set(x, y, dz); m.castShadow = true; grp.add(m); };
            for (const [a] of boards(E.layers)) add2(pan - 10, BH - 1, sgn * pan / 2, a + BH / 2 + 4, boxBoardMat, THICK);
            add2(5, sp.h, sgn * 2.5, sp.h / 2 + 4); add2(5, sp.h, sgn * (pan - 2.5), sp.h / 2 + 4);
            add2(pan, 4, sgn * pan / 2, 6); add2(pan, 4, sgn * pan / 2, sp.h + 2);
          };
          panel(leaf, 0); panel(fold, 5);
          fold.position.set(sgn * (pan + 2), 0, 0); leaf.add(fold);
          /* oś zawiasów 10 cm od osi płotu po stronie działki, żeby skrzydło otwarte na 180° minęło słupek */
          leaf.position.set(hx, 0, 10); inner.add(leaf);
          /* prawe skrzydło (od strony prawego narożnika) otwiera się na 180° i składa się płasko przy płocie, lewe na 90° */
          swingers.push({ key: "brama", obj: leaf, closed: 0, open: side2 ? Math.PI / 2 : -Math.PI, target: 0 });
          swingers.push({ key: "brama", obj: fold, closed: 0, open: side2 ? -(Math.PI - 0.09) : Math.PI - 0.03, target: 0 });
          makePickable(leaf, "brama");
        }
      };
      /* furtka w świetle xa–xb */
      const drawWicket = (sp, xa, xb, key) => {
        /* furtka: rama stalowa antracyt, wypełnienie deskami w kolorze ogrodzenia w rytmie E;
           skrzydło na zawiasach przy jednym słupku (sp.hingeEnd: przy końcowym), zawsze otwierane o 90° do działki;
           lokalne +z grupy boku to działka, chyba że bok ma out = -1 (prawy) */
        const x0 = xa + 2, x1 = xb - 2, lw = x1 - x0, wk = new T.Group(), hx = sp.hingeEnd ? x1 : x0;
        wk.position.set(hx, 0, 0); inner.add(wk);
        const add = (w, h, x, y, mat = steelMat, d = 5) => { const m = new T.Mesh(new T.BoxGeometry(w, h, d), mat); m.position.set(x - hx, y, 0); m.castShadow = true; wk.add(m); };
        /* skrzydło podniesione 4 cm nad grunt, tak jak brama */
        const LIFT = 4;
        for (const [a, b] of boards(sp.slats || E.layers)) add(lw - 12, BH - 1, x0 + lw / 2, a + BH / 2 + LIFT, boxBoardMat, THICK);
        add(6, sp.h, x0 + 3, sp.h / 2 + LIFT); add(6, sp.h, x1 - 3, sp.h / 2 + LIFT);
        add(lw, 4, x0 + lw / 2, 2 + LIFT); add(lw, 4, x0 + lw / 2, sp.h - 2 + LIFT);
        if (lw > 300) add(6, sp.h, x0 + lw / 2, sp.h / 2 + LIFT);
        add(3, 3, 14, sp.hingeEnd ? x0 + 15 : x1 - 15, 100 + LIFT, steelMat, 14);   /* klamka po stronie przeciwnej do zawiasów */
        const inSgn = side.out === -1 ? -1 : 1;
        swingers.push({ key, obj: wk, closed: 0, open: (sp.hingeEnd ? 1 : -1) * inSgn * Math.PI / 2, target: 0 });
        makePickable(wk, key);
      };
      if (sp.items) {
        let x = P[i] + PW;
        sp.items.forEach((it, k) => {
          if (it.gap) x += it.gap;
          else if (it.steel) { const ph = sp.h + POST_EXTRA, m = new T.Mesh(new T.BoxGeometry(it.steel, ph, it.steel), steelMat); m.position.set(x + it.steel / 2, ph / 2, 0); m.castShadow = m.receiveShadow = true; inner.add(m); x += it.steel; }
          else if (it.box) x += it.box;   /* miejsce na paczkoport, bryła w addPaczkoport */
          else { const lf = it.leaf; if (lf.kind === "swing") drawSwing(lf, x, x + lf.clear); else drawWicket(lf, x, x + lf.clear, `furtka-${side.key}-${i}-${k}`); x += lf.clear; }
        });
        return;
      }
      if (sp.open) return;
      for (const [a, b] of boards(sp.layers)) {
        let poly = [[sp._x0, a], [sp._x0 + sp._w, a], [sp._x0 + sp._w, b], [sp._x0, b]];
        if (sp.slope) poly = clipBelow(poly, sp._x0, sp._w, sp.slope[0], sp.slope[1]);
        if (poly.length < 3) continue;
        const geo = new T.ExtrudeGeometry(new T.Shape(poly.map(p => new T.Vector2(p[0], p[1]))), { depth: THICK, bevelEnabled: false });
        geo.translate(0, 0, -THICK / 2);
        const m = new T.Mesh(geo, boardMat); m.castShadow = m.receiveShadow = true; inner.add(m);
      }
    });
    for (let j = 0; j <= side.spans.length; j++) {
      if ((j === 0 && skipFirst) || (j === side.spans.length && skipLast)) continue;
      const l = j > 0 ? tops[j - 1][1] : 0, r = j < side.spans.length ? tops[j][0] : 0;
      const h = Math.max(l, r) + POST_EXTRA, corner = j === 0 || j === side.spans.length;
      /* słupki w linii płotu zawsze betonowe; stalowe słupki bramy i furtek rysowane w otworach */
      const m = new T.Mesh(new T.BoxGeometry(PW, h, PW), corner ? cornerMat : postMat);
      m.position.set(P[j] + PW / 2, h / 2, 0); m.castShadow = m.receiveShadow = true; inner.add(m);
    }
    g.position.set(side.start[0], 0, side.start[1]);
    g.rotation.y = Math.atan2(-side.dir[1], side.dir[0]);
    side.P = P; side.tops = tops;
    return g;
  }
  /* off > 0 = na zewnątrz działki */
  const world = (side, c, off) => { off *= side.out || 1; return [side.start[0] + side.dir[0] * c + side.dir[1] * off, side.start[1] + side.dir[1] * c - side.dir[0] * off]; };

  const scene = new T.Scene();
  const renderer = new T.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.outputEncoding = T.sRGBEncoding;
  box.appendChild(renderer.domElement);

  /* front rysuje oba przednie narożniki, tył rysuje tylny prawy; prawy bok pomija oba końce */
  /* lewy bok bez ogrodzenia: front i tył rysują własne słupki końcowe, prawy bok korzysta z narożnych słupków frontu i tyłu */
  /* prawy bok rysuje oba narożniki P1 i P2, front zaczyna od P1 i kończy słupkiem w P4, tył zaczyna w P3 i kończy przed P2 */
  const SKIP = { right: [false, false], front: [true, false], front2: [true, false], back: [false, true] };
  sides.forEach(sd => scene.add(buildSide(sd, ...SKIP[sd.key])));

  const outer = new T.Mesh(new T.PlaneGeometry(PLOT_W + 4000, PLOT_D + 4000), new T.MeshStandardMaterial({ color: 0x8C9479, roughness: 1 }));
  outer.rotation.x = -Math.PI / 2; outer.position.set(PLOT_W / 2, -0.5, -PLOT_D / 2); outer.receiveShadow = true; scene.add(outer);
  const lawnGeo = new T.ShapeGeometry(new T.Shape([MAP.P1, MAP.P4, MAP.P3, MAP.P2].map(p => new T.Vector2(p[0], -p[1]))));
  lawnGeo.rotateX(-Math.PI / 2);
  const lawn = new T.Mesh(lawnGeo, new T.MeshStandardMaterial({ color: 0x9DB07C, roughness: 1 }));
  lawn.position.y = 0.3; lawn.receiveShadow = true; scene.add(lawn);
  const streetGeo = new T.PlaneGeometry(FRONT_LEN + 4000, 500); streetGeo.rotateX(-Math.PI / 2);
  const street = new T.Mesh(streetGeo, new T.MeshStandardMaterial({ color: 0x8E8C88, roughness: 1 }));
  street.rotation.y = Math.atan2(FA.dir[1], -FA.dir[0]);
  street.position.set((MAP.P1[0] + MAP.P4[0]) / 2 + FA.dir[1] * 650, -0.2, (MAP.P1[1] + MAP.P4[1]) / 2 - FA.dir[0] * 650); street.receiveShadow = true; scene.add(street);
  const road = new T.Mesh(new T.PlaneGeometry(500, PLOT_D + 2000), new T.MeshStandardMaterial({ color: 0x8E8C88, roughness: 1 }));
  road.rotation.x = -Math.PI / 2; road.position.set(PLOT_W + 400, -0.1, -PLOT_D / 2 + 400); road.receiveShadow = true; scene.add(road);

  /* wnęka na kosze w prawym przednim narożniku: drzwi od drogi w linii ogrodzenia, ściana z drzwiami od działki 1 m w głąb */
  (function addBinRow() {
    /* u = odległość wzdłuż prawego płotu od przedniego narożnika (z = -u), v = głębokość w działkę (x = PLOT_W - v) */
    const { OPEN, U0, GAP, V0 } = K5;
    const steel = new T.MeshStandardMaterial({ color: 0x45484D, roughness: 0.55, metalness: 0.4 });
    const box = (w, h, d, mat, x, y, z) => { const m = new T.Mesh(new T.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; scene.add(m); return m; };
    /* linka w linii płotu między słupkiem narożnym a słupkiem na 3,03 m, wys. 70 cm, lekko zwisająca, z hakiem na końcu */
    const curve = new T.CatmullRomCurve3([0, 0.25, 0.5, 0.75, 1].map(t => new T.Vector3(PLOT_W, 70 - 6 * Math.sin(Math.PI * t), -(PW / 2 + t * (OPEN - PW)))));
    const rope = new T.Mesh(new T.TubeGeometry(curve, 40, 0.7, 6), new T.MeshStandardMaterial({ color: 0x2B2B2B, roughness: 0.6 })); rope.castShadow = true; scene.add(rope);
    for (const z of [-PW / 2 - 1, -(OPEN - PW / 2) + 1]) box(3, 3, 3, steel, PLOT_W, 70, z);
    /* kubły: uchwyty do drogi, pokrywy otwierane od działki */
    function bin(b, u0) {
      const cx = PLOT_W - V0 - b.d / 2, cz = -(u0 + b.w / 2);
      const mat = new T.MeshStandardMaterial({ color: b.c, roughness: 0.6 });
      box(b.d - 4, b.h - 8, b.w - 4, mat, cx, (b.h - 8) / 2 + 2, cz);
      box(b.d + 2, 5, b.w + 1, mat, cx, b.h - 3, cz);
      box(4, 4, b.w - 10, mat, cx + b.d / 2, b.h - 10, cz);
      for (const s of [-1, 1]) { const wh = new T.Mesh(new T.CylinderGeometry(10, 10, 5, 16), steel); wh.rotation.x = Math.PI / 2; wh.position.set(cx + b.d / 2 - 8, 10, cz + s * (b.w / 2 - 2)); scene.add(wh); }
    }
    const BIG = { w: 58, d: 73, h: 107 }, SMALL = { w: 48, d: 55, h: 93 };
    let u = U0;
    for (const b of [{ ...BIG, c: 0x2F3133 }, { ...BIG, c: 0xE2B714 }, { ...SMALL, c: 0x7A4E2A }, { ...SMALL, c: 0x2F6FB5 }, { ...SMALL, c: 0x2E8B4A }]) { bin(b, u); u += b.w + GAP; }
    /* ścianka od działki 110 cm: dwa przęsła 144 wzdłuż płotu i przęsło 92 do słupka płotu na 3,03 m */
    const { D, UF } = K5, UM = (UF + OPEN) / 2, W = (u, v) => [PLOT_W - v, -u];
    const wall = (a, b) => { const pa = W(...a), pb = W(...b), dx = pb[0] - pa[0], dz = pb[1] - pa[1], L = Math.hypot(dx, dz) - PW, ang = Math.atan2(-dz, dx);
      for (const [y] of boards(LOW)) { const m = box(L, BH, THICK, boxBoardMat, (pa[0] + pb[0]) / 2, y + BH / 2, (pa[1] + pb[1]) / 2); m.rotation.y = ang; } };
    wall([UF, D], [UM, D]); wall([UM, D], [OPEN, D]); wall([OPEN, D], [OPEN, 0]);
    for (const [pu, pv] of [[UF, D], [UM, D], [OPEN, D]]) { const w = W(pu, pv); box(PW, 115, PW, postMat, w[0], 57.5, w[1]); }
  })();

  (function addPaczkoport() {
    const sd = sides.find(x => x.key === "front2"), c = PACZ.at, [x, z] = world(sd, c, 0), B = PACZ.box;
    const g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = Math.atan2(-sd.dir[1], sd.dir[0]); scene.add(g);
    const z0 = -THICK / 2 + B.d / 2;   /* środek skrzynki: lico od ulicy w płaszczyźnie zewnętrznego lica desek */
    const ral7016 = new T.MeshStandardMaterial({ color: 0x383E42, roughness: 0.7, metalness: 0.3 }), dark = new T.MeshStandardMaterial({ color: 0x23272A, roughness: 0.6, metalness: 0.3 });
    const part = (w, h, d, m, px, py, pz) => { const o = new T.Mesh(new T.BoxGeometry(w, h, d), m); o.position.set(px, py, pz); o.castShadow = o.receiveShadow = true; g.add(o); };
    part(B.w, B.h, B.d, ral7016, 0, B.h / 2, z0);
    /* lokalne −z = ulica (furtka otwiera się w +z do działki): klapa wrzutowa od ulicy, drzwiczki odbiorcze od działki */
    part(B.w - 8, 42, 1, dark, 0, B.h - 34, z0 - B.d / 2 - 0.5);
    part(B.w - 8, B.h - 30, 1, dark, 0, (B.h - 22) / 2 + 4, z0 + B.d / 2 + 0.5);
    part(3, 3, 2, ral7016, B.w / 2 - 9, 75, z0 + B.d / 2 + 1.5);
  })();

  /* budynek: obrys z mapy zasadniczej 1:500, bryła wg projektu Archon „Dom w świetliku (G2N)”:
     część główna 2 kondygnacje, dach dwuspadowy 42°, kalenica prostopadle do frontu, wysokość 9,18 m;
     garaż wysunięty w prawo i do przodu (pas „1” z mapy) oraz podcień przy wejściu pod niskim dachem kopertowym */
  (function addBuilding() {
    const BLD = {"main": [[1652.6, -1157.0], [1218.1, -1157.2], [986.6, -1155.7], [693.7, -1155.4], [692.6, -1537.5], [691.7, -1970.2], [690.6, -2348.0], [1654.4, -2350.9], [1656.1, -1950.0]], "lpart": [[1656.1, -1950.0], [1652.6, -1157.0], [1218.1, -1157.2], [1220.5, -937.3], [1892.8, -939.6], [1891.2, -1951.1]], "east": [[692.6, -1537.5], [586.8, -1538.5], [586.5, -1969.4], [691.7, -1970.2]], "porch": [[1220.5, -937.3], [989.0, -935.7], [986.6, -1155.7], [1218.1, -1157.2]]};
    const X0 = 690.6, X1 = 1656.1, Z0 = -1155.0, Z1 = -2350.9;
    const RIDGE = 918, PITCH = 42 * Math.PI / 180, OVE = 50, OVG = 40;
    const WALL_TOP = RIDGE - (X1 - X0) / 2 * Math.tan(PITCH);
    const GE = 300, GT = 300 + 230 * Math.tan(25 * Math.PI / 180);
    const mat = c => new T.MeshStandardMaterial({ color: c, roughness: 0.9, side: T.DoubleSide });
    const plaster = mat(0xF1EFEA), clinker = mat(0xDCD3B8), roofMat = mat(0x55595F), edgeMat = new T.LineBasicMaterial({ color: 0x6E675C });
    const add = (geo, m) => { const o = new T.Mesh(geo, m); o.castShadow = o.receiveShadow = true; scene.add(o); scene.add(new T.LineSegments(new T.EdgesGeometry(geo), edgeMat)); return o; };
    const prism = (poly, h, m) => { const g = new T.ExtrudeGeometry(new T.Shape(poly.map(p => new T.Vector2(p[0], -p[1]))), { depth: h, bevelEnabled: false }); g.rotateX(-Math.PI / 2); return add(g, m); };
    const facet = (pts, m) => { const g = new T.BufferGeometry(), v = [];
      for (let i = 1; i < pts.length - 1; i++) v.push(...pts[0], ...pts[i], ...pts[i + 1]);
      g.setAttribute("position", new T.Float32BufferAttribute(v, 3)); g.computeVertexNormals(); return add(g, m); };
    /* ściany */
    prism(BLD.main, WALL_TOP, plaster);
    prism(BLD.lpart, GE, clinker);
    prism(BLD.east, GE, plaster);
    /* szczyty i poddasze części głównej */
    const gable = new T.ExtrudeGeometry(new T.Shape([new T.Vector2(X0, WALL_TOP), new T.Vector2(X1, WALL_TOP), new T.Vector2((X0 + X1) / 2, RIDGE)]), { depth: Z0 - Z1, bevelEnabled: false });
    gable.translate(0, 0, Z1); add(gable, plaster);
    /* dach dwuspadowy z okapami */
    const run = (X1 - X0) / 2 + OVE, slope = run / Math.cos(PITCH), len = Z0 - Z1 + 2 * OVG, zc = (Z0 + Z1) / 2;
    for (const sgn of [-1, 1]) {
      const slab = new T.Mesh(new T.BoxGeometry(slope, 18, len), roofMat);
      slab.position.set((X0 + X1) / 2 + sgn * run / 2, RIDGE - run * Math.tan(PITCH) / 2 + 9, zc);
      slab.rotation.z = -sgn * PITCH; slab.castShadow = slab.receiveShadow = true; scene.add(slab);
    }
    /* dach kopertowy nad garażem i podcieniem: pas od frontu (z −937 do ściany głównej) i pas od prawej (x do 1892) */
    const zF = -936.5, xR = 1892, xL = 986.6, zB = -1951, dF = Z0 - zF, dR = xR - X1;
    const P = (x, y, z) => [x, y, z];
    facet([P(xL, GE, zF), P(X1, GE, zF), P(X1, GT, Z0), P(xL + dF, GT, Z0)], roofMat);
    facet([P(xL, GE, zF), P(xL + dF, GT, Z0), P(xL, GE, Z0)], roofMat);
    facet([P(X1, GE, zF), P(xR, GE, zF), P(X1, GT, Z0)], roofMat);
    facet([P(xR, GE, zF), P(xR, GE, Z0), P(X1, GT, Z0)], roofMat);
    facet([P(xR, GE, Z0), P(xR, GE, zB), P(X1, GT, zB + dR), P(X1, GT, Z0)], roofMat);
    facet([P(xR, GE, zB), P(X1, GE, zB), P(X1, GT, zB + dR)], roofMat);
    /* słup podcienia */
    const col = new T.Mesh(new T.BoxGeometry(20, GE, 20), clinker); col.position.set(xL + 12, GE / 2, zF - 12); col.castShadow = true; scene.add(col);
  })();

  /* podjazd od bramy do garażu i 2 auta o wymiarach Toyoty RAV4 (460 × 186 × 169 cm, rozstaw osi 269 cm) – uproszczone bryły */
  (function addDriveway() {
    const at = d => [MAP.P1[0] + F1.dir[0] * d, MAP.P1[1] + F1.dir[1] * d];
    /* kostka wg szkicu na mapie: od narożnika garażu (prawy przód części parterowej) do frontu 4,90 m od prawego narożnika,
       wzdłuż frontu do 12,05 m (za furtką), do lewego przedniego narożnika podcienia */
    const poly = [[1892.8, -939.6], at(490), at(1205), [989.0, -935.7]];
    const geo = new T.ShapeGeometry(new T.Shape(poly.map(p => new T.Vector2(p[0], -p[1])))); geo.rotateX(-Math.PI / 2);
    const m = new T.Mesh(geo, new T.MeshStandardMaterial({ color: 0xB3AEA5, roughness: 1 })); m.position.y = 0.8; m.receiveShadow = true; scene.add(m);
  })();
  (function addCars() {
    const L = 460, Wd = 186, H = 169, WB = 269, R = 36;
    const tyre = new T.MeshStandardMaterial({ color: 0x1E1E1E, roughness: 0.8 }), glass = new T.MeshStandardMaterial({ color: 0x27313A, roughness: 0.25, metalness: 0.3 });
    function car(cx, cz, color, rot = 0) {
      const g = new T.Group(), paint = new T.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.4 });
      const part = (w, h, d, mat, x, y, z) => { const o = new T.Mesh(new T.BoxGeometry(w, h, d), mat); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; g.add(o); return o; };
      part(Wd, 70, L, paint, 0, 25 + 35, 0);                       /* nadwozie dolne */
      part(Wd - 4, 14, 120, paint, 0, 95 + 7 - 14, -L / 2 + 60 + 10); /* maska, lekko niżej z przodu */
      part(Wd - 16, 52, 255, glass, 0, 95 + 26, 35);                 /* przeszklenie kabiny */
      part(Wd - 14, 8, 245, paint, 0, H - 4, 40);                    /* dach */
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        const w = new T.Mesh(new T.CylinderGeometry(R, R, 24, 24), tyre); w.rotation.z = Math.PI / 2;
        w.position.set(sx * (Wd / 2 - 14), R, sz * WB / 2); w.castShadow = true; g.add(w);
      }
      g.position.set(cx, 0, cz); g.rotation.y = rot; scene.add(g); return g;
    }
    /* przodem do garażu (−z), między skrzydłami bramy a podcieniem */
    /* auta przesunięte razem z bramą o 1 m w stronę prawego narożnika */
    car(1290 + 100, -630, 0xE6E6E3);
    const darkCar = car(1560 + 100, -630, 0x5B5F65);
    /* trzecie auto w pasie między garażem a prawym płotem, przodem do ulicy (wjazd tyłem):
       75 cm od płotu (drzwi kierowcy), 41 cm od ściany garażu, środek 4,6 m za linią garażu */
    const car3 = car(2194 - 75 - Wd / 2, -1500 + WB / 2, 0x7D2E2E, Math.PI);
    /* tory 3. auta: liczone od pozycji w pasie przy garażu jazdą do przodu (odjazd), przyjazd = dojazd jezdnią za bramę i ten sam tor tyłem.
       x, z = środek tylnej osi, a = kierunek jazdy (0 = przodem w −z). Jezdnia 5 m, 4 m od płotu; zjazd przez pas 4 m szeroki jak światło bramy (5 m).
       lewo: prosto 600, łuk w prawo R 470 / 50°, prosto 250, łuk w lewo R 470 / 50°, skręt w prawo R 520 na bliższy pas.
       prawo: prosto 650, łuk w prawo R 470 / 55°, prosto 250, łuk w lewo R 470 / 55°, prosto 100, skręt w lewo R 470 na dalszy pas.
       R = promień toru środka tylnej osi; zewnętrzne przednie koło 6,6 m i 6,1 m */
    const STREET_A = Math.atan2(F1.dir[0], -F1.dir[1]);   /* kierunek jezdni w lewo (patrząc z ulicy na działkę) */
    function buildTrack(v) {
      let x = 2194 - 75 - Wd / 2, z = -1500, a = Math.PI; const pts = [{ x, z, a }], step = 5;
      const arc = (sg, th, R0) => { const n = Math.round(R0 * th / step); for (let i = 0; i < n; i++) { const da = sg * th / n, ds = R0 * th / n; a += da / 2; x += Math.sin(a) * ds; z -= Math.cos(a) * ds; a += da / 2; pts.push({ x, z, a }); } };
      const line = d => { const n = Math.round(d / step); for (let i = 0; i < n; i++) { x += Math.sin(a) * d / n; z -= Math.cos(a) * d / n; pts.push({ x, z, a }); } };
      const rad = Math.PI / 180;
      if (v === "lewo") { line(600); arc(1, 50 * rad, 470); line(250); arc(-1, 50 * rad, 470); arc(1, (STREET_A + 2 * Math.PI - Math.PI), 520); }
      else { line(650); arc(1, 55 * rad, 470); line(250); arc(-1, 55 * rad, 470); line(100); arc(-1, Math.PI - (STREET_A + Math.PI), 470); }
      const iTurn = pts.length - 1;
      line(1500);
      return { pts, iTurn };
    }
    const TRACKS = { lewo: buildTrack("lewo"), prawo: buildTrack("prawo") };
    const OH = (L - WB) / 2;
    const pose = (o, p) => { o.position.set(p.x + Math.sin(p.a) * WB / 2, 0, p.z - Math.cos(p.a) * WB / 2); o.rotation.y = -p.a; };
    const PARK = TRACKS.lewo.pts[0];
    /* przejazd jako lista pozycji: odjazd = tor do przodu; przyjazd = jazda jezdnią przodem za zjazd (ok. 3 m za koniec skrętu), potem tor tyłem */
    function maneuver(kind, v) {
      const { pts, iTurn } = TRACKS[v];
      if (kind === "out") return pts;
      const iStop = iTurn + 60, P = pts[iTurn], f = [Math.sin(P.a), -Math.cos(P.a)], arr = [];
      for (let d = -1500; d < 0; d += 5) arr.push({ x: P.x + f[0] * d, z: P.z + f[1] * d, a: P.a });
      return arr.concat(pts.slice(iTurn, iStop + 1), pts.slice(0, iStop + 1).reverse());
    }
    const track = new T.Group(); scene.add(track);
    const lineM = c => new T.LineBasicMaterial({ color: c }), FRONT_M = lineM(0x1C7ED6), REAR_M = lineM(0x2F9E44), SIDE_M = lineM(0xAE3EC9), axleM = new T.LineDashedMaterial({ color: 0xD9480F, dashSize: 30, gapSize: 18 });
    function drawTrack(seq) {
      while (track.children.length) { const c = track.children.pop(); c.geometry.dispose(); }
      const tr = (lng, lat) => seq.map(p => new T.Vector3(p.x + Math.sin(p.a) * lng + Math.cos(p.a) * lat, 2.5, p.z - Math.cos(p.a) * lng + Math.sin(p.a) * lat));
      const ax = new T.Line(new T.BufferGeometry().setFromPoints(tr(0, 0)), axleM); ax.computeLineDistances(); track.add(ax);
      for (const [lng, lat, m] of [[WB + OH, Wd / 2, FRONT_M], [WB + OH, -Wd / 2, FRONT_M], [-OH, Wd / 2, REAR_M], [-OH, -Wd / 2, REAR_M], [0, Wd / 2, SIDE_M], [0, -Wd / 2, SIDE_M]])
        track.add(new T.Line(new T.BufferGeometry().setFromPoints(tr(lng, lat)), m));
    }
    let anim = null;
    window.car3Sim = (kind, v) => {
      const lg = document.getElementById("v3legend"); if (lg) lg.style.display = kind === "hide" ? "none" : "block";
      if (kind === "hide") { anim = null; track.visible = false; darkCar.visible = true; pose(car3, PARK); return; }
      const seq = maneuver(kind, v);
      drawTrack(seq); track.visible = true; darkCar.visible = false;
      swingers.forEach(sw => { if (sw.key === "brama") sw.target = sw.open; });
      const b = document.getElementById("v3gate"); if (b) b.textContent = "Zamknij bramę";
      anim = { seq, t0: performance.now() + 1500 };
      pose(car3, seq[0]);
    };
    tickers.push(now => {
      if (!anim || now < anim.t0) return;
      const seq = anim.seq, SPEED = 150 / 1000 / 5;   /* 150 cm/s, punkty toru co 5 cm */
      const k = Math.min(seq.length - 1, (now - anim.t0) * SPEED), i0 = Math.floor(k), i1 = Math.min(seq.length - 1, i0 + 1), f = k - i0, A0 = seq[i0], A1 = seq[i1];
      pose(car3, { x: A0.x + (A1.x - A0.x) * f, z: A0.z + (A1.z - A0.z) * f, a: A0.a + (A1.a - A0.a) * f });
      if (k >= seq.length - 1) anim = null;
    });
  })();

  /* studnia wodomierzowa z mapy zasadniczej (niebieskie kółko „w”): środek 1,94 m od narożnika wzdłuż prawego boku, 1,95 m od prawej granicy; średnica przyjęta 120 cm */
  const WELL = { x: 2004.8, z: -194.0, r: 60 };
  (function addMeterWell() {
    const ring = new T.Mesh(new T.CylinderGeometry(WELL.r, WELL.r, 12, 48), new T.MeshStandardMaterial({ color: 0x9A9A96, roughness: 0.9 }));
    ring.position.set(WELL.x, 6, WELL.z); ring.castShadow = ring.receiveShadow = true; scene.add(ring);
    const lid = new T.Mesh(new T.CylinderGeometry(WELL.r - 10, WELL.r - 10, 3, 48), new T.MeshStandardMaterial({ color: 0x3A6EA5, roughness: 0.6 }));
    lid.position.set(WELL.x, 13, WELL.z); lid.receiveShadow = true; scene.add(lid);
  })();

  scene.add(new T.HemisphereLight(0xEAF1FF, 0x6E6A55, 0.75));
  const sun = new T.DirectionalLight(0xFFF3E0, 0.9);
  sun.position.set(PLOT_W / 2 - 1500, 2600, -PLOT_D / 2 + 1700); sun.target.position.set(PLOT_W / 2, 0, -PLOT_D / 2);
  sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096);
  Object.assign(sun.shadow.camera, { left: -2800, right: 2800, top: 2800, bottom: -2800, near: 100, far: 7000 });
  scene.add(sun, sun.target);

  function label(text, x, y, z, w) {
    const c = document.createElement("canvas"); c.width = 512; c.height = 128;
    const g = c.getContext("2d");
    g.fillStyle = "rgba(255,255,255,0.9)"; g.fillRect(4, 14, 504, 100);
    g.fillStyle = "#22201C"; g.textAlign = "center"; g.textBaseline = "middle";
    let fs = 56; do { g.font = `700 ${fs}px Archivo, Arial, sans-serif`; } while (g.measureText(text).width > 470 && --fs > 18);
    g.fillText(text, 256, 66);
    const sp = new T.Sprite(new T.SpriteMaterial({ map: new T.CanvasTexture(c), depthTest: false }));
    sp.scale.set(w, w / 4, 1); sp.position.set(x, y, z); scene.add(sp); return sp;
  }
  const fm = [(MAP.P1[0] + MAP.P4[0]) / 2, (MAP.P1[1] + MAP.P4[1]) / 2], bm = [(MAP.P3[0] + MAP.P2[0]) / 2, (MAP.P3[1] + MAP.P2[1]) / 2];
  label(`FRONT · ${fmt(FRONT_LEN / 100, 2)} m`, fm[0] + FA.dir[1] * 380, 470, fm[1] - FA.dir[0] * 380, 520);
  label(`TYŁ · ${fmt(BACK_LEN / 100, 2)} m`, bm[0] + BK.dir[1] * 380, 470, bm[1] - BK.dir[0] * 380, 520);
  label(`PRAWO · ${fmt(RIGHT_LEN / 100, 2)} m`, PLOT_W + 420, 470, -PLOT_D / 2, 520);

  function addPerson(px, pz, rot) {
    const H = 175, skin = new T.MeshStandardMaterial({ color: 0xD9A88A, roughness: 0.8 }),
      shirt = new T.MeshStandardMaterial({ color: 0x4F6D8A, roughness: 0.9 }), pants = new T.MeshStandardMaterial({ color: 0x3A3C40, roughness: 0.9 }),
      shoe = new T.MeshStandardMaterial({ color: 0x2A2522, roughness: 0.9 });
    const g = new T.Group();
    const part = (geo, mat, x, y, z) => { const m = new T.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; g.add(m); return m; };
    for (const sx of [-9, 9]) { part(new T.BoxGeometry(11, 7, 26), shoe, sx, 3.5, 4); part(new T.CylinderGeometry(7, 6, 78, 16), pants, sx, 46, 0); }
    part(new T.CylinderGeometry(19, 16, 62, 20), shirt, 0, 116, 0).scale.set(1, 1, 0.6);
    part(new T.SphereGeometry(19, 20, 12), shirt, 0, 145, 0).scale.set(1, 0.35, 0.6);
    for (const sx of [-23, 23]) { part(new T.CylinderGeometry(5.5, 4.5, 58, 12), shirt, sx, 114, 0).rotation.z = sx > 0 ? 0.08 : -0.08; part(new T.SphereGeometry(5, 12, 8), skin, sx * 1.1, 82, 0); }
    part(new T.CylinderGeometry(5.5, 6, 9, 12), skin, 0, 151, 0);
    part(new T.SphereGeometry(10.5, 20, 16), skin, 0, H - 11, 0).scale.set(0.9, 1.05, 1);
    g.position.set(px, 0, pz); g.rotation.y = rot; scene.add(g);
    const c = document.createElement("canvas"); c.width = 256; c.height = 96;
    const x = c.getContext("2d");
    x.fillStyle = "rgba(255,255,255,0.88)"; x.fillRect(8, 16, 240, 64);
    x.fillStyle = "#22201C"; x.font = "500 44px IBM Plex Mono, monospace"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText("175 cm", 128, 50);
    const sp = new T.Sprite(new T.SpriteMaterial({ map: new T.CanvasTexture(c), depthTest: false }));
    sp.scale.set(48, 18, 1); sp.position.set(px, H + 22, pz); scene.add(sp);
  }
  const front = sides[0], front2 = sides[1];
  const gSpan = front2.spans.find(sp => sp === GATE), eSpan = front.spans[1];
  const p2 = world(front, eSpan._center, 70), pg = world(front2, gSpan._center, 0);
  addPerson(p2[0], p2[1], -0.25);

  const camera = new T.PerspectiveCamera(40, 1, 5, 40000);
  const controls = new T.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.maxPolarAngle = Math.PI / 2 - 0.03; controls.minDistance = 80; controls.maxDistance = 15000;
  const midP = [(pg[0] + p2[0]) / 2, (pg[1] + p2[1]) / 2];
  const views = {
    /* front: kamera nad ulicą na osi frontu; narożnik: po skosie zza skrzyżowania ulicy i drogi; prawy bok: znad drogi na środku boku */
    start: { pos: [PLOT_W / 2, 620, 1900], target: [PLOT_W / 2, 80, -250] },
    corner: { pos: [PLOT_W + 950, 480, 950], target: [PLOT_W - 150, 80, -300] },
    right: { pos: [PLOT_W + 2700, 620, -PLOT_D / 2 + 250], target: [PLOT_W - 250, 40, -PLOT_D / 2] },
    bins: { pos: [PLOT_W + 520, 280, 160], target: [PLOT_W - 60, 50, -150] },
    binsIn: { pos: [PLOT_W - 560, 300, -330], target: [PLOT_W - 60, 50, -150] },
    person: { pos: [midP[0], 210, midP[1] + 650], target: [midP[0], 100, midP[1] - 70] },
    car3: { pos: [PLOT_W + 900, 2300, 1900], target: [1500, 0, -250] },
    top: { pos: [PLOT_W / 2, 7200, -PLOT_D / 2 + 1], target: [PLOT_W / 2, 0, -PLOT_D / 2] },
  };
  function setView(v) { camera.position.set(...v.pos); controls.target.set(...v.target); controls.update(); }

  function bg() { const c = getComputedStyle(document.documentElement).getPropertyValue("--card").trim() || "#F8F7F4"; scene.background = new T.Color(c); }
  bg();
  try { matchMedia("(prefers-color-scheme: dark)").addEventListener("change", bg); } catch (e) {}
  new MutationObserver(bg).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

  /* każda deska z innym fragmentem usłojenia: losowe przesunięcie wzdłuż, odbicie w poziomie i w pionie (ziarno stałe, wygląd powtarzalny) */
  (function mixGrain() {
    const R = rng(2026);
    scene.traverse(o => {
      if (!o.isMesh || (o.material !== boardMat && o.material !== boxBoardMat)) return;
      o.material = boardMat;
      const g = o.geometry, P = g.attributes.position, U = g.attributes.uv; if (!U) return;
      g.computeBoundingBox(); const bb = g.boundingBox, hgt = bb.max.y - bb.min.y;
      const flip = R() < 0.5 ? -1 : 1, off = R() * BL, vflip = R() < 0.5;
      for (let i = 0; i < P.count; i++) { const x = P.getX(i) - bb.min.x, y = P.getY(i) - bb.min.y; U.setXY(i, flip * x + off, vflip ? hgt - y : y); }
      U.needsUpdate = true;
    });
  })();
  function resize() { const wpx = box.clientWidth, hpx = box.clientHeight; renderer.setSize(wpx, hpx); camera.aspect = wpx / hpx; camera.updateProjectionMatrix(); }
  new ResizeObserver(resize).observe(box); resize();
  setView(views.start);
  (function loop() {
    requestAnimationFrame(loop);
    for (const sl of sliders) { const d = sl.target - sl.obj.position.x; if (Math.abs(d) > 0.2) sl.obj.position.x += d * 0.05; }
    for (const sw of swingers) { const d = sw.target - sw.obj.rotation.y; if (Math.abs(d) > 0.002) sw.obj.rotation.y += d * 0.06; }
    const now = performance.now(); for (const tk of tickers) tk(now);
    controls.update(); renderer.render(scene, camera);
  })();
  document.getElementById("v3gate").addEventListener("click", e => {
    const open = swingers.some(sw => sw.key === "brama" && sw.target === sw.closed);
    swingers.forEach(sw => { if (sw.key === "brama") sw.target = open ? sw.open : sw.closed; });
    e.currentTarget.textContent = open ? "Zamknij bramę" : "Otwórz bramę";
  });

  /* klik (bez przeciągania) w bramę lub furtkę otwiera / zamyka ją */
  (function clickToggle() {
    const ray = new T.Raycaster(), ndc = new T.Vector2(), el = renderer.domElement; let down = null;
    const hit = e => { const r = el.getBoundingClientRect(); ndc.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1); ray.setFromCamera(ndc, camera);
      const h = ray.intersectObjects(scene.children, true)[0]; return h && h.object.userData.pick; };
    el.addEventListener("pointerdown", e => { down = [e.clientX, e.clientY]; });
    el.addEventListener("pointerup", e => {
      if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5) return;
      const key = hit(e); if (!key) return;
      const grp = swingers.filter(sw => sw.key === key), open = grp.some(sw => sw.target === sw.closed);
      grp.forEach(sw => sw.target = open ? sw.open : sw.closed);
      if (key === "brama") { const b = document.getElementById("v3gate"); if (b) b.textContent = open ? "Zamknij bramę" : "Otwórz bramę"; }
    });
    el.addEventListener("pointermove", e => { if (e.buttons) return; el.style.cursor = hit(e) ? "pointer" : ""; });
  })();
  document.getElementById("v3reset").addEventListener("click", () => setView(views.start));
  document.getElementById("v3corner").addEventListener("click", () => setView(views.corner));
  document.getElementById("v3right").addEventListener("click", () => setView(views.right));
  document.getElementById("v3bins").addEventListener("click", () => setView(views.bins));
  document.getElementById("v3binsIn").addEventListener("click", () => setView(views.binsIn));
  document.getElementById("v3top").addEventListener("click", () => setView(views.top));
  document.getElementById("v3person").addEventListener("click", () => setView(views.person));
  /* z prawej = auto jedzie jezdnią w lewo i cofa do bramy (tor „lewo”); z lewej = jedzie w prawo i cofa przez przeciwny pas (tor „prawo”) */
  document.getElementById("v3car3inR").addEventListener("click", () => { setView(views.car3); window.car3Sim("in", "lewo"); });
  document.getElementById("v3car3inL").addEventListener("click", () => { setView(views.car3); window.car3Sim("in", "prawo"); });
  document.getElementById("v3car3outL").addEventListener("click", () => { setView(views.car3); window.car3Sim("out", "lewo"); });
  document.getElementById("v3car3outR").addEventListener("click", () => { setView(views.car3); window.car3Sim("out", "prawo"); });
  document.getElementById("v3car3hide").addEventListener("click", () => window.car3Sim("hide"));

  /* zestawienie obwodu */
  let nSpans = 0, nBoards = 0, nShort = 0, nShortBoards = 0, nGates = 0, nGatePosts = 0, nTri = 0, nSteel = 0;
  const sum = document.getElementById("v3sum");
  sum.innerHTML = "";
  /* materiał z nadmiarem: każda rozpoczęta długość 2,04 m = pełne przęsło, zaokrąglane osobno dla każdego odcinka;
     odliczone 6 m na bramę z furtką na froncie i 1 m na furtkę na prawym boku */
  (function materialEstimate() {
    const nOf = lay => stats(lay).n, up = L => Math.ceil(L / AXIS - 1e-9);
    const cRun = 2 * (tw + PW - 2 * INS) + nF_right * AXIS;
    const rows = [
      { side: "Front", seg: `${E.k}, bez bramy, furtki i paczkoportu (${fmt(FRONT_LEN / 100, 2)} − ${fmt(GATE.axis / 100, 2)} m)`, L: FRONT_LEN - GATE.axis, lay: E.layers },
      { side: "Tył", seg: `${A.k}, cały bok`, L: BACK_LEN, lay: A.layers },
      { side: "Prawy", seg: `${A.k} od furtki za koszami do skosu`, L: SKOS_START - K5.OPEN - WICKET_K.axis, lay: A.layers },
      { side: "Prawy", seg: `skos + 5 × ${F.k} + skos`, L: cRun, lay: F.layers },
      { side: "Prawy", seg: `${A.k} za furtką (${fmt(RIGHT_LEN / 100, 2)} − ${fmt(WICKET2.axis / 100, 2)} m − reszta)`, L: RIGHT_LEN - WICKET2.axis - SKOS_START - cRun, lay: A.layers },
    ].map(r => Object.assign(r, { k: up(r.L), per: nOf(r.lay) }));
    const BAY_EXTRA = BAY_BOARDS;
    const byPat = {};
    rows.forEach(r => { const key = r.lay === E.layers ? E.k : r.lay === F.layers ? F.k : A.k; byPat[key] = byPat[key] || { k: 0, b: 0, per: r.per }; byPat[key].k += r.k; byPat[key].b += r.k * r.per; });
    const spans = rows.reduce((a, r) => a + r.k, 0), boardsLine = rows.reduce((a, r) => a + r.k * r.per, 0), boardsAll = boardsLine + BAY_EXTRA;
    /* słupki: front 2 otwory, prawy 1 otwór, lewy bok otwarty, 2 narożniki wspólne */
    const kF = rows[0].k, kB = rows[1].k, kR = rows.slice(2).reduce((a, r) => a + r.k, 0);
    const posts = (kF + 2 + 1) + (kB + 1) + (kR + 3 + 1) - 2, steelPosts = sides.reduce((a, sd) => a + sd.spans.reduce((b, sp) => b + (sp.items ? sp.items.filter(it => it.steel).length : 0), 0), 0), tall = nF_right + 1;
    const tr = rows.map(r => `<tr><td>${r.side}</td><td>${r.seg}</td><td>${fmt(r.L / 100, 2)} m</td><td>${fmt(r.L / AXIS, 2)} → <b>${r.k}</b></td><td>${r.per}</td><td><b>${r.k * r.per}</b></td></tr>`).join("");
    const pat = Object.keys(byPat).sort().map(k => `${k}: ${byPat[k].k} przęseł × ${byPat[k].per} = ${byPat[k].b} desek`).join(" · ");
    const d = document.createElement("div");
    d.className = "card segcard";
    d.innerHTML = `<h3 style="font-family:var(--f-display);font-size:1rem;margin:0">Materiał z nadmiarem: pełne przęsła <span class="pattern">każde rozpoczęte 2,04 m = pełne przęsło · odliczone: brama, furtka i paczkoport (${fmt(GATE.axis / 100, 2)} m) na froncie, otwarcie na kosze (${fmt(K5.OPEN / 100, 2)} m) i 2 furtki (po ${fmt(WICKET2.axis / 100, 2)} m) na prawym boku</span></h3>
      <div class="segwrap"><table class="seg"><thead><tr><th>Bok</th><th>Odcinek</th><th>Długość</th><th>Przęseł (÷ 2,04)</th><th>Desek / przęsło</th><th>Desek</th></tr></thead>
      <tbody>${tr}<tr><td>Prawy</td><td>ścianka przy koszach 110 cm (${A.k} bez górnej deski): 2 × 144 (deski 140) + 92 (deski 88)</td><td>–</td><td>–</td><td>–</td><td><b>${BAY_EXTRA}</b></td></tr></tbody></table></div>
      <p style="margin:6px 0 0">${pat}</p>
      <p style="margin:4px 0 0"><b>Razem: ${spans} pełnych przęseł, ${boardsLine} + ${BAY_EXTRA} = ${boardsAll} desek · ok. ${fmt(boardsAll * WEIGHT / 1000, 1)} t</b></p>
      <p style="margin:4px 0 0">Słupki z nadmiarem: ok. ${posts} betonowych w linii płotu + ${BAY_POSTS} przy koszach (≥ 115 cm) + ${steelPosts} stalowych 10 × 10 pod bramę i furtki. Wysokie (≥ 180 cm nad gruntem) przy ${F.k}: ${tall - 2}, przy końcach skosów ≥ 155 cm: 2, pozostałe ≥ 150 cm.</p>`;
    sum.appendChild(d);
  })();
  /* odcinki: kolejne przęsła o tym samym przepierzeniu; skos, brama i furtka osobno */
  const baseOf = sp => sp.gate ? sp.name : sp.slope ? (sp.slope[1] > sp.slope[0] ? "skos ↑" : "skos ↓") : sp.layers === E.layers ? E.k : sp.layers === F.layers ? F.k : A.k;
  function segments(sd) {
    const out = []; let i = 0;
    while (i < sd.spans.length) {
      const sp = sd.spans[i], b = baseOf(sp);
      let k = 1;
      while (!sp.gate && !sp.slope && i + k < sd.spans.length) { const nx = sd.spans[i + k]; if (nx.gate || nx.slope || baseOf(nx) !== b) break; k++; }
      const list = sd.spans.slice(i, i + k), full = list.filter(x => !x.width).length, short = list.filter(x => x.width);
      let detail = "";
      if (sp.gate) detail = `światło ${fmt(sp.clear / 100, 2)} m`;
      else if (sp.slope) detail = `deski ${sp.width} cm`;
      else detail = [full ? `${full} × 204` : "", ...Object.entries(short.reduce((m, x) => (m[axisOf(x)] = (m[axisOf(x)] || 0) + 1, m), {})).map(([a, c]) => `${c} × ${fmt(+a, Number.isInteger(+a) ? 0 : 1)}`)].filter(Boolean).join(" + ") + " cm";
      out.push({ lab: b, from: sd.P[i], to: sd.P[i + k], detail, gate: !!sp.gate });
      i += k;
    }
    return out;
  }
  const segLabels = [];
  function segLabel(text, x, z, y) {
    const c = document.createElement("canvas"); c.width = 512; c.height = 112;
    const g = c.getContext("2d");
    g.fillStyle = "rgba(34,32,28,0.88)"; g.fillRect(2, 8, 508, 96);
    g.fillStyle = "#FFFFFF"; g.textAlign = "center"; g.textBaseline = "middle";
    let fs = 46; do { g.font = `600 ${fs}px IBM Plex Mono, monospace`; } while (g.measureText(text).width > 480 && --fs > 16);
    g.fillText(text, 256, 58);
    const sp = new T.Sprite(new T.SpriteMaterial({ map: new T.CanvasTexture(c), depthTest: false }));
    sp.scale.set(230, 50, 1); sp.position.set(x, y, z); sp.renderOrder = 10; scene.add(sp); segLabels.push(sp);
    const tick = new T.Mesh(new T.CylinderGeometry(1.2, 1.2, y - 25, 6), new T.MeshBasicMaterial({ color: 0x22201C }));
    tick.position.set(x, (y - 25) / 2, z); scene.add(tick); segLabels.push(tick);
  }
  sides.forEach(sd => {
    const segs = segments(sd);
    sd._segs = segs;
    segs.forEach((sg, n) => {
      const mid = (sg.from + sg.to) / 2, pos = world(sd, mid, 160);
      segLabel(`${sg.lab} ${fmt((sg.to - sg.from) / 100, 2)} m`, pos[0], pos[1], n % 2 ? 300 : 230);
    });
  });
  document.getElementById("v3seg").addEventListener("click", e => {
    const on = !segLabels[0].visible;
    segLabels.forEach(o => o.visible = on);
    e.currentTarget.textContent = on ? "Ukryj długości odcinków" : "Pokaż długości odcinków";
  });

  const cards = {};
  sides.forEach(sd => {
    const off = sd.offset || 0;
    const rows = sd._segs.map(sg => `<tr${sg.gate ? ' class="gate"' : ""}><td>${sg.lab}</td><td>${fmt((sg.to - sg.from) / 100, 2)} m</td><td>${fmt((sg.from + off) / 100, 2)}–${fmt((sg.to + off) / 100, 2)}</td><td>${sg.detail}</td></tr>`).join("");
    sd.spans.forEach(sp => {
      nSpans++;
      if (sp.gate) { nGates++; return; }
      const n = stats(sp.layers).n; nBoards += n;
      if (sp.width) { nShort++; nShortBoards += n; }
    });
    /* słupki betonowe zakończeniowe przy otworach (brama, furtki, kosze, paczkoport) */
    for (let j = 1; j < sd.spans.length; j++) if (sd.spans[j - 1].gate || sd.spans[j].gate) nGatePosts++;
    if (sd.gateEnd) nGatePosts++;
    sd.spans.forEach(sp => { if (sp.items) nSteel += sp.items.filter(it => it.steel).length; });
    nTri += sd.spans.filter(sp => sp.slope).length;
    const gc = (cards[sd.group] = cards[sd.group] || { name: sd.name, key: sd.group, rows: "", len: 0, n: 0 });
    gc.rows += rows; gc.len += sd.spans.reduce((a, sp) => a + axisOf(sp), 0); gc.n += sd.spans.length;
  });
  Object.values(cards).forEach(gc => {
    const from = { front: "od prawego narożnika", back: "od lewego końca", right: "od przedniego narożnika" }[gc.key];
    const d = document.createElement("div");
    d.className = "card segcard";
    d.innerHTML = `<h3 style="font-family:var(--f-display);font-size:1rem;margin:0">${gc.name} <span class="pattern">${fmt(gc.len / 100, 2)} m · ${gc.n} przęseł · ${from}</span></h3>
      <div class="segwrap"><table class="seg"><thead><tr><th>Odcinek</th><th>Długość</th><th>Od–do (m)</th><th>Przęsła w osiach</th></tr></thead><tbody>${gc.rows}</tbody></table></div>`;
    sum.appendChild(d);
  });
  const shortTxt = sides.flatMap(sd => sd.spans.filter(sp => sp.width && !sp.gate).map(sp => sp.width)).reduce((m, w) => (m[w] = (m[w] || 0) + 1, m), {});
  const totalLen = sides.reduce((a, sd) => a + sd.spans.reduce((b, sp) => b + axisOf(sp), 0), 0), linePosts = nSpans + 1, nB = nBoards + BAY_BOARDS;
  sum.appendChild(cutCard("Całe ogrodzenie", `${fmt(totalLen / 100, 0)} m · lewy bok bez płotu`,
    `${nSpans - nGates} przęseł z desek, brama, 2 furtki, paczkoport i otwarcie na kosze z linką · słupki w linii płotu: ${linePosts} (2 narożne (typ L), 2 zakończeniowe na końcach (typ C), ${nGatePosts} zakończeniowe przy otworach (typ C), ${linePosts - 4 - nGatePosts} przelotowe (typ H)) + ${nSteel} stalowe 10 × 10 bramy i furtek + ${BAY_POSTS} przy koszach · deski: ${nBoards} w przęsłach + ${BAY_BOARDS} na ściankę przy koszach = ${nB} szt.`));
  sum.appendChild(cutCard("Deski do skrócenia", "", `${nShortBoards} szt. w ${nShort} przęsłach: ` + Object.entries(shortTxt).sort((a, b) => b[0] - a[0]).map(([w, c]) => `${c} × przęsło z deskami ${fmt(+w, 0)} cm`).join(", ") + ` · w tym ${nTri} deski cięte po przekątnej (skosy) · osobno ${BAY_BOARDS} desek ścianki przy koszach: 8 × 140 cm i 4 × 88 cm (z 2 desek)`));

  document.getElementById("v3notes").innerHTML = `
    <li>Działka 6/1: kąty i proporcje z podkładu geoportalu, skala z prawego boku 37,00 m. Front 22,42 m, prawy bok 37,00 m, tył 22,43 m, lewy bok 35,50 m. Kąty: prawy przedni 86,0°, prawy tylny 90,1°, lewy tylny 89,8°, lewy przedni 94,1°. Powierzchnia ok. 812 m². Budynek i studnia wodomierzowa stoją według mapy zasadniczej, liczone od prawego przedniego narożnika i prawej granicy.</li>
    <li>Budynek: obrys z mapy w skali, bryła wg projektu Archon „Dom w świetliku (G2N)”: dach dwuspadowy 42°, kalenica prostopadle do frontu, wysokość 9,18 m. Garaż wysunięty w prawo i do przodu oraz podcień przy wejściu pod niskim dachem kopertowym (okap 3,0 m, spadek 25° przyjęty z elewacji). Bez okien, kominów, balkonu i lukarny.</li>
    <li>Lewy bok (patrząc od frontu) bez ogrodzenia. Front i tył kończą się po lewej słupkami zakończeniowymi.</li>
    <li>Front od prawego narożnika: 5,20 m płotu A (3 równe przęsła po 173,3 cm w osiach, deski 169,3 cm) do słupka betonowego, otwór: słupek stalowy, brama 5 m w świetle, 2 słupki stalowe, furtka 1 m w świetle, słupek stalowy, paczkoport (1 cm od słupka stalowego), słupek betonowy; razem 7,06 m w osiach słupków betonowych (słupki stalowe 10 × 10 cm, 1 cm od betonowych); dalej A do lewego końca. Brama skrzydłowa łamana (2 skrzydła po 2,5 m, każde z 2 paneli po 1,25 m), otwierana do działki. Prawe skrzydło otwiera się na 180° i składa płasko przy płocie A (ok. 4,1–5,4 m od prawego narożnika, ok. 20 cm w głąb), lewe na 90° (ok. 1,3 m w głąb).</li>
    <li>Prawy bok od przedniego narożnika: otwarcie na kosze 303 (291 w świetle) z linką, furtka 1 m w świetle na własnych słupkach stalowych (1,34 m w osiach betonowych), 2 × B 169,5, skos od 7,76 m, od 9,47 m (7 cm za frontem garażu) 5 × C, skos, furtka 1 m (1,34 m w osiach betonowych), dalej 7 × B 204 do tylnego narożnika. Tył w całości B.</li>
    <li>Kosze K5: 5 kubłów w jednym rzędzie wzdłuż prawego płotu od przedniego narożnika (280 × 81 cm), uchwytami do drogi. W linii płotu otwarcie 303 cm w osiach zamknięte linką na wys. ok. 70 cm. Od działki ścianka 110 cm (B bez górnej deski) 92 cm od płotu i powrót do płotu przy słupku 3,03 m, bez furtki. Studnia wolna, 41 cm za ścianką.</li>
    <li>Paczkoport L-2W (antracyt RAL 7016, szer. 50, wys. 150, gł. 45 cm) w linii frontu zaraz za furtką, po lewej patrząc z ulicy, 1 cm od jej słupka stalowego, bez słupka betonowego pomiędzy; za nim słupek betonowy i płot. Lico od ulicy równo z licem ogrodzenia, skrzynka cofnięta 45 cm w działkę; wrzut od ulicy, odbiór od działki, na końcu kostki.</li>
    <li>Kostka na podjeździe wg szkicu na mapie: czworokąt od prawego przedniego narożnika garażu do frontu na 4,90 m od prawego narożnika, wzdłuż frontu do 12,05 m (brama w świetle 5,37–10,37 m, furtka 10,58–11,58 m, paczkoport 11,69–12,19 m) i do lewego przedniego narożnika podcienia. Szkic przeniesiony z mapy z dokładnością ok. ±15 cm.</li>
    <li>Na podjeździe 2 auta o wymiarach Toyoty RAV4 (460 × 186 cm, wys. 169 cm), uproszczone bryły.</li>
    <li>Trzecie auto (też 460 × 186) w pasie 3,02 m między garażem a prawym płotem, przodem do ulicy: 75 cm od płotu po stronie kierowcy, 41 cm od ściany garażu. Ruch z jezdni i na jezdnię (jezdnia 5 m, 4 m od płotu, zjazd przyjęty szeroki jak światło bramy, 5 m, bez poszerzeń): auto przejeżdża jezdnią za zjazd, cofa do bramy i dalej tyłem w pas; wyjeżdża przodem i skręca na jezdnię. Ciemne auto (bliżej prawej) musi wcześniej wyjechać, białe stoi. Przyjazd z prawej / odjazd w lewo (bliższy pas): najmniejsze odstępy karoserii 41 cm garaż (na miejscu) i białe auto, 46 cm słupki stalowe bramy i krawędzie zjazdu, 66 cm skrzydła bramy, 67 cm prawy płot, 1,22 m przeciwna krawędź jezdni, 1,34 m ścianka koszy. Przyjazd z lewej / odjazd w prawo (cofanie przez przeciwny pas): 41 cm garaż, 45 cm przeciwna krawędź jezdni, 47 cm białe auto, 50 cm skrzydła bramy, 55 cm słupki stalowe bramy i krawędzie zjazdu. Zewnętrzne koło na łukach 6,1–6,6 m. Przyciski „3. auto: …” pokazują tor z legendą w rogu widoku (pomarańczowa przerywana: środek tylnej osi, niebieskie: przednie narożniki, zielone: tylne narożniki, fioletowe: boki przy tylnej osi) i przejazd z prędkością 1,5 m/s; ciemne auto jest wtedy ukryte, brama otwiera się sama.</li>
    <li>Kliknięcie bramy lub furtki w widoku 3D otwiera ją albo zamyka (furtki o 90°, zawsze do działki; frontowa w lewo patrząc z ulicy).</li>
    <li>Brama i wszystkie furtki: rama stalowa antracyt, wypełnienie deskami w kolorze ogrodzenia (złoty dąb) w rytmie A.</li>
    <li>Słupki przy bramie i furtkach (ciemne) muszą przenieść ciężar skrzydeł, więc warto przewidzieć stalowe na osobnym fundamencie.</li>
    <li>Długości odcinków liczone między osiami słupków. Granice działki z mapy traktuję jako osie słupków. Model uproszczony: słupki 12 × 12 cm bez rowków i daszków.</li>`;
})();
