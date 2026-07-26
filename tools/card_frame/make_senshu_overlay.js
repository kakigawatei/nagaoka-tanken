// 千秋フレーム overlay 生成（クリーンなくり抜き方式・三島と同一方針）。
// 空クリームだけを透過し、下部シルエット（丘陵の稜線＋バラ/チューリップの花畑＋竪穴住居）と
// 四隅飾り（火焔土器/ハート形土偶/バラ園/竪穴住居）・縁の縄目模様のインクはすべて不透明のまま残す。
// 実測: 窓 left≈215 / right≈954 / 窓クリーム rgb≈(241,213,151)。下部シルエット上端≈1300〜1337。
const sharp = require("sharp");
const RAW = "C:/Users/masat/Desktop/nagaoka-walk/tools/card_frame/frame_senshu_raw.png";
const OUT_OVL = "C:/Users/masat/Desktop/nagaoka-walk/tools/card_frame/frame_senshu_overlay.png";
const FLOOD_YMAX = 1495;   // これ以上下（＝下端の内枠）へは flood を進めない
const TOP_GUARD  = 40;     // これより上（＝上枠）へは flood を進めない

// 窓の“空クリーム”判定。cream≈(241,213,151)。インク(深緑)は弾く。
function isWin(data,i){ return data[i]>=234 && data[i+1]>=198 && data[i+2]<=212; }

(async()=>{
  const {data,info} = await sharp(RAW).resize(1024,1536,{fit:"fill"}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const {width:w,height:h,channels:c} = info;
  const out = Buffer.from(data);
  const filled = new Uint8Array(w*h); const stack = [];
  // 中央の大きな空＋下部シルエット上の空ポケット（丘の上の空）にまたがるように種を多数まく
  const seeds = [
    [512,200],[512,500],[512,800],[300,600],[720,600],   // 中央の大きな空
    [512,1000],[380,1120],[650,1120],                     // 下部へ向かう空
    [512,1220],[400,1260],[650,1260],[512,1285]           // 丘陵の上の空ポケット
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
  console.log("senshu overlay (crisp knockout) written. transparent px="+t0+".");
})().catch(e=>{console.error(e);process.exit(1);});
