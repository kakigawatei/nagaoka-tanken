// 確定版カード生成器（枠なしアート＋透過フレーム＋自動フィット縦ロゴ型押し）
// usage: node build_final_card.js "<artFileUrl>" "AORE NAGAOKA" "<outHtml>"
// 出力HTMLを headless Edge で 1024x1536 レンダリング → sharp で 768x1152 化して assets へ。
const fs = require('fs');
const [,, ART, NAME, OUT] = process.argv;
const FRAME = 'file:///C:/Users/masat/Desktop/nagaoka-walk/tools/card_frame/frame_overlay_v2.png';
const HALO  = 'file:///C:/Users/masat/Desktop/nagaoka-walk/tools/card_frame/silhouette_halo.png'; // make_halo.js が生成

const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box;}
html,body{width:1024px;height:1536px;}
.card{position:relative;width:1024px;height:1536px;overflow:hidden;background:#e7d3a4;}
/* 枠なしアートをフルハイトで塗り足し（窓＋橋の裏まで完全被覆＝白抜けゼロ）。主役は中央やや右想定で左に余白 */
.art{position:absolute;left:184px;top:0;width:800px;height:1536px;object-fit:cover;object-position:center;}
/* 下部：シルエット形のクリーム・ハロー（make_halo.js生成）をアートの上・フレームの下に敷く。
   建物の高さに合わせてデコボコのスカイラインにイラストが溶け込み（直線の境界なし）、
   暗い夜アートでも緑のシルエットがクリームの縁取り＋モヤモヤの上でくっきり読める。 */
.halo{position:absolute;inset:0;width:1024px;height:1536px;}
.frame{position:absolute;inset:0;width:1024px;height:1536px;}
svg{position:absolute;inset:0;}
text{font-family:"Arial Black","Franklin Gothic Heavy","Impact",sans-serif;font-weight:900;fill:#1b3a2c;}
</style></head>
<body>
<div class="card">
  <img class="art" src="${ART}">
  <img class="halo" src="${HALO}">
  <img class="frame" src="${FRAME}">
  <svg width="1024" height="1536" viewBox="0 0 1024 1536">
    <defs>
      <filter id="grunge" x="-15%" y="-15%" width="130%" height="130%">
        <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="4" seed="11" result="edge"/>
        <feDisplacementMap in="SourceGraphic" in2="edge" scale="4" xChannelSelector="R" yChannelSelector="G" result="disp"/>
        <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="2" seed="4" result="speck"/>
        <feColorMatrix in="speck" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 13 -7.2" result="speckA"/>
        <feComposite in="disp" in2="speckA" operator="out"/>
      </filter>
    </defs>
    <!-- 縦ロゴ：textLengthで枠いっぱいに自動伸縮 / rotate(-90)でアオーレと同じ向き(下から読む) / グランジ -->
    <text x="0" y="0" text-anchor="middle" dominant-baseline="central"
          font-size="158" textLength="1040" lengthAdjust="spacingAndGlyphs"
          transform="translate(122,765) rotate(-90)" filter="url(#grunge)">${NAME}</text>
  </svg>
</div>
</body></html>`;
fs.writeFileSync(OUT, html);
console.log('wrote', OUT);
