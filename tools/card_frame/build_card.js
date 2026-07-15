// Vintage travel-poster card frame template generator
// usage: node build_card.js "<artFileUrl>" "AORE NAGAOKA" "<outHtml>"
const fs = require('fs');
const [,, ART, NAME, OUT] = process.argv;

const INK = '#2c5a4a';      // deep teal-green ink
const INK2 = '#3c6b58';
const CREAM = '#e7d5a6';    // vintage paper
const GOLD = '#c99a3a';

// ---- firework burst SVG (corner ornament) ----
function firework(cx, cy, r, seedBig=true){
  let spokes = '';
  const N = 16;
  for(let i=0;i<N;i++){
    const a = (i/N)*Math.PI*2;
    const long = (i%2===0);
    const rr = long ? r : r*0.62;
    const x2 = cx+Math.cos(a)*rr, y2 = cy+Math.sin(a)*rr;
    const x1 = cx+Math.cos(a)*(r*0.16), y1 = cy+Math.sin(a)*(r*0.16);
    spokes += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"/>`;
    spokes += `<circle cx="${x2.toFixed(1)}" cy="${y2.toFixed(1)}" r="${long?2.1:1.5}" fill="${INK}" stroke="none"/>`;
  }
  // little core sparkle
  spokes += `<circle cx="${cx}" cy="${cy}" r="2.4" fill="${GOLD}" stroke="none"/>`;
  return `<g stroke="${INK}" stroke-width="1.5" stroke-linecap="round">${spokes}</g>`;
}

// ---- Nagaoka skyline silhouette (water tower + arch bridge + buildings) ----
function skyline(w, h){
  const base = h-2;                // ground line y
  let s = `<g fill="${INK}" stroke="none">`;
  // ground line
  s += `<rect x="0" y="${base}" width="${w}" height="2"/>`;

  // --- left: a couple of low buildings ---
  s += `<rect x="${w*0.05}" y="${base-26}" width="26" height="26"/>`;
  s += `<rect x="${w*0.05+30}" y="${base-38}" width="20" height="38"/>`;

  // --- water tower (水道タンク): columns + round tank + domed top ---
  const tx = w*0.20, ty = base;
  s += `<rect x="${tx-14}" y="${ty-30}" width="4" height="30"/>`;
  s += `<rect x="${tx+10}" y="${ty-30}" width="4" height="30"/>`;
  s += `<rect x="${tx-2}" y="${ty-30}" width="4" height="30"/>`;
  s += `<rect x="${tx-20}" y="${ty-46}" width="40" height="18" rx="3"/>`;      // tank body
  s += `<path d="M ${tx-20} ${ty-46} Q ${tx} ${ty-62} ${tx+20} ${ty-46} Z"/>`; // dome
  s += `<rect x="${tx-1.5}" y="${ty-70}" width="3" height="9"/>`;              // finial

  // --- aore-ish boxy modern building ---
  s += `<rect x="${w*0.30}" y="${base-42}" width="58" height="42"/>`;
  // simple truss roof hint
  s += `<path d="M ${w*0.30} ${base-42} L ${w*0.30+58} ${base-52} L ${w*0.30+58} ${base-42} Z"/>`;

  // --- arch bridge (大手大橋 / 長生橋: repeated truss humps over the river) ---
  const bx0 = w*0.50, bx1 = w*0.96, deck = base-14, hump = 20, spans = 7;
  const span = (bx1-bx0)/spans;
  let bridge = `<rect x="${bx0}" y="${deck}" width="${bx1-bx0}" height="3"/>`; // deck
  for(let i=0;i<spans;i++){
    const x = bx0 + i*span;
    bridge += `<path d="M ${x} ${deck} L ${x+span/2} ${deck-hump} L ${x+span} ${deck}" fill="none" stroke="${INK}" stroke-width="2.2"/>`;
    // vertical hangers
    bridge += `<line x1="${x+span/2}" y1="${deck-hump}" x2="${x+span/2}" y2="${deck}" stroke="${INK}" stroke-width="1.4"/>`;
  }
  // piers
  for(let i=0;i<=spans;i++){ const x=bx0+i*span; bridge += `<rect x="${x-1.5}" y="${deck}" width="3" height="14"/>`; }
  s += bridge;

  // --- a tree ---
  s += `<rect x="${w*0.44}" y="${base-20}" width="3" height="20"/>`;
  s += `<circle cx="${w*0.44+1.5}" cy="${base-24}" r="10"/>`;

  s += `</g>`;
  return s;
}

const W=768, H=1152;
const P=22;                 // outer cream margin to first rule
const inRule=P+10;          // inner rule inset
const contentPad=inRule+16;
const logoW=118;            // left column for vertical logo
const skyH=104;             // bottom skyline band height
const artX=contentPad+logoW+6;
const artY=contentPad+4;
const artW=W-contentPad-artX+ (0); // to right inner edge
const artRight=W-contentPad;
const artBottom=H-contentPad-skyH-6;

const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box;}
html,body{width:${W}px;height:${H}px;}
.card{position:relative;width:${W}px;height:${H}px;background:${CREAM};
  font-family:"Arial Black","Franklin Gothic Heavy","Impact",sans-serif; overflow:hidden;}
/* double rule frame */
.frame{position:absolute;inset:${P}px;border:2.5px solid ${INK};border-radius:6px;}
.frame2{position:absolute;inset:${inRule}px;border:1px solid ${INK2};border-radius:4px;}
/* art panel */
.artwrap{position:absolute;left:${artX}px;top:${artY}px;right:${W-artRight}px;
  height:${artBottom-artY}px;overflow:hidden;border:2px solid ${INK};border-radius:3px;background:#111;}
.artwrap img{position:absolute;left:-4%;top:-3%;width:108%;height:106%;object-fit:cover;}
/* vertical logo */
.logo{position:absolute;left:${contentPad}px;top:${artY}px;width:${logoW}px;height:${artBottom-artY}px;
  display:flex;align-items:center;justify-content:center;}
.logo span{writing-mode:vertical-rl; transform:rotate(180deg);
  color:${INK};font-size:${NAME.length>14?58:72}px;line-height:.98;letter-spacing:2px;
  white-space:nowrap;text-transform:uppercase;font-weight:900;}
/* skyline */
.sky{position:absolute;left:${contentPad}px;right:${contentPad}px;bottom:${contentPad+6}px;height:${skyH}px;}
.fw{position:absolute;}
</style></head><body>
<div class="card">
  <div class="frame"></div>
  <div class="frame2"></div>

  <div class="artwrap"><img src="${ART}"></div>

  <div class="logo"><span>${NAME}</span></div>

  <svg class="fw" style="left:${P+6}px;top:${P+6}px;" width="86" height="86" viewBox="0 0 100 100">${firework(50,50,40)}</svg>
  <svg class="fw" style="right:${P+6}px;top:${P+6}px;" width="70" height="70" viewBox="0 0 100 100">${firework(50,50,38)}</svg>

  <svg class="sky" viewBox="0 0 ${W-2*contentPad} ${skyH}" preserveAspectRatio="xMidYMax meet">${skyline(W-2*contentPad, skyH)}</svg>
</div>
</body></html>`;

fs.writeFileSync(OUT, html);
console.log('wrote', OUT);
