// v2 overlay: window fully transparent above the silhouette, then the bottom silhouette footer
// is rendered as a SEMI-TRANSPARENT gradient (0% -> ~50%) so the illustration behind shows through
// and the silhouette "同化"s with the art (per masa: 50%透過で同化).
const sharp = require("sharp");
const RAW = "C:/Users/masat/Desktop/nagaoka-walk/tools/card_frame/frame_teradomari_raw.png"; // v4 misty frame (already saved)
const OUT_OVL = "C:/Users/masat/Desktop/nagaoka-walk/tools/card_frame/frame_teradomari_overlay.png";
const GCREAM = 226;
const WIN_YMAX = 1180;     // flood-fill the empty window down to here (above the silhouette)
const FOOT_X0 = 208, FOOT_X1 = 951;   // silhouette interior x-range (inside side borders)
const GRAD_TOP = 1180, GRAD_FULL = 1360; // alpha ramps 0 (top, blends w/ art) -> MAXA (solid) by GRAD_FULL
const BORDER_Y = 1505;     // keep the bottom outer border (below this) fully opaque
const MAXA = 255;          // silhouette はっきり: reach 100% opacity (下端=透過0%). Only the top edge fades in.

function isBG(r,g,b){ return r>=244 && g>=244 && b>=236; } // (unused legacy)
function isWin(data,i){ return data[i+1]>=GCREAM && data[i]>=232 && data[i+2]<=225; }

(async()=>{
  const {data,info} = await sharp(RAW).resize(1024,1536,{fit:"fill"}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const {width:w,height:h,channels:c} = info;
  const out = Buffer.from(data);
  // 1) flood-fill empty window (cream) from center, capped above the silhouette
  const filled = new Uint8Array(w*h); const stack = [];
  for(const [sx,sy] of [[512,200],[512,600],[512,1000],[300,700],[720,700],[512,1120]]){
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
  // 2) semi-transparent gradient footer (blend silhouette into the art)
  for(let y=GRAD_TOP;y<h;y++){
    let ga;
    if(y>=BORDER_Y) ga = 255;                        // keep bottom border solid
    else {
      const f = Math.min(1,(y-GRAD_TOP)/(GRAD_FULL-GRAD_TOP));
      ga = Math.round(f*MAXA);
    }
    for(let x=FOOT_X0;x<=FOOT_X1;x++){
      const i=(y*w+x)*c;
      if(out[i+3]===0) continue;                      // already transparent window – leave it
      if(out[i+3]>ga) out[i+3]=ga;                    // cap footer alpha to the gradient
    }
  }
  await sharp(out,{raw:{width:w,height:h,channels:c}}).png().toFile(OUT_OVL);
  // report
  let t0=0; for(let i=0;i<w*h;i++){ if(out[i*c+3]===0) t0++; }
  console.log("overlay v2 written. fully-transparent px="+t0+" (window). footer is gradient 0->"+MAXA+" alpha.");
})().catch(e=>{console.error(e);process.exit(1);});
