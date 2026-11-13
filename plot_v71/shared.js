const BH = 25, BL = 200, PW = 12, INS = 4, POST_EXTRA = 5, PRICE = 119, WEIGHT = 44;
const WOOD = { board: "#C48545", edge: "#7A4A1E", grain: "#9A6230", post: "#A8692F", postEdge: "#6B3F18", ground: "#7A6A55" };

const VARIANTS = [
  { k: "B", name: "3 pełne + 2 z przerwą 10 cm", layers: ["D","D","D",10,"D",10,"D"] },
  { k: "D", name: "4 pełne + 1 z przerwą 10 cm", layers: ["D","D","D","D",10,"D"] },
  { k: "E", name: "3 pełne + 3 z przerwą 10 cm", layers: ["D","D","D",10,"D",10,"D",10,"D"] },
  { k: "F", name: "5 desek pełnych", layers: ["D","D","D","D","D"] },
  { k: "A", name: "5 desek, prześwity po 5 cm", layers: ["D",5,"D",5,"D",5,"D",5,"D"] },
  { k: "C", name: "7 desek pełnych", layers: ["D","D","D","D","D","D","D"] },
];

function stats(layers) {
  const n = layers.filter(l => l === "D").length;
  const gaps = layers.filter(l => l !== "D");
  const total = n * BH + gaps.reduce((a, b) => a + b, 0);
  return { n, gaps, total };
}
function boards(layers) {
  const out = []; let y = 0;
  for (const l of layers) { if (l === "D") { out.push([y, y + BH]); y += BH; } else y += l; }
  return out;
}
const fmt = (x, d = 0) => x.toLocaleString("pl-PL", { minimumFractionDigits: d, maximumFractionDigits: d });
const zl = x => fmt(x) + " zł";

function rng(seed) { let s = seed * 9301 + 49297; return () => ((s = (s * 9301 + 49297) % 233280) / 233280); }

function cutCard(title, sub, body) {
  const d = document.createElement("div");
  d.className = "card";
  d.innerHTML = `<h3 style="font-family:var(--f-display);font-size:1rem;margin:0">${title} <span class="pattern">${sub || ""}</span></h3><p>${body}</p>`;
  return d;
}
