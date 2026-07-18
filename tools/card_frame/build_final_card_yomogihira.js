// よもぎ平エリア用カード生成器（枠なしアート＋よもぎ平フレーム＋自動フィット縦ロゴ型押し）
// 寺泊/山古志/栃尾/越路版と同一構造。フレームだけ frame_yomogihira_overlay.png に差し替え。
// 窓は x211-949（左端は他エリアと同じ＝ロゴ帯幅一致）、下部シルエット(温泉街+杉木立+鳥居+渓流)は上端フェード。
// usage: node build_final_card_yomogihira.js "<artFileUrl>" "KORYU JINJA" "<outHtml>" [offsetY]
// offsetY: アートを上へずらすpx（下部シルエットに主役が隠れる時に使う。window下端≈1200px）。
const fs = require('fs');
const [,, ART, NAME, OUT, OFFY] = process.argv;
const offY = parseInt(OFFY || '0', 10) || 0;
const FRAME = 'file:///C:/Users/masat/Desktop/nagaoka-walk/tools/card_frame/frame_yomogihira_overlay.png';

const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box;}
html,body{width:1024px;height:1536px;}
.card{position:relative;width:1024px;height:1536px;overflow:hidden;background:#e7d3a4;}
.art{position:absolute;left:184px;top:${-offY}px;width:800px;height:1536px;object-fit:cover;object-position:center;}
.frame{position:absolute;inset:0;width:1024px;height:1536px;}
svg{position:absolute;inset:0;}
text{font-family:"Arial Black","Franklin Gothic Heavy","Impact",sans-serif;font-weight:900;fill:#1b3a2c;}
</style></head>
<body>
<div class="card">
  <img class="art" src="${ART}">
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
    <text x="0" y="0" text-anchor="middle" dominant-baseline="central"
          font-size="158" textLength="1040" lengthAdjust="spacingAndGlyphs"
          transform="translate(122,765) rotate(-90)" filter="url(#grunge)">${NAME}</text>
  </svg>
</div>
</body></html>`;
fs.writeFileSync(OUT, html);
console.log('wrote', OUT);
