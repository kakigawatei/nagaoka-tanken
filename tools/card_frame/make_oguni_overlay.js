// 小国フレーム overlay 生成（クリーンなくり抜き方式・出雲崎/三島と同一方針）。
// 空クリームだけを透過し、下部シルエット（渋海川＋棚田＋茅葺集落＋山の稜線）と
// 四隅飾り（簀桁+雪/兜と石垣/蓑笠と茄子/雲海の山）・縁の和柄（流水+雪輪）のインクはすべて不透明のまま残す。
// 実測: 窓 left≈233 / right≈932 / 窓クリーム rgb≈(245,218,159)。下部シルエット上端≈1272〜1294。
const sharp = require("sharp");
const RAW = "C:/Users/masat/Desktop/nagaoka-walk/tools/card_frame/frame_oguni_raw.png";
const OUT_OVL = "C:/Users/masat/Desktop/nagaoka-walk/tools/card_frame/frame_oguni_overlay.png";
const FLOOD_YMAX = 1272;   // これ以上下（＝下部の山里シルエット）へは flood を進めない（線画の隙間から漏らさない）
const TOP_GUARD  = 40;     // これより上（＝上枠）へは flood を進めない

// 窓の“空クリーム”判定。cream≈(245,218,159)。インク(深緑)は弾く。
function isWin(data,i){ return data[i]>=234 && data[i+1]>=198 && data[i+2]<=212; }

(async()=>{
  const {data,info} = await sharp(RAW).resize(1024,1536,{fit:"fill"}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const {width:w,height:h,channels:c} = info;
  const out = Buffer.from(data);
  const filled = new Uint8Array(w*h); const stack = [];
  // 中央の大きな空にまたがるように種を多数まく（すべて下部シルエット上端 y≈1272 より上）
  const seeds = [
    [560,200],[560,500],[560,800],[350,600],[760,600],   // 中央の大きな空
    [560,1000],[400,1130],[700,1130],[560,1220]           // 下方の空（山の稜線より上）
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
  console.log("oguni overlay (crisp knockout) written. transparent px="+t0+".");
})().catch(e=>{console.error(e);process.exit(1);});
