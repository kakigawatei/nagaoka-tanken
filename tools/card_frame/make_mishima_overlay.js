// 三島フレーム overlay 生成（クリーンなくり抜き方式・蔵王と同一方針）。
// 空クリームだけを透過し、下部シルエット（里の街道＝酒蔵/そうめん屋/寺社の甍＋竹灯籠＋里山）と
// 四隅飾り・縁の竹模様のインクはすべて不透明のまま残す＝シルエットがくっきり出る。
// 実測: 窓 left≈215 / right≈956 / 窓クリーム rgb≈(243,217,155)。下部シルエット上端≈1290〜1347。
const sharp = require("sharp");
const RAW = "C:/Users/masat/Desktop/nagaoka-walk/tools/card_frame/frame_mishima_raw.png";
const OUT_OVL = "C:/Users/masat/Desktop/nagaoka-walk/tools/card_frame/frame_mishima_overlay.png";
const FLOOD_YMAX = 1495;   // これ以上下（＝下端の内枠）へは flood を進めない
const TOP_GUARD  = 40;     // これより上（＝上枠）へは flood を進めない

// 窓の“空クリーム”判定。cream≈(243,217,155)。インク(深緑)は弾く。
function isWin(data,i){ return data[i]>=234 && data[i+1]>=198 && data[i+2]<=212; }

(async()=>{
  const {data,info} = await sharp(RAW).resize(1024,1536,{fit:"fill"}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const {width:w,height:h,channels:c} = info;
  const out = Buffer.from(data);
  const filled = new Uint8Array(w*h); const stack = [];
  // 中央の大きな空＋下部シルエット上の空ポケットにまたがるように種を多数まく
  const seeds = [
    [512,200],[512,500],[512,800],[300,600],[720,600],   // 中央の大きな空
    [512,1000],[380,1100],[650,1100],                     // 下部へ向かう空
    [512,1200],[300,1250],[720,1250],[600,1280]           // 里山/街道上の空ポケット
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
  console.log("mishima overlay (crisp knockout) written. transparent px="+t0+".");
})().catch(e=>{console.error(e);process.exit(1);});
