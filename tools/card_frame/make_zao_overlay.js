// 蔵王フレーム overlay 生成（クリーンなくり抜き方式）。
// ★方針: 前の「上端フェード（半透明）」だと最も背の高い水道タンクの傘が薄く消えるため、
//   フェードを撤廃。空クリームだけを透過し、シルエットのインク（水道タンク・大けやき・花手水・川・鳥居）は
//   すべて不透明のまま残す＝下部シルエットがくっきり出る。
// 実測: 窓 left≈211 / right≈956 / 窓クリーム rgb≈(247,212,155)。
//   水道タンク傘の頂点≈1019、大けやき頂≈1137。下端の内枠は不透明維持。
const sharp = require("sharp");
const RAW = "C:/Users/masat/Desktop/nagaoka-walk/tools/card_frame/frame_zao_raw.png";
const OUT_OVL = "C:/Users/masat/Desktop/nagaoka-walk/tools/card_frame/frame_zao_overlay.png";
const FLOOD_YMAX = 1495;   // これ以上下（＝下端の内枠）へは flood を進めない
const TOP_GUARD  = 40;     // これより上（＝上枠）へは flood を進めない

// 窓の“空クリーム”判定。cream≈(247,212,155)。インク(深緑)は弾く。
function isWin(data,i){ return data[i]>=234 && data[i+1]>=198 && data[i+2]<=212; }

(async()=>{
  const {data,info} = await sharp(RAW).resize(1024,1536,{fit:"fill"}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const {width:w,height:h,channels:c} = info;
  const out = Buffer.from(data);
  const filled = new Uint8Array(w*h); const stack = [];
  // 窓〜下部シーンの空にまたがるように種を多数まく（連結した空クリームを一気に抜く）
  const seeds = [
    [512,200],[512,500],[512,800],[300,600],[720,600],   // 中央の大きな空
    [512,1000],[380,1050],[650,1050],                     // タンク傘/けやき頂まわりの空
    [512,1150],[300,1200],[720,1200],[600,1300]           // シーン内の空ポケット
  ];
  for(const [sx,sy] of seeds){ const p=sy*w+sx; if(!filled[p] && isWin(data,p*c)){ filled[p]=1; stack.push(p); } }
  while(stack.length){
    const p=stack.pop(); out[p*c+3]=0; const x=p%w, y=(p/w)|0;
    for(const [nx,ny] of [[x-1,y],[x+1,y],[x,y-1],[x,y+1]]){
      if(nx<0||nx>=w||ny<TOP_GUARD||ny>=FLOOD_YMAX) continue;
      const q=ny*w+nx; if(filled[q]) continue;
      if(isWin(data,q*c)){ filled[q]=1; stack.push(q); }
    }
  }
  await sharp(out,{raw:{width:w,height:h,channels:c}}).png().toFile(OUT_OVL);
  let t0=0; for(let i=0;i<w*h;i++){ if(out[i*c+3]===0) t0++; }
  console.log("zao overlay (crisp knockout) written. transparent px="+t0+".");
})().catch(e=>{console.error(e);process.exit(1);});
