// 栃尾フレーム overlay 生成（寺泊 make_teradomari_overlay.js と同一方式）。
// 窓（中央の空クリーム）を透過し、下部シルエット帯は上端フェード→下端不透過の半透明ブレンド。
// 実測: 窓 left=208 / right=953 / top≈76、下部シーン上端≈1300-1390。
const sharp = require("sharp");
const RAW = "C:/Users/masat/Desktop/nagaoka-walk/tools/card_frame/frame_tochio_raw.png";
const OUT_OVL = "C:/Users/masat/Desktop/nagaoka-walk/tools/card_frame/frame_tochio_overlay.png";
const GCREAM = 210;  // 栃尾の窓クリームは緑ch 224-228でばらつく→閾値を緩める
const WIN_YMAX = 1220;      // flood-fill the empty window down to here (just above the scenery footer)
const FOOT_X0 = 208, FOOT_X1 = 951;   // silhouette interior x-range (inside side borders)
const GRAD_TOP = 1200, GRAD_FULL = 1440; // alpha ramps 0 (top, blends w/ art) -> MAXA (solid)
const BORDER_Y = 1505;     // keep the bottom outer border (below this) fully opaque
const MAXA = 255;          // silhouette はっきり: 下端=不透過。上端だけフェード

function isWin(data,i){ return data[i+1]>=GCREAM && data[i]>=238 && data[i+2]<=212; }

(async()=>{
  const {data,info} = await sharp(RAW).resize(1024,1536,{fit:"fill"}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const {width:w,height:h,channels:c} = info;
  const out = Buffer.from(data);
  // 1) flood-fill empty window (cream) from seeds inside the window, capped above the scenery
  const filled = new Uint8Array(w*h); const stack = [];
  for(const [sx,sy] of [[512,200],[512,600],[512,1000],[300,700],[720,700],[512,1250]]){
    const p=sy*w+sx; if(!filled[p] && isWin(data,p*c)){ filled[p]=1; stack.push(p); }
  }
  while(stack.length){
    const p=stack.pop(); const x=p%w, y=(p/w)|0; out[p*c+3]=0;
    for(const [nx,ny] of [[x-1,y],[x+1,y],[x,y-1],[x,y+1]]){
      if(nx<0||ny<0||nx>=w||ny>=h||ny>=WIN_YMAX) continue;
      const q=ny*w+nx; if(filled[q]) continue;
      if(isWin(data,q*c)){ filled[q]=1; stack.push(q); }
    }
  }
  // 2) semi-transparent gradient footer (blend scenery into the art)
  for(let y=GRAD_TOP;y<h;y++){
    let ga;
    if(y>=BORDER_Y) ga = 255;
    else { const f = Math.min(1,(y-GRAD_TOP)/(GRAD_FULL-GRAD_TOP)); ga = Math.round(f*MAXA); }
    for(let x=FOOT_X0;x<=FOOT_X1;x++){
      const i=(y*w+x)*c;
      if(out[i+3]===0) continue;
      if(out[i+3]>ga) out[i+3]=ga;
    }
  }
  await sharp(out,{raw:{width:w,height:h,channels:c}}).png().toFile(OUT_OVL);
  let t0=0; for(let i=0;i<w*h;i++){ if(out[i*c+3]===0) t0++; }
  console.log("yoita overlay written. fully-transparent px="+t0+" (window). footer gradient 0->"+MAXA+".");
})().catch(e=>{console.error(e);process.exit(1);});
